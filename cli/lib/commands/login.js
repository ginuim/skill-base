import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { getConfig } from '../config.js';
import { saveCredentials } from '../auth.js';
import { createClient } from '../api.js';

export default async function login() {
  const { baseUrl } = getConfig();
  const client = createClient();

  console.log(chalk.cyan('\n📋 登录指引：'));
  console.log(`   1. 在浏览器中打开 ${chalk.underline(baseUrl + '/login?from=cli')}`);
  console.log('   2. 登录后获取 CLI 验证码');
  console.log('   3. 在下方输入验证码\n');

  const response = await prompts({
    type: 'text',
    name: 'code',
    message: '请输入 8 位验证码（如 8A2B-9C4F）:',
    validate: value => {
      const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
      return pattern.test(value) ? true : '验证码格式错误，请输入 8 位验证码（如 8A2B-9C4F）';
    }
  });

  // 用户取消输入
  if (!response.code) {
    console.log(chalk.yellow('\n已取消登录'));
    process.exit(0);
  }

  const spinner = ora('正在验证...').start();

  try {
    const result = await client.post('/auth/cli-code/verify', {
      code: response.code.toUpperCase()
    });

    if (result.ok && result.token && result.user) {
      saveCredentials({
        token: result.token,
        username: result.user.username
      });
      spinner.succeed(chalk.green(`登录成功，当前账号：${result.user.username}`));
    } else {
      spinner.fail(chalk.red('验证失败，请检查验证码是否正确'));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red(`登录失败：${err.message}`));
    process.exit(1);
  }
}
