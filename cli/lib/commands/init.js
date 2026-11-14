import chalk from 'chalk';
import { getConfig, loadProfiles, saveProfiles, normalizeBaseUrl } from '../config.js';
import { pickMessage } from '../i18n.js';

const M = {
  serverConfigured: { zh: '✓ 已配置服务器: ', en: '✓ Server configured: ' },
  currentConfig: { zh: '当前配置:', en: 'Current configuration:' },
  profile: { zh: '  配置: ', en: '  Profile: ' },
  server: { zh: '  服务器: ', en: '  Server: ' },
  savedInConfig: { zh: '  （已保存在配置中）', en: '  (saved in config)' },
  fromEnv: { zh: '  （来自 SKB_BASE_URL 环境变量）', en: '  (from SKB_BASE_URL env var)' },
  default: { zh: '  （默认值）', en: '  (default)' },
  hintSet: { zh: '设置服务器: skb init --server <url>', en: 'To set server: skb init --server <url>' },
  hintExample: { zh: '示例: skb init --server https://skill.example.com', en: 'Example: skb init --server https://skill.example.com' },
  hintProfiles: { zh: '多环境管理: skb config --help', en: 'Multiple environments: skb config --help' }
};

export default async function init(options) {
  const { server } = options;

  if (server) {
    const normalizedUrl = normalizeBaseUrl(server);
    const { profile } = getConfig();
    const state = loadProfiles();
    state.profiles[profile] = { ...state.profiles[profile], baseUrl: normalizedUrl };
    if (!state.currentProfile) state.currentProfile = profile;
    saveProfiles(state);
    console.log(chalk.green(`${pickMessage(M.serverConfigured)}${normalizedUrl} (${profile})`));
  } else {
    const current = getConfig();

    console.log(chalk.cyan(pickMessage(M.currentConfig)));
    console.log(chalk.gray(`${pickMessage(M.profile)}${current.profile}`));
    console.log(chalk.gray(`${pickMessage(M.server)}${current.baseUrl}`));
    if (process.env.SKB_BASE_URL) {
      console.log(chalk.gray(pickMessage(M.fromEnv)));
    } else if (current.profileExists) {
      console.log(chalk.gray(pickMessage(M.savedInConfig)));
    } else {
      console.log(chalk.gray(pickMessage(M.default)));
    }
    console.log();
    console.log(chalk.gray(pickMessage(M.hintSet)));
    console.log(chalk.gray(pickMessage(M.hintExample)));
    console.log(chalk.gray(pickMessage(M.hintProfiles)));
  }
}
