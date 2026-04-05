import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { createClient } from '../api.js';
import { pruneMissingSkillInstalls, rememberSkillInstall } from '../installs.js';
import { downloadAndExtract } from './install.js';

function formatUploader(uploader) {
  if (!uploader) return '未知提交人';
  return uploader.name || uploader.username || '未知提交人';
}

function formatTime(value) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function summarizeLog(changelog) {
  if (!changelog) return '无更新日志';
  const oneLine = changelog.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 80) return oneLine;
  return `${oneLine.slice(0, 77)}...`;
}

function formatInstallTitle(installPath) {
  return path.relative(process.cwd(), installPath) || installPath;
}

function buildTargetInstalls(skillId, options) {
  if (options?.dir) {
    return [{
      installPath: path.resolve(options.dir, skillId),
      version: '',
      installedAt: '',
      ide: '',
      isGlobal: false,
    }];
  }

  return pruneMissingSkillInstalls(skillId);
}

export default async function update(skillId, options) {
  const client = createClient();
  const spinner = ora(`正在加载 ${skillId} 的版本列表...`).start();
  let updateSpinner = null;

  try {
    const versionsResult = await client.get(`/skills/${encodeURIComponent(skillId)}/versions`);
    const versions = Array.isArray(versionsResult.versions) ? versionsResult.versions : [];

    if (versions.length === 0) {
      spinner.fail(chalk.red(`Skill ${skillId} has no available version`));
      process.exit(1);
    }

    spinner.stop();

    const latestVersion = versions[0].version;
    const versionAnswer = await prompts({
      type: 'select',
      name: 'version',
      message: `选择 ${skillId} 的目标版本`,
      choices: versions.map((item) => ({
        title: `${item.version}${item.version === latestVersion ? ' (latest)' : ''} · ${formatUploader(item.uploader)}`,
        description: `${formatTime(item.created_at)} · ${summarizeLog(item.changelog)}`,
        value: item.version,
      })),
    });

    if (!versionAnswer.version) {
      console.log(chalk.yellow('\n已取消更新'));
      process.exit(0);
    }

    const installs = buildTargetInstalls(skillId, options);
    if (installs.length === 0) {
      console.log(chalk.red(`本地没有记录到 ${skillId} 的安装目录`));
      console.log(chalk.yellow(`先重新安装一次，或显式指定目录：skb update ${skillId} -d <directory>`));
      process.exit(1);
    }

    let selectedInstalls = installs;
    if (!options?.dir) {
      const installAnswer = await prompts({
        type: 'multiselect',
        name: 'installPaths',
        message: `选择要更新的安装目录（空格勾选，回车确认）`,
        instructions: false,
        choices: [
          { title: `全部目录（${installs.length} 个）`, value: '__all__' },
          ...installs.map((item) => ({
            title: formatInstallTitle(item.installPath),
            description: [
              item.version ? `当前版本 ${item.version}` : '当前版本未知',
              item.ide ? `IDE: ${item.ide}` : '',
              item.installedAt ? `上次更新 ${formatTime(item.installedAt)}` : '',
            ].filter(Boolean).join(' · '),
            value: item.installPath,
          })),
        ],
      });

      if (!installAnswer.installPaths) {
        console.log(chalk.yellow('\n已取消更新'));
        process.exit(0);
      }

      if (installAnswer.installPaths.includes('__all__')) {
        selectedInstalls = installs;
      } else {
        selectedInstalls = installs.filter((item) => installAnswer.installPaths.includes(item.installPath));
      }
    }

    if (selectedInstalls.length === 0) {
      console.log(chalk.yellow('未选择任何安装目录，已取消更新'));
      process.exit(0);
    }

    updateSpinner = ora(`正在更新 ${skillId}@${versionAnswer.version}...`).start();
    const updatedTargets = [];

    for (const install of selectedInstalls) {
      updateSpinner.text = `正在更新 ${skillId}@${versionAnswer.version} → ${formatInstallTitle(install.installPath)}`;
      const result = await downloadAndExtract(skillId, versionAnswer.version, path.dirname(install.installPath));
      rememberSkillInstall({
        skillId: result.skillId,
        installPath: install.installPath,
        version: result.version,
        ide: install.ide,
        isGlobal: install.isGlobal,
      });
      updatedTargets.push({
        installPath: install.installPath,
        version: result.version,
      });
    }

    updateSpinner.succeed(chalk.green(`已将 ${skillId} 更新到 ${versionAnswer.version}，共处理 ${updatedTargets.length} 个目录`));
    for (const item of updatedTargets) {
      console.log(chalk.gray(`  - ${formatInstallTitle(item.installPath)}`));
    }
  } catch (err) {
    if (updateSpinner?.isSpinning) {
      updateSpinner.fail(chalk.red(`更新失败: ${err.message}`));
    } else if (spinner.isSpinning) {
      spinner.fail(chalk.red(`更新失败: ${err.message}`));
    } else {
      console.log(chalk.red(`更新失败: ${err.message}`));
    }
    process.exit(1);
  }
}
