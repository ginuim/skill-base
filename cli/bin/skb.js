#!/usr/bin/env node

import { Command } from 'commander';
import init from '../lib/commands/init.js';
import login from '../lib/commands/login.js';
import logout from '../lib/commands/logout.js';
import search from '../lib/commands/search.js';
import install from '../lib/commands/install.js';
import installed from '../lib/commands/installed.js';
import update from '../lib/commands/update.js';
import deleteCommand from '../lib/commands/delete.js';
import publish from '../lib/commands/publish.js';
import importGithub from '../lib/commands/import-github.js';
import ui from '../lib/commands/ui.js';
import whoami from '../lib/commands/whoami.js';
import * as configCmd from '../lib/commands/config.js';
import { loadProfiles } from '../lib/config.js';
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
  whoami: {
    zh: '检测本地是否已保存令牌，并向服务器校验当前登录是否有效',
    en: 'Check saved token and verify login with the server'
  },
  whoamiQuiet: {
    zh: '仅通过退出码表示结果，不向标准输出打印内容',
    en: 'Only exit code; no stdout'
  },
  whoamiJson: {
    zh: '输出 JSON（便于脚本）',
    en: 'Print JSON for scripts'
  },
  search: {
    zh: '搜索 Skills',
    en: 'Search for Skills'
  },
  install: {
    zh: '安装 Skill（支持 name@version）或集合（--collection）',
    en: 'Install a Skill (supports name@version) or a collection (--collection)'
  },
  installCollection: {
    zh: '安装集合内全部 Skill（集合 ID 或 slug）',
    en: 'Install all skills in a collection (collection id or slug)'
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
  delete: {
    zh: '删除本地已安装 Skill 的一个或多个目录',
    en: 'Delete one or more local install directories for a Skill'
  },
  deleteDir: {
    zh: '要删除的安装目录或父目录；可重复',
    en: 'Install directory or parent directory to delete; repeatable'
  },
  deleteAll: {
    zh: '删除该 Skill 的全部已记录安装目录',
    en: 'Delete all recorded install directories for this Skill'
  },
  deleteYes: {
    zh: '跳过确认提示',
    en: 'Skip confirmation prompt'
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
  publishIgnore: {
    zh: '额外忽略的路径规则（可重复，使用 .gitignore 语法）',
    en: 'Additional ignore pattern (repeatable, .gitignore syntax)'
  },
  publishNoGitignore: {
    zh: '不读取 Skill 根目录的 .gitignore',
    en: 'Do not read the Skill root .gitignore'
  },
  publishDryRun: {
    zh: '只列出实际打包和忽略的文件，不上传',
    en: 'List included and excluded files without uploading'
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
  },
  ui: {
    zh: '启动本地 Web 界面（默认仅监听 127.0.0.1，通过本地代理访问已配置的 Skill Base）',
    en: 'Start local Web UI (127.0.0.1 by default; proxies to your configured Skill Base)'
  },
  uiPort: {
    zh: '监听端口（默认 9847）',
    en: 'Listen port (default 9847)'
  },
  uiHost: {
    zh: '监听地址（默认 127.0.0.1；0.0.0.0 表示所有网卡，注意局域网暴露风险）',
    en: 'Bind address (default 127.0.0.1; 0.0.0.0 exposes on LAN — use with care)'
  },
  profile: {
    zh: '本次命令使用的配置名（也可用 SKB_PROFILE 环境变量）',
    en: 'Profile to use for this command (or SKB_PROFILE env var)'
  },
  config: {
    zh: '管理多环境配置（查看 / 添加 / 修改 / 切换 / 删除）',
    en: 'Manage environment profiles (list / show / add / set / use / remove)'
  },
  configList: { zh: '列出所有配置（* 为当前生效）', en: 'List all profiles (* = active)' },
  configShow: { zh: '查看配置详情（默认当前配置）', en: 'Show profile details (defaults to active)' },
  configAdd: { zh: '添加配置', en: 'Add a profile' },
  configAddUse: { zh: '添加后立即切换到该配置', en: 'Switch to the profile after adding' },
  configSet: { zh: '修改配置', en: 'Update a profile' },
  configSetRename: { zh: '重命名配置（登录凭据随之迁移）', en: 'Rename the profile (credentials move with it)' },
  configUse: { zh: '切换当前配置', en: 'Switch the current profile' },
  configRemove: { zh: '删除配置及其登录凭据', en: 'Remove a profile and its credentials' },
  json: { zh: '输出 JSON', en: 'Print JSON' },
  uiNoOpen: {
    zh: '不自动打开系统浏览器',
    en: 'Do not open the system browser'
  }
};

program
  .name('skb')
  .description(pickMessage(S.rootDesc))
  .version('1.0.0')
  .option('--profile <name>', pickMessage(S.profile))
  .hook('preAction', (thisCommand, actionCommand) => {
    const { profile } = thisCommand.opts();
    if (profile) process.env.SKB_PROFILE = profile;
    const selected = process.env.SKB_PROFILE;
    if (!selected) return;
    // Explicitly selected profile must exist, except when creating it via init/config
    const cmdPath = [];
    for (let c = actionCommand; c && c !== thisCommand; c = c.parent) cmdPath.unshift(c.name());
    if (cmdPath[0] === 'init' || cmdPath[0] === 'config') return;
    const { profiles } = loadProfiles();
    if (!profiles[selected]) {
      const names = Object.keys(profiles);
      console.error(
        pickMessage({ zh: '配置不存在: ', en: 'Profile not found: ' }) + selected +
        (names.length ? ` (${names.join(', ')})` : '')
      );
      process.exit(1);
    }
  });

const config = program
  .command('config')
  .description(pickMessage(S.config));

config
  .command('list')
  .alias('ls')
  .description(pickMessage(S.configList))
  .option('--json', pickMessage(S.json), false)
  .action((opts) => configCmd.list(opts));

config
  .command('show [name]')
  .description(pickMessage(S.configShow))
  .option('--json', pickMessage(S.json), false)
  .action((name, opts) => configCmd.show(name, opts));

config
  .command('add <name>')
  .description(pickMessage(S.configAdd))
  .requiredOption('-s, --server <url>', pickMessage(S.initServer))
  .option('--use', pickMessage(S.configAddUse), false)
  .action((name, opts) => configCmd.add(name, opts));

config
  .command('set <name>')
  .description(pickMessage(S.configSet))
  .option('-s, --server <url>', pickMessage(S.initServer))
  .option('--rename <new_name>', pickMessage(S.configSetRename))
  .action((name, opts) => configCmd.set(name, opts));

config
  .command('use <name>')
  .alias('switch')
  .description(pickMessage(S.configUse))
  .action((name) => configCmd.use(name));

config
  .command('remove <name>')
  .alias('rm')
  .description(pickMessage(S.configRemove))
  .option('-y, --yes', pickMessage(S.deleteYes), false)
  .action((name, opts) => configCmd.remove(name, opts));

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
  .command('whoami')
  .description(pickMessage(S.whoami))
  .option('-q, --quiet', pickMessage(S.whoamiQuiet), false)
  .option('--json', pickMessage(S.whoamiJson), false)
  .action((opts) => whoami(opts));

program
  .command('search <keyword>')
  .description(pickMessage(S.search))
  .action(search);

program
  .command('install [target]')
  .description(pickMessage(S.install))
  .option('-d, --dir <directory>', pickMessage(S.installDir))
  .option('-i, --ide <agent>', installIdeOptionDescription())
  .option('-a, --agent <agent>', installIdeOptionDescription())
  .option('-g, --global', pickMessage(S.installGlobal), false)
  .option('--collection <id_or_slug>', pickMessage(S.installCollection))
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
  .command('delete <skill_id>')
  .alias('rm')
  .description(pickMessage(S.delete))
  .option('-d, --dir <directory>', pickMessage(S.deleteDir), (value, previous) => {
    previous.push(value);
    return previous;
  }, [])
  .option('--all', pickMessage(S.deleteAll), false)
  .option('-y, --yes', pickMessage(S.deleteYes), false)
  .action(deleteCommand);

program
  .command('publish [directory]')
  .description(pickMessage(S.publish))
  .option('--name <name>', pickMessage(S.publishName))
  .option('--description <desc>', pickMessage(S.publishDesc))
  .option('--changelog <log>', pickMessage(S.publishChangelog), pickMessage({ zh: '更新版本', en: 'Update version' }))
  .option('--ignore <pattern>', pickMessage(S.publishIgnore), (value, previous) => [...previous, value], [])
  .option('--no-gitignore', pickMessage(S.publishNoGitignore))
  .option('--dry-run', pickMessage(S.publishDryRun))
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

program
  .command('ui')
  .description(pickMessage(S.ui))
  .option('-p, --port <port>', pickMessage(S.uiPort), '9847')
  .option('--host <address>', pickMessage(S.uiHost), '127.0.0.1')
  .option('--no-open', pickMessage(S.uiNoOpen), false)
  .action((opts) => ui(opts));

program.parse();
