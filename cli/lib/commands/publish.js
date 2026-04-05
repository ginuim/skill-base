import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import chalk from 'chalk';
import ora from 'ora';
import archiver from 'archiver';
import { parse as parseYaml } from 'yaml';
import { loadCredentials } from '../auth.js';
import { createClient } from '../api.js';
import { pickMessage } from '../i18n.js';

/** skill id: letters, digits, underscore, hyphen (matches /^[\\w-]+$/ in docs) */
const SKILL_ID_RE = /^[\w-]+$/;

export function resolveSkillId(folderBasename, frontmatterName) {
  const f = String(folderBasename ?? '').trim();
  const m =
    frontmatterName === undefined || frontmatterName === null
      ? ''
      : String(frontmatterName).trim();

  const fOk = SKILL_ID_RE.test(f);
  const mOk = m.length > 0 && SKILL_ID_RE.test(m);

  if (fOk && mOk) {
    if (f === m) return f;
    throw new Error(
      pickMessage({
        zh: `skill_id 不一致：文件夹名为 "${f}"，frontmatter 的 name 为 "${m}"，请统一为同一标识`,
        en: `skill_id mismatch: folder name is "${f}" but frontmatter name is "${m}"; use one identifier`
      })
    );
  }
  if (fOk) return f;
  if (mOk) return m;
  throw new Error(
    pickMessage({
      zh: `无效的 skill id：文件夹名 "${f}" 与 frontmatter name "${m || '(无)'}" 须至少其一符合 /^[\\w-]+$/（仅字母、数字、下划线与连字符）`,
      en: `Invalid skill id: folder name "${f}" and frontmatter name "${m || '(none)'}" — at least one must match /^[\\w-]+$/ (letters, digits, underscore, hyphen)`
    })
  );
}

function splitFrontmatter(content) {
  const s = content.replace(/^\uFEFF/, '');
  if (!s.startsWith('---')) return { fmYaml: null, body: s };
  const lines = s.split(/\r?\n/);
  if (lines[0].trim() !== '---') return { fmYaml: null, body: s };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (end === -1) return { fmYaml: null, body: s };
  const fmYaml = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { fmYaml, body };
}

function parseBodyHeading(body) {
  const lines = body.split(/\r?\n/);
  let name = null;
  let description = null;
  let foundTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!foundTitle && trimmed.startsWith('# ')) {
      name = trimmed.slice(2).trim();
      foundTitle = true;
      continue;
    }

    if (foundTitle && trimmed && !trimmed.startsWith('#')) {
      description = trimmed.slice(0, 200);
      break;
    }
  }

  return { name, description };
}

function parseSkillMd(content) {
  const { fmYaml, body } = splitFrontmatter(content);
  let fm = null;
  if (fmYaml !== null && fmYaml.trim() !== '') {
    try {
      fm = parseYaml(fmYaml);
      if (fm === null || typeof fm !== 'object') fm = {};
    } catch {
      fm = null;
    }
  }

  const heading = parseBodyHeading(body);
  let descriptionFromFm = '';
  if (fm && fm.description !== undefined && fm.description !== null) {
    descriptionFromFm = String(fm.description).trim();
  }

  return {
    fm,
    headingTitle: heading.name,
    headingDescription: heading.description,
    descriptionFromFm
  };
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
