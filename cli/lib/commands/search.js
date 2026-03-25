import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../api.js';

export default async function search(keyword) {
  const client = createClient();
  const spinner = ora('Searching...').start();

  try {
    const result = await client.get(`/skills?q=${encodeURIComponent(keyword)}`);
    spinner.stop();

    if (!result.skills || result.skills.length === 0) {
      console.log(chalk.yellow('No matching skills found'));
      return;
    }

    // 表格展示
    const skills = result.skills;
    
    // 计算列宽
    const idWidth = Math.max(4, ...skills.map(s => s.id.length));
    const nameWidth = Math.max(6, ...skills.map(s => s.name.length));
    const versionWidth = Math.max(8, ...skills.map(s => (s.latest_version || '-').length));
    const descWidth = 40;

    // 表头
    const header = [
      'ID'.padEnd(idWidth),
      'Name'.padEnd(nameWidth),
      'Version'.padEnd(versionWidth),
      'Description'
    ].join('  ');

    const separator = '-'.repeat(idWidth + nameWidth + versionWidth + descWidth + 6);

    console.log(chalk.cyan(`\nFound ${result.total || skills.length} skill(s):\n`));
    console.log(chalk.bold(header));
    console.log(separator);

    for (const skill of skills) {
      // 截断描述到 40 字符
      let desc = skill.description || '';
      if (desc.length > descWidth) {
        desc = desc.slice(0, descWidth - 3) + '...';
      }

      const row = [
        skill.id.padEnd(idWidth),
        skill.name.padEnd(nameWidth),
        (skill.latest_version || '-').padEnd(versionWidth),
        desc
      ].join('  ');

      console.log(row);
    }

    console.log('');
  } catch (err) {
    spinner.fail(chalk.red(`Search failed: ${err.message}`));
    process.exit(1);
  }
}
