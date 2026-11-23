import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import install from '../../cli/lib/commands/install.js';
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

  t.mock.method(os, 'homedir', () => path.join(parent, 'mock-home'));
  const fetch = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.match(url, /\/collections\/example$/);
    assert.equal(options.headers.Authorization, undefined);
    return Response.json(metadata);
  });
  await assert.rejects(install(undefined, { collection: 'example', dir: target }), /Invalid skill ID/);
  assert.equal(fetch.mock.callCount(), 1);
  assert.deepEqual(fs.readdirSync(target), []);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'keep');
});
