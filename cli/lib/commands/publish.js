import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
import FormData from 'form-data';
import archiver from 'archiver';
import { loadCredentials } from '../auth.js';
import { createClient } from '../api.js';

/**
 * 从 SKILL.md 提取 name 和 description
 * - name: 取第一个 # 标题
 * - description: 取标题后的第一段非空文本（前 200 字符）
 */
function parseSkillMd(content) {
  const lines = content.split('\n');
  let name = null;
  let description = null;
  let foundTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // 匹配 # 标题
    if (!foundTitle && trimmed.startsWith('# ')) {
      name = trimmed.slice(2).trim();
      foundTitle = true;
      continue;
    }
    
    // 找标题后的第一段非空文本
    if (foundTitle && trimmed && !trimmed.startsWith('#')) {
      description = trimmed.slice(0, 200);
      break;
    }
  }

  return { name, description };
}

/**
 * 将文件夹打包为 zip
 */
function zipDirectory(dirPath, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(dirPath, false);
    archive.finalize();
  });
}

export default async function publish(directory, options) {
  // 1. 验证凭证
  const credentials = loadCredentials();
  if (!credentials?.token) {
    console.log(chalk.red('❌ 请先登录：skb login'));
    process.exit(1);
  }

  // 2. 验证目录存在
  const resolvedDir = path.resolve(directory);
  if (!fs.existsSync(resolvedDir)) {
    console.log(chalk.red(`❌ 目录不存在：${resolvedDir}`));
    process.exit(1);
  }

  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    console.log(chalk.red(`❌ 路径不是目录：${resolvedDir}`));
    process.exit(1);
  }

  // 3. 验证 SKILL.md 存在
  const skillMdPath = path.join(resolvedDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.log(chalk.red(`❌ 目录内缺少 SKILL.md 文件：${skillMdPath}`));
    process.exit(1);
  }

  // 4. 从文件夹名提取 skill_id
  const skillId = path.basename(resolvedDir);

  // 5. 从 SKILL.md 提取 name 和 description
  const skillMdContent = fs.readFileSync(skillMdPath, 'utf-8');
  const parsed = parseSkillMd(skillMdContent);

  const name = options.name || parsed.name || skillId;
  const description = options.description || parsed.description || '';
  const changelog = options.changelog;

  console.log(chalk.cyan(`📦 准备发布 Skill: ${skillId}`));
  console.log(chalk.gray(`   名称: ${name}`));
  console.log(chalk.gray(`   描述: ${description || '(无)'}`));
  console.log(chalk.gray(`   更新说明: ${changelog}`));

  // 6. 打包为 zip
  const spinner = ora('正在打包...').start();
  const tmpZipPath = path.join(os.tmpdir(), `skb-${randomBytes(8).toString('hex')}.zip`);

  try {
    const size = await zipDirectory(resolvedDir, tmpZipPath);
    spinner.text = `打包完成 (${(size / 1024).toFixed(1)} KB)，正在上传...`;

    // 7. 上传
    const client = createClient();
    const formData = new FormData();
    formData.append('zip_file', fs.createReadStream(tmpZipPath));
    formData.append('skill_id', skillId);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('changelog', changelog);

    const result = await client.postForm('/skills/publish', formData);

    if (result.ok) {
      spinner.succeed(chalk.green(`发布成功！Skill: ${result.skill_id}, 版本: ${result.version}`));
    } else {
      spinner.fail(chalk.red('发布失败'));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red(`发布失败：${err.message}`));
    process.exit(1);
  } finally {
    // 8. 清理临时文件
    try {
      if (fs.existsSync(tmpZipPath)) {
        fs.unlinkSync(tmpZipPath);
      }
    } catch {
      // 忽略清理错误
    }
  }
}
