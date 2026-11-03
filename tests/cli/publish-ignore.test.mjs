import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listPublishFiles } from '../../cli/lib/publish-ignore.js';

test('publish manifest follows root ignore files and keeps agent configuration by default', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-publish-ignore-'));
  try {
    fs.mkdirSync(path.join(dir, '.cursor'));
    fs.mkdirSync(path.join(dir, '.codebuddy'));
    fs.mkdirSync(path.join(dir, 'node_modules'));
    fs.mkdirSync(path.join(dir, 'private'));
    for (const name of ['SKILL.md', '.gitignore', '.skillbaseignore', '.cursor/rule.md', '.codebuddy/rule.md', 'node_modules/index.js', 'private/secret.txt', 'debug.log']) {
      fs.writeFileSync(path.join(dir, name), name);
    }
    fs.writeFileSync(path.join(dir, '.gitignore'), 'node_modules/\n*.log\n');
    fs.writeFileSync(path.join(dir, '.skillbaseignore'), 'private/\n');
    const result = listPublishFiles(dir);
    assert.deepEqual(result.included, ['.codebuddy/rule.md', '.cursor/rule.md', '.skillbaseignore', 'SKILL.md']);
    assert.ok(result.excluded.includes('node_modules/'));
    assert.ok(result.excluded.includes('private/'));
    assert.ok(result.excluded.includes('debug.log'));
    const withoutGitignore = listPublishFiles(dir, { useGitignore: false, extra: ['.cursor/'] });
    assert.ok(withoutGitignore.included.includes('debug.log'));
    assert.ok(withoutGitignore.excluded.includes('.cursor/'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
