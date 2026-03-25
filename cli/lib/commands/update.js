import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../api.js';
import { downloadAndExtract } from './install.js';

export default async function update(skillId, options) {
  const client = createClient();
  const targetDir = options?.dir || process.cwd();

  const spinner = ora(`Checking latest version of ${skillId}...`).start();

  try {
    // 获取 Skill 信息
    const skillInfo = await client.get(`/skills/${encodeURIComponent(skillId)}`);
    const latestVersion = skillInfo.latest_version;

    if (!latestVersion) {
      spinner.fail(chalk.red(`Skill ${skillId} has no available version`));
      process.exit(1);
    }

    spinner.text = `Downloading ${skillId}@${latestVersion}...`;

    // 直接下载最新版本（由于没有本地版本跟踪，每次都执行更新）
    const result = await downloadAndExtract(skillId, latestVersion, targetDir);
    spinner.succeed(chalk.green(`Updated ${result.skillId} to ${result.version}`));
  } catch (err) {
    spinner.fail(chalk.red(`Update failed: ${err.message}`));
    process.exit(1);
  }
}
