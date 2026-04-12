import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
import archiver from 'archiver';
import { loadCredentials } from '../auth.js';
import { createClient } from '../api.js';
import { pickMessage } from '../i18n.js';
import { resolveSkillIdCore, parseSkillMd } from '../skill-md.js';

export function resolveSkillId(folderBasename, frontmatterName) {
  const r = resolveSkillIdCore(folderBasename, frontmatterName);
  if (r.ok) return r.id;
  if (r.reason === 'mismatch') {
    throw new Error(
      pickMessage({
        zh: `skill_id 不一致：文件夹名为 "${r.folder}"，frontmatter 的 name 为 "${r.fm}"，请统一为同一标识`,
        en: `skill_id mismatch: folder name is "${r.folder}" but frontmatter name is "${r.fm}"; use one identifier`
      })
    );
  }
  throw new Error(
    pickMessage({
      zh: `无效的 skill id：文件夹名 "${r.folder}" 与 frontmatter name "${r.fm || '(无)'}" 须至少其一符合 /^[\\w-]+$/（仅字母、数字、下划线与连字符）`,
      en: `Invalid skill id: folder name "${r.folder}" and frontmatter name "${r.fm || '(none)'}" — at least one must match /^[\\w-]+$/ (letters, digits, underscore, hyphen)`
    })
  );
}

function zipDirectory(dirPath, outputPath, dirName) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve(archive.pointer()));
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(dirPath, dirName);
    archive.finalize();
  });
}

export default async function publish(directory, options) {
  const credentials = loadCredentials();
  if (!credentials?.token) {
    console.log(chalk.red(pickMessage({ zh: '❌ 请先登录: skb login', en: '❌ Please login first: skb login' })));
    process.exit(1);
  }

  const resolvedDir = path.resolve(directory || process.cwd());
  if (!fs.existsSync(resolvedDir)) {
    console.log(
      chalk.red(
        pickMessage({
          zh: `❌ 目录不存在: ${resolvedDir}`,
          en: `❌ Directory not found: ${resolvedDir}`
        })
      )
    );
    process.exit(1);
  }

  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    console.log(
      chalk.red(
        pickMessage({
          zh: `❌ 路径不是目录: ${resolvedDir}`,
          en: `❌ Path is not a directory: ${resolvedDir}`
        })
      )
    );
    process.exit(1);
  }

  const skillMdPath = path.join(resolvedDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.log(
      chalk.red(
        pickMessage({
          zh: `❌ 目录中缺少 SKILL.md: ${skillMdPath}`,
          en: `❌ Missing SKILL.md in directory: ${skillMdPath}`
        })
      )
    );
    process.exit(1);
  }

  const folderBasename = path.basename(resolvedDir);
  const skillMdContent = fs.readFileSync(skillMdPath, 'utf-8');
  const parsed = parseSkillMd(skillMdContent);

  let skillId;
  try {
    skillId = resolveSkillId(folderBasename, parsed.fm?.name);
  } catch (e) {
    console.log(chalk.red(`❌ ${e.message}`));
    process.exit(1);
  }

  const name = options.name || parsed.headingTitle || skillId;
  const description =
    options.description ||
    (parsed.descriptionFromFm ? parsed.descriptionFromFm : '') ||
    parsed.headingDescription ||
    '';
  const changelog = options.changelog;

  const noneLabel = pickMessage({ zh: '（无）', en: '(none)' });
  console.log(
    chalk.cyan(
      pickMessage({
        zh: `📦 准备发布 Skill: ${skillId}`,
        en: `📦 Preparing to publish Skill: ${skillId}`
      })
    )
  );
  console.log(chalk.gray(`   ${pickMessage({ zh: '名称: ', en: 'Name: ' })}${name}`));
  console.log(chalk.gray(`   ${pickMessage({ zh: '描述: ', en: 'Description: ' })}${description || noneLabel}`));
  console.log(chalk.gray(`   ${pickMessage({ zh: '更新说明: ', en: 'Changelog: ' })}${changelog}`));

  const spinner = ora(pickMessage({ zh: '正在打包...', en: 'Packing...' })).start();
  const tmpZipPath = path.join(os.tmpdir(), `skb-${randomBytes(8).toString('hex')}.zip`);

  try {
    const size = await zipDirectory(resolvedDir, tmpZipPath, skillId);
    spinner.text = pickMessage({
      zh: `打包完成（${(size / 1024).toFixed(1)} KB），正在上传...`,
      en: `Pack complete (${(size / 1024).toFixed(1)} KB), uploading...`
    });

    const client = createClient();

    const zipBuffer = fs.readFileSync(tmpZipPath);
    const zipBlob = new Blob([zipBuffer], { type: 'application/zip' });

    const formData = new FormData();
    formData.append('zip_file', zipBlob, 'skill.zip');
    formData.append('skill_id', skillId);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('changelog', changelog || '');

    const result = await client.postForm('/skills/publish', formData);

    if (result.ok) {
      spinner.succeed(
        chalk.green(
          pickMessage({
            zh: `发布成功！Skill: ${result.skill_id}，版本: ${result.version}`,
            en: `Published successfully! Skill: ${result.skill_id}, version: ${result.version}`
          })
        )
      );
    } else {
      spinner.fail(chalk.red(pickMessage({ zh: '发布失败', en: 'Publish failed' })));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red(`${pickMessage({ zh: '发布失败: ', en: 'Publish failed: ' })}${err.message}`));
    process.exit(1);
  } finally {
    try {
      if (fs.existsSync(tmpZipPath)) {
        fs.unlinkSync(tmpZipPath);
      }
    } catch {
      // ignore
    }
  }
}
