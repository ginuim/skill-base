import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import prompts from 'prompts';
import update from './update.js';
import {
  clearSkillInstalls,
  listInstalledSkills,
  pruneAllMissingInstalls,
  removeSkillInstall
} from '../installs.js';
import { pickMessage, formatDisplayTime } from '../i18n.js';

function formatInstallTitle(installPath) {
  return path.relative(process.cwd(), installPath) || installPath;
}

function ensureSafeSkillPath(skillId, installPath) {
  return path.basename(installPath) === skillId;
}

function dirsDescription(item) {
  const verPart = item.version
    ? pickMessage({ zh: `当前版本 ${item.version}`, en: `Current version ${item.version}` })
    : pickMessage({ zh: '当前版本未知', en: 'Unknown version' });
  const idePart = item.ide ? `IDE: ${item.ide}` : '';
  const timePart = item.installedAt
    ? pickMessage({
        zh: `记录时间 ${formatDisplayTime(item.installedAt)}`,
        en: `Recorded ${formatDisplayTime(item.installedAt)}`
      })
    : '';
  return [verPart, idePart, timePart].filter(Boolean).join(' · ');
}

async function chooseSkill(skills) {
  const answer = await prompts({
    type: 'select',
    name: 'skillId',
    message: pickMessage({ zh: '选择本地已安装的 Skill', en: 'Select an installed Skill' }),
    choices: skills.map((item) => ({
      title: item.skillId,
      description: pickMessage({
        zh: `${item.installCount} 个目录 · 最近记录 ${formatDisplayTime(item.latestInstalledAt)}`,
        en: `${item.installCount} dir(s) · latest record ${formatDisplayTime(item.latestInstalledAt)}`
      }),
      value: item.skillId
    }))
  });

  return answer.skillId;
}

async function chooseAction(skill) {
  const answer = await prompts({
    type: 'select',
    name: 'action',
    message: pickMessage({
      zh: `选择对 ${skill.skillId} 的操作`,
      en: `Choose action for ${skill.skillId}`
    }),
    choices: [
      {
        title: pickMessage({ zh: '更新', en: 'Update' }),
        description: pickMessage({
          zh: '查看版本并更新一个或多个安装目录',
          en: 'Pick version and update one or more install paths'
        }),
        value: 'update'
      },
      {
        title: pickMessage({ zh: '删除本地文件', en: 'Delete local files' }),
        description: pickMessage({
          zh: '删除选中的安装目录，并同步清理记录',
          en: 'Remove selected dirs and registry entries'
        }),
        value: 'delete'
      },
      {
        title: pickMessage({ zh: '清除配置记录', en: 'Clear install records' }),
        description: pickMessage({
          zh: '只清掉本地记录，不删除任何文件',
          en: 'Remove records only; files stay on disk'
        }),
        value: 'clear-config'
      }
    ]
  });

  return answer.action;
}

