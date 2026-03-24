import chalk from 'chalk';
import { removeCredentials } from '../auth.js';

export default async function logout() {
  removeCredentials();
  console.log(chalk.green('✅ 已登出，本地凭证已清除'));
}
