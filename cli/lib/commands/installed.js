import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import prompts from 'prompts';
import update from './update.js';
import {
  clearSkillInstalls,
  listInstalledSkills,
  pruneAllMissingInstalls,
  removeSkillInstall,
} from '../installs.js';

function formatTime(value) {
  if (!value) return '未知时间';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function formatInstallTitle(installPath) {
  return path.relative(process.cwd(), installPath) || installPath;
}

function ensureSafeSkillPath(skillId, installPath) {
  return path.basename(installPath) === skillId;
}

async function chooseSkill(skills) {
  const answer = await prompts({
    type: 'select',
    name: 'skillId',
    message: '选择本地已安装的 Skill',
    choices: skills.map((item) => ({
      title: item.skillId,
      description: `${item.installCount} 个目录 · 最近记录 ${formatTime(item.latestInstalledAt)}`,
      value: item.skillId,
    })),
  });

  return answer.skillId;
}

async function chooseAction(skill) {
  const answer = await prompts({
    type: 'select',
    name: 'action',
    message: `选择对 ${skill.skillId} 的操作`,
    choices: [
      { title: '更新', description: '查看版本并更新一个或多个安装目录', value: 'update' },
      { title: '删除本地文件', description: '删除选中的安装目录，并同步清理记录', value: 'delete' },
      { title: '清除配置记录', description: '只清掉本地记录，不删除任何文件', value: 'clear-config' },
    ],
  });

  return answer.action;
}

async function deleteLocalInstalls(skill) {
  const answer = await prompts([
    {
      type: 'multiselect',
      name: 'installPaths',
      message: `选择要删除的 ${skill.skillId} 目录`,
      instructions: false,
      choices: [
        { title: `全部目录（${skill.installs.length} 个）`, value: '__all__' },
        ...skill.installs.map((item) => ({
          title: formatInstallTitle(item.installPath),
          description: [
            item.version ? `当前版本 ${item.version}` : '当前版本未知',
            item.ide ? `IDE: ${item.ide}` : '',
            item.installedAt ? `记录时间 ${formatTime(item.installedAt)}` : '',
          ].filter(Boolean).join(' · '),
          value: item.installPath,
        })),
      ],
    },
    {
      type: (prev) => {
        if (!prev || prev.length === 0) return null;
        return 'confirm';
      },
      name: 'confirm',
      message: '确认删除选中的本地 Skill 目录？此操作不可撤销',
      initial: false,
    },
  ]);

  if (!answer.installPaths) {
    console.log(chalk.yellow('\n已取消操作'));
    return;
  }

  const selectedInstalls = answer.installPaths.includes('__all__')
    ? skill.installs
    : skill.installs.filter((item) => answer.installPaths.includes(item.installPath));

  if (selectedInstalls.length === 0) {
    console.log(chalk.yellow('未选择任何目录，已取消删除'));
    return;
  }

  if (!answer.confirm) {
    console.log(chalk.yellow('已取消删除'));
    return;
  }

  const deleted = [];
  const skipped = [];

  for (const item of selectedInstalls) {
    if (!ensureSafeSkillPath(skill.skillId, item.installPath)) {
      skipped.push(`${formatInstallTitle(item.installPath)}（路径校验失败）`);
      continue;
    }

    if (fs.existsSync(item.installPath)) {
      fs.rmSync(item.installPath, { recursive: true, force: true });
    }
    removeSkillInstall(skill.skillId, item.installPath);
    deleted.push(formatInstallTitle(item.installPath));
  }

  if (deleted.length > 0) {
    console.log(chalk.green(`已删除 ${deleted.length} 个目录：`));
    for (const item of deleted) {
      console.log(chalk.gray(`  - ${item}`));
    }
  }

  if (skipped.length > 0) {
    console.log(chalk.yellow('以下目录未删除：'));
    for (const item of skipped) {
      console.log(chalk.gray(`  - ${item}`));
    }
  }
}

async function clearConfig(skill) {
  const answer = await prompts({
    type: 'confirm',
    name: 'confirm',
    message: `确认清除 ${skill.skillId} 的本地配置记录？不会删除磁盘文件`,
    initial: false,
  });

  if (!answer.confirm) {
    console.log(chalk.yellow('已取消清除配置'));
    return;
  }

  clearSkillInstalls(skill.skillId);
  console.log(chalk.green(`已清除 ${skill.skillId} 的本地配置记录`));
}

export default async function installed() {
  const skills = pruneAllMissingInstalls();

  if (skills.length === 0) {
    console.log(chalk.yellow('当前没有记录到任何通过 skb 安装的 Skill'));
    return;
  }

  const skillId = await chooseSkill(skills);
  if (!skillId) {
    console.log(chalk.yellow('\n已取消操作'));
    return;
  }

  const skill = listInstalledSkills().find((item) => item.skillId === skillId);
  if (!skill) {
    console.log(chalk.red(`未找到 ${skillId} 的本地记录`));
    return;
  }

  console.log(chalk.cyan(`\n${skill.skillId}`));
  for (const item of skill.installs) {
    console.log(chalk.gray(`  - ${formatInstallTitle(item.installPath)}${item.version ? ` · ${item.version}` : ''}`));
  }
  console.log();

  const action = await chooseAction(skill);
  if (!action) {
    console.log(chalk.yellow('已取消操作'));
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
