import chalk from 'chalk';
import { removeCredentials } from '../auth.js';
import { pickMessage } from '../i18n.js';

const M = {
  done: {
    zh: '✅ 已登出，本地凭据已清除。',
    en: '✅ Logged out. Local credentials cleared.'
  }
};

export default async function logout() {
  removeCredentials();
  console.log(chalk.green(pickMessage(M.done)));
}
