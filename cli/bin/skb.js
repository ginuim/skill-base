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

const program = new Command();

program
  .name('skb')
  .description('Skill Base CLI - Command line management tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize CLI configuration (set server URL)')
  .option('-s, --server <url>', 'Server URL (e.g., https://skill.example.com)')
  .action(init);

program
  .command('login')
  .description('Login to get access token')
  .action(login);

program
  .command('logout')
  .description('Logout and clear local credentials')
  .action(logout);

program
  .command('search <keyword>')
  .description('Search for Skills')
  .action(search);

program
  .command('install <target>')
  .description('Install a Skill (supports name@version format)')
  .option('-d, --dir <directory>', 'Target directory for extraction')
  .option('-i, --ide <ide>', 'Target IDE (cursor / copilot / windsurf / qoder / claude-code / qoderwork / opencode)')
  .option('-g, --global', 'Install to global IDE config directory', false)
  .action(install);

program
  .command('update <skill_id>')
  .description('Interactively select version and install directories to update')
  .option('-d, --dir <directory>', 'Explicit parent directory to update (bypass local install records)')
  .action(update);

program
  .command('list')
  .alias('ls')
  .description('Browse locally installed skills and update/delete/clear records')
  .action(installed);

program
  .command('publish [directory]')
  .description('Publish a new version (defaults to current directory, or specify a Skill folder)')
  .option('--name <name>', 'Skill name (defaults to extracting from SKILL.md)')
  .option('--description <desc>', 'Skill description (defaults to extracting from SKILL.md)')
  .option('--changelog <log>', 'Version changelog', 'Update version')
  .action(publish);

program.parse();
