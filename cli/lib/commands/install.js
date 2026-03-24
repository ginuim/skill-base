import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import extract from 'extract-zip';
import { createClient } from '../api.js';

/**
 * 下载并解压 Skill 到指定目录
 * @param {string} skillId - Skill ID
 * @param {string} version - 版本号（或 'latest'）
 * @param {string} targetDir - 目标目录
 * @returns {Promise<{skillId: string, version: string, targetDir: string}>}
 */
export async function downloadAndExtract(skillId, version, targetDir) {
  const client = createClient();

  // 先获取 Skill 信息确认存在
  const skillInfo = await client.get(`/skills/${encodeURIComponent(skillId)}`);

  // 如果是 latest，使用实际版本号
  const actualVersion = version === 'latest' ? skillInfo.latest_version : version;

  if (!actualVersion) {
    throw new Error(`Skill ${skillId} 没有可用版本`);
  }

  // 下载 zip
  const response = await client.download(
    `/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(actualVersion)}/download`
  );

  // 获取 ArrayBuffer 并写入临时文件
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const tmpZip = path.join(os.tmpdir(), `skb-${skillId}-${actualVersion}-${Date.now()}.zip`);
  fs.writeFileSync(tmpZip, buffer);

  // 确保目标目录存在
  fs.mkdirSync(targetDir, { recursive: true });

  // 解压
  await extract(tmpZip, { dir: path.resolve(targetDir) });

  // 清理临时文件
  try {
    fs.unlinkSync(tmpZip);
  } catch (e) {
    // 忽略清理失败
  }

  return { skillId, version: actualVersion, targetDir };
}

export default async function install(target, options) {
  // 解析 target: skillId@version 或 skillId
  let skillId, version;
  if (target.includes('@')) {
    const parts = target.split('@');
    skillId = parts[0];
    version = parts[1];
  } else {
    skillId = target;
    version = 'latest';
  }

  // 目标目录：选项指定或当前目录
  const targetDir = options?.dir || process.cwd();

  const spinner = ora(`正在下载 ${skillId}${version !== 'latest' ? '@' + version : ''}...`).start();

  try {
    const result = await downloadAndExtract(skillId, version, targetDir);
    spinner.succeed(chalk.green(`已安装 ${result.skillId} ${result.version} 到 ${result.targetDir}`));
  } catch (err) {
    spinner.fail(chalk.red(`安装失败：${err.message}`));
    process.exit(1);
  }
}
