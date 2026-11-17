import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { assertSkillInstallId } from '../../cli/lib/install-archive.mjs';
import { registerDesktopHandlers } from '../../cli/lib/desktop-handlers.mjs';

test('install IDs cannot be filesystem paths', () => {
  for (const name of ['.', '..', '../..', 'a/b', 'a\\b', '/example', 'a%2Fb']) {
    assert.throws(() => assertSkillInstallId(name), /Invalid skill ID/);
  }
  assert.doesNotThrow(() => assertSkillInstallId('demo-skill_2'));
});

test('CLI and desktop reject invalid collection metadata before touching disk or downloading a ZIP', async (t) => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-install-path-'));
  t.after(() => fs.rmSync(parent, { recursive: true, force: true }));
  const target = path.join(parent, 'skills');
  fs.mkdirSync(target);
  const sentinel = path.join(parent, 'sentinel.txt');
  fs.writeFileSync(sentinel, 'keep');
  const metadata = { skills: [{ id: 'nested/name', latest_version: 'v1' }] };
  const { handlers } = registerDesktopHandlers({
    fetchCollectionDetail: async () => metadata,
    downloadCollectionZip: async () => assert.fail('must reject before downloading')
  }, '', {});
  await assert.rejects(handlers['collections:install']({
    collectionRef: 'example', overwrite: true, targets: [{ customDir: target }]
  }), /Invalid skill ID/);

  let downloads = 0;
  const server = http.createServer((request, response) => {
    if (request.url.endsWith('/download')) downloads++;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(metadata));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await assert.rejects(promisify(execFile)(process.execPath, [
    'cli/bin/skb.js', 'install', '--collection', 'example', '--dir', target
  ], { env: { ...process.env, SKB_BASE_URL: `http://127.0.0.1:${server.address().port}` } }), /Invalid skill ID/);
  assert.equal(downloads, 0);
  assert.deepEqual(fs.readdirSync(target), []);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
});
