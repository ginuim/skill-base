import chalk from 'chalk';
import { removeCredentials } from '../auth.js';

export default async function logout() {
  removeCredentials();
  console.log(chalk.green('✅ Logged out. Local credentials cleared.'));
}
