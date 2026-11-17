import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { zipDirectory } from '../../cli/lib/commands/publish.js';

test('CLI publication writes a standard ZIP containing only the selected skill files', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-publish-archive-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '# Example');
  fs.writeFileSync(path.join(dir, 'ignored.txt'), 'ignored');
  const output = path.join(dir, 'skill.zip');
  const bytes = await zipDirectory(dir, output, 'example', ['SKILL.md']);
  assert.equal(bytes, fs.statSync(output).size);
  const zip = new AdmZip(output);
  assert.deepEqual(zip.getEntries().map((entry) => entry.entryName), ['example/SKILL.md']);
  assert.equal(zip.readAsText('example/SKILL.md'), '# Example');
});
