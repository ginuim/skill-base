import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { getConfig } from '../config.js';
import { saveCredentials } from '../auth.js';
import { createClient } from '../api.js';
import { pickMessage } from '../i18n.js';

const M = {
  instructions: { zh: '\n📋 登录说明:', en: '\n📋 Login instructions:' },
  step1: { zh: '   1. 在浏览器中打开: ', en: '   1. Open in your browser: ' },
  step2: { zh: '   2. 登录并获取 CLI 验证码', en: '   2. Log in and get the CLI verification code' },
  step3: { zh: '   3. 在下方输入验证码\n', en: '   3. Enter the code below\n' },
  promptCode: {
    zh: '输入 8 位验证码（例如 8A2B-9C4F）:',
    en: 'Enter the 8-character code (e.g. 8A2B-9C4F):'
  },
  invalidCode: {
    zh: '验证码格式无效。请输入 8 位字符（例如 8A2B-9C4F）',
    en: 'Invalid code format. Please enter an 8-character code (e.g. 8A2B-9C4F)'
  },
  cancelled: { zh: '\n已取消登录', en: '\nLogin cancelled' },
  verifying: { zh: '正在验证...', en: 'Verifying...' },
  success: { zh: '登录成功。当前用户: ', en: 'Login successful. Logged in as: ' },
  verifyFailed: { zh: '验证失败，请检查验证码。', en: 'Verification failed. Please check the code.' },
  loginFailed: { zh: '登录失败: ', en: 'Login failed: ' }
};

export default async function login() {
  const { baseUrl } = getConfig();
  const client = createClient();

  console.log(chalk.cyan(pickMessage(M.instructions)));
  console.log(`${pickMessage(M.step1)}${chalk.underline(baseUrl + '/login?from=cli')}`);
  console.log(pickMessage(M.step2));
  console.log(pickMessage(M.step3));

  const response = await prompts({
    type: 'text',
    name: 'code',
    message: pickMessage(M.promptCode),
    validate: (value) => {
      const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
      return pattern.test(value) ? true : pickMessage(M.invalidCode);
    }
  });

  if (!response.code) {
    console.log(chalk.yellow(pickMessage(M.cancelled)));
    process.exit(0);
  }

  const spinner = ora(pickMessage(M.verifying)).start();

  try {
    const result = await client.post('/auth/cli-code/verify', {
      code: response.code.toUpperCase()
    });

    if (result.ok && result.token && result.user) {
      saveCredentials({
        token: result.token,
        username: result.user.username
      });
      spinner.succeed(chalk.green(`${pickMessage(M.success)}${result.user.username}`));
    } else {
      spinner.fail(chalk.red(pickMessage(M.verifyFailed)));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red(`${pickMessage(M.loginFailed)}${err.message}`));
    process.exit(1);
  }
}