async function deleteLocalInstalls(skill) {
  const answer = await prompts([
    {
      type: 'multiselect',
      name: 'installPaths',
      message: pickMessage({
        zh: `选择要删除的 ${skill.skillId} 目录`,
        en: `Select ${skill.skillId} directories to delete`
      }),
      instructions: false,
      choices: [
        {
          title: pickMessage({
            zh: `全部目录（${skill.installs.length} 个）`,
            en: `All directories (${skill.installs.length})`
          }),
          value: '__all__'
        },
        ...skill.installs.map((item) => ({
          title: formatInstallTitle(item.installPath),
          description: dirsDescription(item),
          value: item.installPath
        }))
      ]
    },
    {
      type: (prev) => {
        if (!prev || prev.length === 0) return null;
        return 'confirm';
      },
      name: 'confirm',
      message: pickMessage({
        zh: '确认删除选中的本地 Skill 目录？此操作不可撤销',
        en: 'Delete selected local Skill directories? This cannot be undone'
      }),
      initial: false
    }
  ]);

  if (!answer.installPaths) {
    console.log(chalk.yellow(pickMessage({ zh: '\n已取消操作', en: '\nCancelled' })));
    return;
  }

  const selectedInstalls = answer.installPaths.includes('__all__')
    ? skill.installs
    : skill.installs.filter((item) => answer.installPaths.includes(item.installPath));

  if (selectedInstalls.length === 0) {
    console.log(chalk.yellow(pickMessage({ zh: '未选择任何目录，已取消删除', en: 'No directories selected' })));
    return;
  }

  if (!answer.confirm) {
    console.log(chalk.yellow(pickMessage({ zh: '已取消删除', en: 'Delete cancelled' })));
    return;
  }

  const deleted = [];
  const skipped = [];

  for (const item of selectedInstalls) {
    if (!ensureSafeSkillPath(skill.skillId, item.installPath)) {
      skipped.push(
        `${formatInstallTitle(item.installPath)}${pickMessage({ zh: '（路径校验失败）', en: ' (path check failed)' })}`
      );
      continue;
    }

    if (fs.existsSync(item.installPath)) {
      fs.rmSync(item.installPath, { recursive: true, force: true });
    }
    removeSkillInstall(skill.skillId, item.installPath);
    deleted.push(formatInstallTitle(item.installPath));
  }

  if (deleted.length > 0) {
    console.log(
      chalk.green(
        pickMessage({
          zh: `已删除 ${deleted.length} 个目录：`,
          en: `Deleted ${deleted.length} director(ies):`
        })
      )
    );
    for (const item of deleted) {
      console.log(chalk.gray(`  - ${item}`));
    }
  }

  if (skipped.length > 0) {
    console.log(chalk.yellow(pickMessage({ zh: '以下目录未删除：', en: 'Not deleted:' })));
    for (const item of skipped) {
      console.log(chalk.gray(`  - ${item}`));
    }
  }
}

async function clearConfig(skill) {
  const answer = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: pickMessage({
      zh: `确认清除 ${skill.skillId} 的本地配置记录？不会删除磁盘文件`,
      en: `Clear local install records for ${skill.skillId}? Files on disk are not removed`
    }),
    initial: false
  });

  if (!answer.confirm) {
    console.log(chalk.yellow(pickMessage({ zh: '已取消清除配置', en: 'Cancelled' })));
    return;
  }

  clearSkillInstalls(skill.skillId);
  console.log(
    chalk.green(
      pickMessage({
        zh: `已清除 ${skill.skillId} 的本地配置记录`,
        en: `Cleared install records for ${skill.skillId}`
      })
    )
  );
}

export default async function installed() {
  const skills = pruneAllMissingInstalls();

  if (skills.length === 0) {
    console.log(
      chalk.yellow(
        pickMessage({
          zh: '当前没有记录到任何通过 skb 安装的 Skill',
          en: 'No skills installed via skb are recorded'
        })
      )
    );
    return;
  }

  const skillId = await chooseSkill(skills);
  if (!skillId) {
    console.log(chalk.yellow(pickMessage({ zh: '\n已取消操作', en: '\nCancelled' })));
    return;
  }

  const skill = listInstalledSkills().find((item) => item.skillId === skillId);
  if (!skill) {
    console.log(chalk.red(pickMessage({ zh: `未找到 ${skillId} 的本地记录`, en: `No local record for ${skillId}` })));
    return;
  }

  console.log(chalk.cyan(`\n${skill.skillId}`));
  for (const item of skill.installs) {
    const ver = item.version ? ` · ${item.version}` : '';
    console.log(chalk.gray(`  - ${formatInstallTitle(item.installPath)}${ver}`));
  }
  console.log();

  const action = await chooseAction(skill);
  if (!action) {
    console.log(chalk.yellow(pickMessage({ zh: '已取消操作', en: 'Cancelled' })));
    return;
  }

  if (action === 'update') {
    await update(skill.skillId, {});
    return;
  }

  if (action === 'delete') {
    await deleteLocalInstalls(skill);
    return;
  }

  await clearConfig(skill);
}
