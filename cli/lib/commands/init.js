import chalk from 'chalk';
import { saveConfig, getConfig, loadSavedConfig } from '../config.js';

export default async function init(options) {
  const { server } = options;
  
  if (server) {
    // Normalize: remove trailing slashes
    const normalizedUrl = server.replace(/\/+$/, '');
    saveConfig({ baseUrl: normalizedUrl });
    console.log(chalk.green(`✓ Server configured: ${normalizedUrl}`));
  } else {
    // Show current config
    const saved = loadSavedConfig();
    const current = getConfig();
    
    console.log(chalk.cyan('Current configuration:'));
    console.log(chalk.gray(`  Server: ${current.baseUrl}`));
    if (saved.baseUrl) {
      console.log(chalk.gray(`  (saved in config)`));
    } else if (process.env.SKB_BASE_URL) {
      console.log(chalk.gray(`  (from SKB_BASE_URL env var)`));
    } else {
      console.log(chalk.gray(`  (default)`));
    }
    console.log();
    console.log(chalk.gray('To set server: skb init --server <url>'));
    console.log(chalk.gray('Example: skb init --server https://skill.example.com'));
  }
}
