import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { createClient } from '../api.js';
import { pruneMissingSkillInstalls, rememberSkillInstall } from '../installs.js';
import { downloadAndExtract } from './install.js';
import { pickMessage, lang, formatDisplayTime } from '../i18n.js';

function formatUploader(uploader) {
  if (!uploader) {
    return pickMessage({ zh: '未知提交人', en: 'Unknown author' });
  }
  return uploader.name || uploader.username || pickMessage({ zh: '未知提交人', en: 'Unknown author' });
}

function summarizeLog(changelog) {
  if (!changelog) {
    return pickMessage({ zh: '无更新日志', en: 'No changelog' });
  }
  const oneLine = changelog.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= 80) return oneLine;
  return `${oneLine.slice(0, 77)}...`;
}

function formatInstallTitle(installPath) {
  return path.relative(process.cwd(), installPath) || installPath;
}

function buildTargetInstalls(skillId, options) {
  if (options?.dir) {
    return [
      {
        installPath: path.resolve(options.dir, skillId),
        version: '',
        installedAt: '',
        ide: '',
        isGlobal: false
      }
    ];
  }

  return pruneMissingSkillInstalls(skillId);
}

function installDescription(item) {
  const verPart = item.version
    ? pickMessage({ zh: `当前版本 ${item.version}`, en: `Current version ${item.version}` })
    : pickMessage({ zh: '当前版本未知', en: 'Unknown version' });
  const idePart = item.ide ? `IDE: ${item.ide}` : '';
  const timePart = item.installedAt
    ? pickMessage({
        zh: `上次更新 ${formatDisplayTime(item.installedAt)}`,
        en: `Last updated ${formatDisplayTime(item.installedAt)}`
      })
    : '';
  return [verPart, idePart, timePart].filter(Boolean).join(' · ');
}

export default async function update(skillId, options) {
  const client = createClient();
  const spinner = ora(
    pickMessage({
      zh: `正在加载 ${skillId} 的版本列表...`,
      en: `Loading versions for ${skillId}...`
    })
  ).start();
  let updateSpinner = null;

  try {
    const versionsResult = await client.get(`/skills/${encodeURIComponent(skillId)}/versions`);
    const versions = Array.isArray(versionsResult.versions) ? versionsResult.versions : [];

    if (versions.length === 0) {
      spinner.fail(
        chalk.red(
          pickMessage({
            zh: `Skill ${skillId} 没有可用版本`,
            en: `Skill ${skillId} has no available version`
          })
        )
      );
      process.exit(1);
    }

    spinner.stop();

    const latestVersion = versions[0].version;
    const latestLabel = lang === 'zh' ? '（最新）' : ' (latest)';
    const versionAnswer = await prompts({
      type: 'select',
      name: 'version',
      message: pickMessage({
        zh: `选择 ${skillId} 的目标版本`,
        en: `Select target version for ${skillId}`
      }),
      choices: versions.map((item) => ({
        title: `${item.version}${item.version === latestVersion ? latestLabel : ''} · ${formatUploader(item.uploader)}`,
        description: `${formatDisplayTime(item.created_at)} · ${summarizeLog(item.changelog)}`,
        value: item.version
      }))
    });

    if (!versionAnswer.version) {
      console.log(chalk.yellow(pickMessage({ zh: '\n已取消更新', en: '\nUpdate cancelled' })));
      process.exit(0);
    }

    const installs = buildTargetInstalls(skillId, options);
    if (installs.length === 0) {
      console.log(
        chalk.red(
          pickMessage({
            zh: `本地没有记录到 ${skillId} 的安装目录`,
            en: `No local install path recorded for ${skillId}`
          })
        )
      );
      console.log(
        chalk.yellow(
          pickMessage({
            zh: `先重新安装一次，或显式指定目录：skb update ${skillId} -d <directory>`,
            en: `Install again first, or pass a directory: skb update ${skillId} -d <directory>`
          })
        )
      );
      process.exit(1);
    }

    let selectedInstalls = installs;
    if (!options?.dir) {
      const installAnswer = await prompts({
        type: 'multiselect',
        name: 'installPaths',
        message: pickMessage({
          zh: '选择要更新的安装目录（空格勾选，回车确认）',
          en: 'Select install directories to update (space to toggle, enter to confirm)'
        }),
        instructions: false,
        choices: [
          {
            title: pickMessage({
              zh: `全部目录（${installs.length} 个）`,
              en: `All directories (${installs.length})`
            }),
            value: '__all__'
          },
          ...installs.map((item) => ({
            title: formatInstallTitle(item.installPath),
            description: installDescription(item),
            value: item.installPath
          }))
        ]
      });

      if (!installAnswer.installPaths) {
        console.log(chalk.yellow(pickMessage({ zh: '\n已取消更新', en: '\nUpdate cancelled' })));
        process.exit(0);
      }

      if (installAnswer.installPaths.includes('__all__')) {
        selectedInstalls = installs;
      } else {
        selectedInstalls = installs.filter((item) => installAnswer.installPaths.includes(item.installPath));
      }
    }

    if (selectedInstalls.length === 0) {
      console.log(
        chalk.yellow(pickMessage({ zh: '未选择任何安装目录，已取消更新', en: 'No directories selected' }))
      );
      process.exit(0);
    }

    updateSpinner = ora(
      pickMessage({
        zh: `正在更新 ${skillId}@${versionAnswer.version}...`,
        en: `Updating ${skillId}@${versionAnswer.version}...`
      })
    ).start();
    const updatedTargets = [];

    for (const install of selectedInstalls) {
      updateSpinner.text = pickMessage({
        zh: `正在更新 ${skillId}@${versionAnswer.version} → ${formatInstallTitle(install.installPath)}`,
        en: `Updating ${skillId}@${versionAnswer.version} → ${formatInstallTitle(install.installPath)}`
      });
      const result = await downloadAndExtract(skillId, versionAnswer.version, path.dirname(install.installPath));
      rememberSkillInstall({
        skillId: result.skillId,
        installPath: install.installPath,
        version: result.version,
        ide: install.ide,
        isGlobal: install.isGlobal
      });
      updatedTargets.push({
        installPath: install.installPath,
        version: result.version
      });
    }

    updateSpinner.succeed(
      chalk.green(
        pickMessage({
          zh: `已将 ${skillId} 更新到 ${versionAnswer.version}，共处理 ${updatedTargets.length} 个目录`,
          en: `Updated ${skillId} to ${versionAnswer.version} (${updatedTargets.length} director(ies))`
        })
      )
    );
    for (const item of updatedTargets) {
      console.log(chalk.gray(`  - ${formatInstallTitle(item.installPath)}`));
    }
  } catch (err) {
    const failPrefix = pickMessage({ zh: '更新失败: ', en: 'Update failed: ' });
    if (updateSpinner?.isSpinning) {
      updateSpinner.fail(chalk.red(`${failPrefix}${err.message}`));
    } else if (spinner.isSpinning) {
      spinner.fail(chalk.red(`${failPrefix}${err.message}`));
    } else {
      console.log(chalk.red(`${failPrefix}${err.message}`));
    }
    process.exit(1);
  }
}
