#!/usr/bin/env node

import { Command } from 'commander';
import init from '../lib/commands/init.js';
import login from '../lib/commands/login.js';
import logout from '../lib/commands/logout.js';
import search from '../lib/commands/search.js';
import install from '../lib/commands/install.js';
import installed from '../lib/commands/installed.js';
import update from '../lib/commands/update.js';
import publish from '../lib/commands/publish.js';
import importGithub from '../lib/commands/import-github.js';
import { pickMessage } from '../lib/i18n.js';
import { getSupportedIdeIds } from '../lib/ide.js';

const program = new Command();

function installIdeOptionDescription() {
  const ids = getSupportedIdeIds().join(' / ');
  return pickMessage({
    zh: `目标 Agent（${ids}）`,
    en: `Target Agent (${ids})`
  });
}

const S = {
  rootDesc: {
    zh: 'Skill Base CLI — 命令行管理工具',
    en: 'Skill Base CLI — command-line management tool'
  },
  init: {
    zh: '初始化 CLI 配置（设置服务器 URL）',
    en: 'Initialize CLI configuration (set server URL)'
  },
  initServer: {
    zh: '服务器 URL（例如 https://skill.example.com）',
    en: 'Server URL (e.g. https://skill.example.com)'
  },
  login: {
    zh: '登录以获取访问令牌',
    en: 'Log in to obtain an access token'
  },
  logout: {
    zh: '登出并清除本地凭据',
    en: 'Log out and clear local credentials'
  },
  search: {
    zh: '搜索 Skills',
    en: 'Search for Skills'
  },
  install: {
    zh: '安装 Skill（支持 name@version）',
    en: 'Install a Skill (supports name@version)'
  },
  installDir: {
    zh: '解压到的目标目录',
    en: 'Target directory for extraction'
  },
  installGlobal: {
    zh: '安装到全局 Agent 配置目录',
    en: 'Install to global Agent config directory'
  },
  update: {
    zh: '交互式选择版本与安装目录以更新',
    en: 'Interactively select version and install directories to update'
  },
  updateDir: {
    zh: '要更新的父目录（跳过本地安装记录）',
    en: 'Explicit parent directory to update (bypass local install records)'
  },
  list: {
    zh: '浏览本地已安装的 skill，并更新/删除/清除记录',
    en: 'Browse locally installed skills and update/delete/clear records'
  },
  publish: {
    zh: '发布新版本（默认当前目录，或可指定 Skill 文件夹）',
    en: 'Publish a new version (defaults to cwd, or pass a Skill folder)'
  },
  publishName: {
    zh: 'Skill 名称（默认从 SKILL.md 解析）',
    en: 'Skill name (defaults to parsing from SKILL.md)'
  },
  publishDesc: {
    zh: 'Skill 描述（默认从 SKILL.md 解析）',
    en: 'Skill description (defaults to parsing from SKILL.md)'
  },
  publishChangelog: {
    zh: '版本更新说明',
    en: 'Version changelog'
  },
  importGithub: {
    zh: '从公开 GitHub 仓库导入 Skill 到当前 Skill Base（服务端拉取 zipball）',
    en: 'Import a skill from a public GitHub repo into this Skill Base (server downloads zipball)'
  },
  importGithubRef: {
    zh: '分支或 tag（默认仓库默认分支）',
    en: 'Branch or tag (default: repo default branch)'
  },
  importGithubSubpath: {
    zh: '仓库内子目录（monorepo）',
    en: 'Path inside the repo (monorepo)'
  },
  importGithubTarget: {
    zh: '本站上的目标 skill id（默认用预览推导，冲突时用建议 gh-owner-repo）',
    en: 'Target skill id on server (default from preview; on conflict uses suggested gh-owner-repo)'
  },
  importGithubDryRun: {
    zh: '仅打印预览 JSON，不发布',
    en: 'Print preview JSON only, do not publish'
  }
};

program
  .name('skb')
  .description(pickMessage(S.rootDesc))
  .version('1.0.0');

program
  .command('init')
  .description(pickMessage(S.init))
  .option('-s, --server <url>', pickMessage(S.initServer))
  .action(init);

program
  .command('login')
  .description(pickMessage(S.login))
  .action(login);

program
  .command('logout')
  .description(pickMessage(S.logout))
  .action(logout);

program
  .command('search <keyword>')
  .description(pickMessage(S.search))
  .action(search);

program
  .command('install <target>')
  .description(pickMessage(S.install))
  .option('-d, --dir <directory>', pickMessage(S.installDir))
  .option('-i, --ide <agent>', installIdeOptionDescription())
  .option('-a, --agent <agent>', installIdeOptionDescription())
  .option('-g, --global', pickMessage(S.installGlobal), false)
  .action((target, options) => {
    // Alias --agent to --ide
    if (options.agent) options.ide = options.agent;
    return install(target, options);
  });

program
  .command('update <skill_id>')
  .description(pickMessage(S.update))
  .option('-d, --dir <directory>', pickMessage(S.updateDir))
  .action(update);

program
  .command('list')
  .alias('ls')
  .description(pickMessage(S.list))
  .action(installed);

program
  .command('publish [directory]')
  .description(pickMessage(S.publish))
  .option('--name <name>', pickMessage(S.publishName))
  .option('--description <desc>', pickMessage(S.publishDesc))
  .option('--changelog <log>', pickMessage(S.publishChangelog), pickMessage({ zh: '更新版本', en: 'Update version' }))
  .action(publish);

program
  .command('import-github <source>')
  .alias('import')
  .description(pickMessage(S.importGithub))
  .option('--ref <ref>', pickMessage(S.importGithubRef))
  .option('--subpath <path>', pickMessage(S.importGithubSubpath))
  .option('--target <skill_id>', pickMessage(S.importGithubTarget))
  .option('--changelog <text>', pickMessage(S.publishChangelog))
  .option('--dry-run', pickMessage(S.importGithubDryRun), false)
  .action(importGithub);

program.parse();
