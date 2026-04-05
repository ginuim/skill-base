import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import extract from 'extract-zip';
import prompts from 'prompts';
import { createClient } from '../api.js';
import { detectInsideIdeDir, resolveInstallDir, getIdeChoices, getSupportedIdeIds, IDE_CONFIGS } from '../ide.js';
import { rememberSkillInstall } from '../installs.js';
import { pickMessage, lang } from '../i18n.js';

const M = {
  noVersion: {
    zh: (id) => `Skill ${id} 没有可用版本`,
    en: (id) => `Skill ${id} has no available version`
  },
  chooseIde: { zh: '选择目标 IDE', en: 'Select target IDE' },
  cwdChoice: { zh: '当前目录（不使用 IDE 集成）', en: 'Current directory (no IDE integration)' },
  cancelled: { zh: '\n已取消安装', en: '\nInstall cancelled' },
  unsupportedIde: { zh: '不支持的 IDE: ', en: 'Unsupported IDE: ' },
  supportedPrefix: { zh: '支持的 IDE: ', en: 'Supported IDEs: ' },
  noGlobal: { zh: ' 不支持全局安装', en: ' does not support global installation' },
  nestedWarn: {
    zh: (name) => `当前目录已在 ${name} 的 skill 目录内，继续安装可能导致嵌套。是否继续？`,
    en: (name) =>
      `Current directory is already inside ${name}'s skill path; continuing may nest installs. Continue?`
  },
  downloading: { zh: '正在下载 ', en: 'Downloading ' },
  installed: { zh: '已安装 ', en: 'Installed ' },
  notFound: { zh: '未找到 Skill', en: 'Skill not found' },
  possible: { zh: '可尝试:', en: 'Possible solutions:' },
  sol1: { zh: '  1. 检查 Skill 名称是否正确', en: '  1. Check the skill name' },
  sol2: { zh: '  2. 使用 `skb search <关键词>` 查找可用 Skill', en: '  2. Use `skb search <keyword>` to find skills' },
  sol3: { zh: '  3. 若是你的 Skill，请先 `skb publish` 发布', en: '  3. If it is yours, publish with `skb publish` first' },
  tipLatest: { zh: '提示: 使用 `skb install ', en: 'Tip: use `skb install ' },
  tipLatestSuffix: { zh: '` 安装最新版本', en: '` to install the latest' },
  installFailed: { zh: '安装失败: ', en: 'Install failed: ' }
};

function pickFn(obj, arg) {
  const fn = obj[lang] || obj.en;
  return typeof fn === 'function' ? fn(arg) : '';
}

export async function downloadAndExtract(skillId, version, targetDir) {
  const client = createClient();

  const skillInfo = await client.get(`/skills/${encodeURIComponent(skillId)}`);

  const actualVersion = version === 'latest' ? skillInfo.latest_version : version;

  if (!actualVersion) {
    throw new Error(pickFn(M.noVersion, skillId));
  }

  const response = await client.download(
    `/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(actualVersion)}/download`
  );

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpZip = path.join(os.tmpdir(), `skb-${skillId}-${actualVersion}-${Date.now()}.zip`);
  fs.writeFileSync(tmpZip, buffer);

  fs.mkdirSync(targetDir, { recursive: true });

  await extract(tmpZip, { dir: path.resolve(targetDir) });

  try {
    fs.unlinkSync(tmpZip);
  } catch (e) {
    // ignore
  }

  return { skillId, version: actualVersion, targetDir };
}

export default async function install(target, options) {
  let skillId;
  let version;
  if (target.includes('@')) {
    const parts = target.split('@');
    skillId = parts[0];
    version = parts[1];
  } else {
    skillId = target;
    version = 'latest';
  }

  let targetDir;
  let selectedIdeId = null;

  if (options.dir) {
    targetDir = options.dir;
  } else {
    let ideId = options.ide;

    if (!ideId) {
      const ideChoices = [
        ...getIdeChoices(),
        { title: pickMessage(M.cwdChoice), value: '_cwd' }
      ];
      const response = await prompts({
        type: 'select',
        name: 'ide',
        message: pickMessage(M.chooseIde),
        choices: ideChoices
      });

      if (response.ide === undefined) {
        console.log(chalk.yellow(pickMessage(M.cancelled)));
        process.exit(0);
      }

      ideId = response.ide;
    }

    selectedIdeId = ideId === '_cwd' ? '' : ideId;

    if (ideId === '_cwd') {
      targetDir = process.cwd();
    } else {
      if (!getSupportedIdeIds().includes(ideId)) {
        console.log(chalk.red(`${pickMessage(M.unsupportedIde)}${ideId}`));
        console.log(chalk.yellow(`${pickMessage(M.supportedPrefix)}${getSupportedIdeIds().join(', ')}`));
        process.exit(1);
      }

      if (options.global && !IDE_CONFIGS[ideId].supportsGlobal) {
        console.log(chalk.red(`${IDE_CONFIGS[ideId].name}${pickMessage(M.noGlobal)}`));
        process.exit(1);
      }

      const insideIde = detectInsideIdeDir(process.cwd());
      if (insideIde) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: pickFn(M.nestedWarn, insideIde.name),
          initial: false
        });
        if (!confirm) {
          console.log(chalk.yellow(pickMessage(M.cancelled)));
          process.exit(0);
        }
      }

      targetDir = resolveInstallDir(ideId, skillId, options.global || false, process.cwd());
    }
  }

  const verLabel = version !== 'latest' ? `@${version}` : '';
  const spinner = ora(`${pickMessage(M.downloading)}${skillId}${verLabel}...`).start();

  try {
    const result = await downloadAndExtract(skillId, version, targetDir);
    const installPath = path.join(result.targetDir, skillId);
    rememberSkillInstall({
      skillId: result.skillId,
      installPath,
      version: result.version,
      ide: selectedIdeId,
      isGlobal: options.global || false
    });
    const displayPath = path.relative(process.cwd(), installPath) || installPath;
    spinner.succeed(
      chalk.green(`${pickMessage(M.installed)}${result.skillId} ${result.version} → ${displayPath}`)
    );
  } catch (err) {
    if (err.message === 'Skill not found' || err.message.includes('HTTP 404')) {
      spinner.fail(chalk.red(`${pickMessage(M.notFound)} '${skillId}'`));
      console.log();
      console.log(chalk.yellow(pickMessage(M.possible)));
      console.log(chalk.gray(pickMessage(M.sol1)));
      console.log(chalk.gray(pickMessage(M.sol2)));
      console.log(chalk.gray(pickMessage(M.sol3)));
    } else if (err.message === 'Version not found') {
      spinner.fail(
        chalk.red(
          pickMessage({
            zh: `未找到版本 '${version}'（Skill '${skillId}'）`,
            en: `Version '${version}' not found for skill '${skillId}'`
          })
        )
      );
      console.log();
      console.log(
        chalk.yellow(`${pickMessage(M.tipLatest)}${skillId}${pickMessage(M.tipLatestSuffix)}`)
      );
    } else {
      spinner.fail(chalk.red(`${pickMessage(M.installFailed)}${err.message}`));
    }
    process.exit(1);
  }
}
