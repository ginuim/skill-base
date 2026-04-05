import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../api.js';
import { pickMessage } from '../i18n.js';

const M = {
  searching: { zh: '正在搜索...', en: 'Searching...' },
  none: { zh: '未找到匹配的 Skill', en: 'No matching skills found' },
  found: { zh: '\n找到 ', en: '\nFound ' },
  skillsSuffix: { zh: ' 个 Skill:\n', en: ' skill(s):\n' },
  colId: { zh: 'ID', en: 'ID' },
  colName: { zh: '名称', en: 'Name' },
  colVersion: { zh: '版本', en: 'Version' },
  colDesc: { zh: '描述', en: 'Description' },
  searchFailed: { zh: '搜索失败: ', en: 'Search failed: ' }
};

export default async function search(keyword) {
  const client = createClient();
  const spinner = ora(pickMessage(M.searching)).start();

  try {
    const result = await client.get(`/skills?q=${encodeURIComponent(keyword)}`);
    spinner.stop();

    if (!result.skills || result.skills.length === 0) {
      console.log(chalk.yellow(pickMessage(M.none)));
      return;
    }

    const skills = result.skills;

    const idWidth = Math.max(4, ...skills.map((s) => s.id.length));
    const nameWidth = Math.max(
      pickMessage(M.colName).length,
      ...skills.map((s) => s.name.length)
    );
    const versionWidth = Math.max(
      pickMessage(M.colVersion).length,
      ...skills.map((s) => (s.latest_version || '-').length)
    );
    const descWidth = 40;

    const header = [
      pickMessage(M.colId).padEnd(idWidth),
      pickMessage(M.colName).padEnd(nameWidth),
      pickMessage(M.colVersion).padEnd(versionWidth),
      pickMessage(M.colDesc)
    ].join('  ');

    const separator = '-'.repeat(idWidth + nameWidth + versionWidth + descWidth + 6);

    const total = result.total || skills.length;
    console.log(chalk.cyan(`${pickMessage(M.found)}${total}${pickMessage(M.skillsSuffix)}`));
    console.log(chalk.bold(header));
    console.log(separator);

    for (const skill of skills) {
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
    spinner.fail(chalk.red(`${pickMessage(M.searchFailed)}${err.message}`));
    process.exit(1);
  }
}
