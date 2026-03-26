#!/usr/bin/env node

import { Command } from 'commander';
import login from '../lib/commands/login.js';
import logout from '../lib/commands/logout.js';
import search from '../lib/commands/search.js';
import install from '../lib/commands/install.js';
import update from '../lib/commands/update.js';
import publish from '../lib/commands/publish.js';

const program = new Command();

program
  .name('skb')
  .description('Skill Base CLI - 命令行管理工具')
  .version('1.0.0');

program
  .command('login')
  .description('登录获取访问令牌')
  .action(login);

program
  .command('logout')
  .description('登出并清除本地凭证')
  .action(logout);

program
  .command('search <keyword>')
  .description('搜索 Skill')
  .action(search);

program
  .command('install <target>')
  .description('安装 Skill（支持 name@version 格式）')
  .option('-d, --dir <directory>', '指定解压目标目录')
  .option('-i, --ide <ide>', '目标 IDE（cursor / copilot / windsurf / qoder / claude-code / qoderwork / opencode）')
  .option('-g, --global', '安装到全局 IDE 配置目录', false)
  .action(install);

program
  .command('update <skill_id>')
  .description('更新 Skill 到最新版本')
  .option('-d, --dir <directory>', '指定解压目标目录', process.cwd())
  .action(update);

program
  .command('publish <directory>')
  .description('发布新版本（指定 Skill 文件夹）')
  .option('--name <name>', 'Skill 名称（默认从 SKILL.md 提取）')
  .option('--description <desc>', 'Skill 描述（默认从 SKILL.md 提取）')
  .option('--changelog <log>', '版本变更日志', '更新版本')
  .action(publish);

program.parse();
