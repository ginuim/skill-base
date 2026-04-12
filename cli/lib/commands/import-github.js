import chalk from 'chalk';
import { loadCredentials } from '../auth.js';
import { createClient } from '../api.js';
import { pickMessage } from '../i18n.js';

export default async function importGithub(source, options) {
  const credentials = loadCredentials();
  if (!credentials?.token) {
    console.log(chalk.red(pickMessage({ zh: '❌ 请先登录: skb login', en: '❌ Please login first: skb login' })));
    process.exit(1);
  }

  const src = String(source || '').trim();
  if (!src) {
    console.log(chalk.red(pickMessage({ zh: '❌ 请提供仓库 URL 或 owner/repo', en: '❌ Pass a repo URL or owner/repo' })));
    process.exit(1);
  }

  const client = createClient();
  const previewBody = { source: src };
  if (options.ref) previewBody.ref = options.ref;
  if (options.subpath) previewBody.subpath = options.subpath;

  let preview;
  try {
    preview = await client.post('/skills/import/github/preview', previewBody);
  } catch (err) {
    console.log(chalk.red(pickMessage({ zh: '❌ 预览失败: ', en: '❌ Preview failed: ' }) + err.message));
    process.exit(1);
  }

  if (options.dryRun) {
    console.log(chalk.cyan(JSON.stringify(preview, null, 2)));
    return;
  }

  let target = options.target != null && String(options.target).trim() !== '' ? String(options.target).trim() : null;
  if (!target) {
    target = preview.conflict ? preview.suggested_skill_id : preview.default_skill_id;
  }

  console.log(
    chalk.cyan(
      pickMessage({
        zh: `📥 导入目标 Skill ID: ${target}（仓库 ${preview.repo.owner}/${preview.repo.repo}）`,
        en: `📥 Import target skill id: ${target} (repo ${preview.repo.owner}/${preview.repo.repo})`
      })
    )
  );
  if (preview.conflict) {
    console.log(
      chalk.yellow(
        pickMessage({
          zh: `⚠ 默认 ID「${preview.default_skill_id}」无发布权限，已改用或请使用 --target`,
          en: `⚠ No publish access for default id "${preview.default_skill_id}"; using suggested or --target`
        })
      )
    );
  }

  const importBody = {
    source: src,
    target_skill_id: target,
    ...(options.ref ? { ref: options.ref } : {}),
    ...(options.subpath ? { subpath: options.subpath } : {}),
    ...(options.changelog ? { changelog: options.changelog } : {})
  };

  try {
    const result = await client.post('/skills/import/github', importBody);
    if (result.ok) {
      console.log(
        chalk.green(
          pickMessage({
            zh: `✅ 导入成功：${result.skill_id} 版本 ${result.version}`,
            en: `✅ Imported: ${result.skill_id} version ${result.version}`
          })
        )
      );
    }
  } catch (err) {
    console.log(chalk.red(pickMessage({ zh: '❌ 导入失败: ', en: '❌ Import failed: ' }) + err.message));
    process.exit(1);
  }
}
