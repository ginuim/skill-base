import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { detectInsideIdeDir, resolveInstallDir, getIdeChoices, getSupportedIdeIds, IDE_CONFIGS } from '../ide.js';
import { rememberSkillInstall } from '../installs.js';
import { assertSkillInstallId } from '../install-archive.mjs';
import { downloadAndExtract } from '../download-and-extract.mjs';
import {
  downloadCollectionZip,
  extractCollectionZip,
  fetchCollectionDetail
} from '../download-collection.mjs';
import { pickMessage, lang } from '../i18n.js';

export { downloadAndExtract };

const M = {
  noVersion: {
    zh: (id) => `Skill ${id} 没有可用版本`,
    en: (id) => `Skill ${id} has no available version`
  },
  chooseIde: { zh: '选择目标 Agent', en: 'Select target Agent' },
  cwdChoice: { zh: '当前目录（不使用 Agent 集成）', en: 'Current directory (no Agent integration)' },
  cancelled: { zh: '\n已取消安装', en: '\nInstall cancelled' },
  unsupportedIde: { zh: '不支持的 Agent: ', en: 'Unsupported Agent: ' },
  supportedPrefix: { zh: '支持的 Agent: ', en: 'Supported Agents: ' },
  noGlobal: { zh: ' 不支持全局安装', en: ' does not support global installation' },
  nestedWarn: {
    zh: (name) => `当前目录已在 ${name} 的 skill 目录内，继续安装可能导致嵌套。是否继续？`,
    en: (name) =>
      `Current directory is already inside ${name}'s skill path; continuing may nest installs. Continue?`
  },
  downloading: { zh: '正在下载 ', en: 'Downloading ' },
  downloadingCollection: { zh: '正在下载集合 ', en: 'Downloading collection ' },
  installed: { zh: '已安装 ', en: 'Installed ' },
  installedCollection: {
    zh: (count) => `已安装集合内 ${count} 个 Skill`,
    en: (count) => `Installed ${count} skill(s) from collection`
  },
  notFound: { zh: '未找到 Skill', en: 'Skill not found' },
  collectionNotFound: { zh: '未找到集合', en: 'Collection not found' },
  collectionEmpty: { zh: '集合内没有可安装的 Skill', en: 'No installable skills in this collection' },
  collectionTargetRequired: {
    zh: '请指定 Skill 名称，或使用 --collection <id> 安装集合',
    en: 'Specify a skill name, or use --collection <id> to install a collection'
  },
  possible: { zh: '可尝试:', en: 'Possible solutions:' },
  sol1: { zh: '  1. 检查 Skill 名称是否正确', en: '  1. Check the skill name' },
  sol2: { zh: '  2. 使用 `skb search <关键词>` 查找可用 Skill', en: '  2. Use `skb search <keyword>` to find skills' },
  sol3: { zh: '  3. 若是你的 Skill，请先 `skb publish` 发布', en: '  3. If it is yours, publish with `skb publish` first' },
  tipLatest: { zh: '提示: 使用 `skb install ', en: 'Tip: use `skb install ' },
  tipLatestSuffix: { zh: '` 安装最新版本', en: '` to install the latest' },
  installFailed: { zh: '安装失败: ', en: 'Install failed: ' },
  overwriteAsk: {
    zh: (p) => `目标已存在同名目录，是否覆盖？\n${p}`,
    en: (p) => `A folder with the same skill name already exists. Overwrite?\n${p}`
  },
  overwriteAllAsk: {
    zh: (paths) => `以下 ${paths.length} 个 Skill 目录已存在，是否全部覆盖？\n${paths.join('\n')}`,
    en: (paths) => `${paths.length} skill folder(s) already exist. Overwrite all?\n${paths.join('\n')}`
  }
};

function pickFn(obj, arg) {
  const fn = obj[lang] || obj.en;
  return typeof fn === 'function' ? fn(arg) : '';
}

async function resolveInstallTarget(options, skillIdForIde = '') {
  let targetDir;
  let selectedIdeId = null;

  if (options.dir) {
    targetDir = options.dir;
    return { targetDir, selectedIdeId };
  }

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

    targetDir = resolveInstallDir(ideId, skillIdForIde, options.global || false, process.cwd());
  }

  return { targetDir, selectedIdeId };
}

