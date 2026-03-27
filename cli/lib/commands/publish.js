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

/** skill id：字母、数字、下划线、连字符（与文档 /^[\\w-]+$/ 一致） */
const SKILL_ID_RE = /^[\w-]+$/;

/**
 * 在文件夹名与 frontmatter 的 name 之间选取 skill_id：须至少其一符合 SKILL_ID_RE；
 * 若两者都符合则必须相同，否则报错。
 */
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
      `skill_id 不一致：文件夹名为 "${f}"，frontmatter 的 name 为 "${m}"，请统一为同一标识`
    );
  }
  if (fOk) return f;
  if (mOk) return m;
  throw new Error(
    `无效的 skill id：文件夹名 "${f}" 与 frontmatter name "${m || '(无)'}" 须至少其一符合 /^[\\w-]+$/（仅字母、数字、下划线与连字符）`
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

/**
 * 解析 SKILL.md：YAML frontmatter（若有）+ 正文第一个 # 标题与首段描述。
 */
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
    descriptionFromFm,
  };
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
    archive.directory(dirPath, dirName);
    archive.finalize();
  });
}

export default async function publish(directory, options) {
  const credentials = loadCredentials();
  if (!credentials?.token) {
    console.log(chalk.red('❌ Please login first: skb login'));
    process.exit(1);
  }

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

  const skillMdPath = path.join(resolvedDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.log(chalk.red(`❌ Missing SKILL.md in directory: ${skillMdPath}`));
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

  console.log(chalk.cyan(`📦 Preparing to publish Skill: ${skillId}`));
  console.log(chalk.gray(`   Name: ${name}`));
  console.log(chalk.gray(`   Description: ${description || '(none)'}`));
  console.log(chalk.gray(`   Changelog: ${changelog}`));

  const spinner = ora('Packing...').start();
  const tmpZipPath = path.join(os.tmpdir(), `skb-${randomBytes(8).toString('hex')}.zip`);

  try {
    const size = await zipDirectory(resolvedDir, tmpZipPath, skillId);
    spinner.text = `Pack complete (${(size / 1024).toFixed(1)} KB), uploading...`;

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
      spinner.succeed(chalk.green(`Published successfully! Skill: ${result.skill_id}, version: ${result.version}`));
    } else {
      spinner.fail(chalk.red('Publish failed'));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red(`Publish failed: ${err.message}`));
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
