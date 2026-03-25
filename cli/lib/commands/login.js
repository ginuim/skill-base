import chalk from 'chalk';
import ora from 'ora';
import prompts from 'prompts';
import { getConfig } from '../config.js';
import { saveCredentials } from '../auth.js';
import { createClient } from '../api.js';

export default async function login() {
  const { baseUrl } = getConfig();
  const client = createClient();

  console.log(chalk.cyan('\n📋 Login instructions:'));
  console.log(`   1. Open in your browser: ${chalk.underline(baseUrl + '/login?from=cli')}`);
  console.log('   2. Log in and get the CLI verification code');
  console.log('   3. Enter the code below\n');

  const response = await prompts({
    type: 'text',
    name: 'code',
    message: 'Enter the 8-character code (e.g. 8A2B-9C4F):',
    validate: value => {
      const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
      return pattern.test(value) ? true : 'Invalid code format. Please enter an 8-character code (e.g. 8A2B-9C4F)';
    }
  });

  // User cancelled
  if (!response.code) {
    console.log(chalk.yellow('\nLogin cancelled'));
    process.exit(0);
  }

  const spinner = ora('Verifying...').start();

  try {
    const result = await client.post('/auth/cli-code/verify', {
      code: response.code.toUpperCase()
    });

    if (result.ok && result.token && result.user) {
      saveCredentials({
        token: result.token,
        username: result.user.username
      });
      spinner.succeed(chalk.green(`Login successful. Logged in as: ${result.user.username}`));
    } else {
      spinner.fail(chalk.red('Verification failed. Please check the code.'));
      process.exit(1);
    }
  } catch (err) {
    spinner.fail(chalk.red(`Login failed: ${err.message}`));
    process.exit(1);
  }
}