async function confirmOverwriteSingle(installPathCandidate) {
  const displayConflict = path.relative(process.cwd(), installPathCandidate) || installPathCandidate;
  const { confirm: overwrite } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: pickFn(M.overwriteAsk, displayConflict),
    initial: false
  });
  if (overwrite === undefined || !overwrite) {
    console.log(chalk.yellow(pickMessage(M.cancelled)));
    process.exit(0);
  }
}

async function confirmOverwriteAll(conflictPaths) {
  const displayPaths = conflictPaths.map(
    (p) => path.relative(process.cwd(), p) || p
  );
  const { confirm: overwrite } = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: pickFn(M.overwriteAllAsk, displayPaths),
    initial: false
  });
  if (overwrite === undefined || !overwrite) {
    console.log(chalk.yellow(pickMessage(M.cancelled)));
    process.exit(0);
  }
}

async function installSingleSkill(target, options) {
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

  assertSkillInstallId(skillId);
  const { targetDir, selectedIdeId } = await resolveInstallTarget(options, skillId);
  const resolvedTargetDir = path.resolve(targetDir);
  const installPathCandidate = path.join(resolvedTargetDir, skillId);

  if (fs.lstatSync(installPathCandidate, { throwIfNoEntry: false })) {
    await confirmOverwriteSingle(installPathCandidate);
  }

  const verLabel = version !== 'latest' ? `@${version}` : '';
  const spinner = ora(`${pickMessage(M.downloading)}${skillId}${verLabel}...`).start();

  try {
    const result = await downloadAndExtract(skillId, version, resolvedTargetDir);
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

async function installCollection(collectionRefRaw, options) {
  const collectionRef = String(collectionRefRaw || '').trim();
  if (!collectionRef) {
    console.log(chalk.red(pickMessage({ zh: '无效的集合 ID 或 slug', en: 'Invalid collection id or slug' })));
    process.exit(1);
  }

  let detail;
  try {
    detail = await fetchCollectionDetail(collectionRef);
  } catch (err) {
    if (String(err.message).includes('HTTP 404')) {
      console.log(chalk.red(`${pickMessage(M.collectionNotFound)} ${collectionRef}`));
      process.exit(1);
    }
    console.log(chalk.red(`${pickMessage(M.installFailed)}${err.message}`));
    process.exit(1);
  }

  const skills = (detail.skills || []).filter((skill) => skill.latest_version);
  if (skills.length === 0) {
    console.log(chalk.yellow(pickMessage(M.collectionEmpty)));
    process.exit(1);
  }

  for (const skill of skills) assertSkillInstallId(skill.id);
  const { targetDir, selectedIdeId } = await resolveInstallTarget(options);
  const resolvedTargetDir = path.resolve(targetDir);

  const conflictPaths = skills
    .map((skill) => path.join(resolvedTargetDir, skill.id))
    .filter((installPath) => fs.lstatSync(installPath, { throwIfNoEntry: false }));

  if (conflictPaths.length > 0) {
    await confirmOverwriteAll(conflictPaths);
  }

  const spinner = ora(`${pickMessage(M.downloadingCollection)}${collectionRef}...`).start();

  try {
    const buffer = await downloadCollectionZip(collectionRef);
    await extractCollectionZip(buffer, resolvedTargetDir, skills.map((skill) => skill.id));

    for (const skill of skills) {
      const installPath = path.join(resolvedTargetDir, skill.id);
      if (!fs.existsSync(installPath)) {
        continue;
      }
      rememberSkillInstall({
        skillId: skill.id,
        installPath,
        version: skill.latest_version,
        ide: selectedIdeId,
        isGlobal: options.global || false
      });
    }

    spinner.succeed(chalk.green(pickFn(M.installedCollection, skills.length)));
    for (const skill of skills) {
      const installPath = path.join(resolvedTargetDir, skill.id);
      if (!fs.existsSync(installPath)) continue;
      const displayPath = path.relative(process.cwd(), installPath) || installPath;
      console.log(chalk.gray(`  ${skill.id} ${skill.latest_version} → ${displayPath}`));
    }
  } catch (err) {
    spinner.fail(chalk.red(`${pickMessage(M.installFailed)}${err.message}`));
    process.exit(1);
  }
}

export default async function install(target, options) {
  if (options.collection && target) {
    throw new Error('Specify either a skill or --collection, not both');
  }
  if (options.collection) {
    return installCollection(options.collection, options);
  }

  if (!target) {
    console.log(chalk.red(pickMessage(M.collectionTargetRequired)));
    process.exit(1);
  }

  return installSingleSkill(target, options);
}
