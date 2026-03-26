import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
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
 * @param {string} dirPath - 要打包的目录路径
 * @param {string} outputPath - 输出的 zip 文件路径
 * @param {string} dirName - zip 包内的目录名称（顶层文件夹）
 */
function zipDirectory(dirPath, outputPath, dirName) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);
    // 使用 dirName 作为 zip 包内的顶层文件夹名称
    archive.directory(dirPath, dirName);
    archive.finalize();
  });
}

export default async function publish(directory, options) {
  // 1. 验证凭证
  const credentials = loadCredentials();
  if (!credentials?.token) {
    console.log(chalk.red('❌ Please login first: skb login'));
    process.exit(1);
  }

  // 2. 验证目录存在（默认使用当前目录）
  const resolvedDir = path.resolve(directory || process.cwd());
  if (!fs.existsSync(resolvedDir)) {
    console.log(chalk.red(`❌ Directory not found: ${resolvedDir}`));
    process.exit(1);
  }

  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    console.log(chalk.red(`❌ Path is not a directory: ${resolvedDir}`));
    process.exit(1);
  }

  // 3. 验证 SKILL.md 存在
  const skillMdPath = path.join(resolvedDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.log(chalk.red(`❌ Missing SKILL.md in directory: ${skillMdPath}`));
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

  console.log(chalk.cyan(`📦 Preparing to publish Skill: ${skillId}`));
  console.log(chalk.gray(`   Name: ${name}`));
  console.log(chalk.gray(`   Description: ${description || '(none)'}`))
  console.log(chalk.gray(`   Changelog: ${changelog}`));

  // 6. 打包为 zip
  const spinner = ora('Packing...').start();
  const tmpZipPath = path.join(os.tmpdir(), `skb-${randomBytes(8).toString('hex')}.zip`);

  try {
    const size = await zipDirectory(resolvedDir, tmpZipPath, skillId);
    spinner.text = `Pack complete (${(size / 1024).toFixed(1)} KB), uploading...`;

    // 7. 上传
    const client = createClient();
    
    // 读取 zip 文件内容
    const zipBuffer = fs.readFileSync(tmpZipPath);
    const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });
    
    // 使用原生 FormData
    const formData = new FormData();
    formData.append('zip_file', zipBlob, 'skill.zip');
    formData.append('skill_id', skillId);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('changelog', changelog || '');

    const result = await client.postForm('/skills/publish', formData);

    if (result.ok) {
      spinner.succeed(chalk.green(`Published successfully! Skill: ${result.skill_id}, version: ${result.version}`));
    } else {
      spinner.fail(chalk.red('Publish failed'));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red(`Publish failed: ${err.message}`));
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
