import chalk from 'chalk';
import { saveConfig, getConfig, loadSavedConfig } from '../config.js';
import { pickMessage } from '../i18n.js';

const M = {
  serverConfigured: { zh: '✓ 已配置服务器: ', en: '✓ Server configured: ' },
  currentConfig: { zh: '当前配置:', en: 'Current configuration:' },
  server: { zh: '  服务器: ', en: '  Server: ' },
  savedInConfig: { zh: '  （已保存在配置中）', en: '  (saved in config)' },
  fromEnv: { zh: '  （来自 SKB_BASE_URL 环境变量）', en: '  (from SKB_BASE_URL env var)' },
  default: { zh: '  （默认值）', en: '  (default)' },
  hintSet: { zh: '设置服务器: skb init --server <url>', en: 'To set server: skb init --server <url>' },
  hintExample: { zh: '示例: skb init --server https://skill.example.com', en: 'Example: skb init --server https://skill.example.com' }
};

export default async function init(options) {
  const { server } = options;

  if (server) {
    const normalizedUrl = server.replace(/\/+$/, '');
    saveConfig({ baseUrl: normalizedUrl });
    console.log(chalk.green(`${pickMessage(M.serverConfigured)}${normalizedUrl}`));
  } else {
    const saved = loadSavedConfig();
    const current = getConfig();

    console.log(chalk.cyan(pickMessage(M.currentConfig)));
    console.log(chalk.gray(`${pickMessage(M.server)}${current.baseUrl}`));
    if (saved.baseUrl) {
      console.log(chalk.gray(pickMessage(M.savedInConfig)));
    } else if (process.env.SKB_BASE_URL) {
      console.log(chalk.gray(pickMessage(M.fromEnv)));
    } else {
      console.log(chalk.gray(pickMessage(M.default)));
    }
    console.log();
    console.log(chalk.gray(pickMessage(M.hintSet)));
    console.log(chalk.gray(pickMessage(M.hintExample)));
  }
}
