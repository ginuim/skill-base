import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { extractCollectionZip } from '../../cli/lib/download-collection.mjs';
import { readZipResponse } from '../../cli/lib/install-archive.mjs';

test('rejects incomplete or mismatched collections before changing any installed files', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-verified-install-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const installed = path.join(dir, 'demo', 'SKILL.md');
  fs.mkdirSync(path.dirname(installed));
  fs.writeFileSync(installed, '# Current');
  const zip = new AdmZip();
  zip.addFile('demo/SKILL.md', Buffer.from('# New'));
  zip.addFile('unexpected/SKILL.md', Buffer.from('# Extra'));
  await assert.rejects(() => extractCollectionZip(zip.toBuffer(), dir, ['demo']), /does not match/);
  assert.equal(fs.readFileSync(installed, 'utf8'), '# Current');
  assert.deepEqual(fs.readdirSync(dir), ['demo']);
  zip.deleteFile('unexpected/SKILL.md');
  await extractCollectionZip(zip.toBuffer(), dir, ['demo']);
  assert.equal(fs.readFileSync(installed, 'utf8'), '# New');
});

test('counts download bytes without a Content-Length header and verifies advertised digests', async () => {
  await assert.rejects(() => readZipResponse(new Response('five!'), 4), /size limit/);
  await assert.rejects(() => readZipResponse(new Response('package', {
    headers: { 'Content-Digest': 'sha-256=:invalid:' }
  }), 1024), /integrity/);
});

test('a failed collection swap restores all previously installed directories', async (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-install-rollback-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const zip = new AdmZip();
  const ids = ['alpha', 'beta'];
  for (const id of ids) {
    fs.mkdirSync(path.join(dir, id));
    fs.writeFileSync(path.join(dir, id, 'SKILL.md'), `# Old ${id}`);
    zip.addFile(`${id}/SKILL.md`, Buffer.from(`# New ${id}`));
  }

  const rename = fs.renameSync;
  t.mock.method(fs, 'renameSync', (from, to) => {
    if (path.basename(from) === 'new-1' && to === path.join(dir, 'beta')) {
      throw new Error('simulated write error');
    }
    rename(from, to);
  });
  await assert.rejects(extractCollectionZip(zip.toBuffer(), dir, ids), /simulated write error/);
  for (const id of ids) {
    assert.equal(fs.readFileSync(path.join(dir, id, 'SKILL.md'), 'utf8'), `# Old ${id}`);
  }
  assert.deepEqual(fs.readdirSync(dir).sort(), ids);
});
