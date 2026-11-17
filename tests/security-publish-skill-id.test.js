const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const AdmZip = require('adm-zip');
const { securityFixture } = require('./helpers/security-fixture');

test('HTTP rejects unsafe skill IDs without writing any files and accepts an ordinary ID', async (t) => {
  const { app, post, token } = await securityFixture(t);
  const { userId } = (await post('/init/setup', {
    username: 'local-admin', password: 'local-test-password', setup_token: token
  })).json();
  const cookie = 'session_id=' + app.createSession(userId);
  const { dataDir, tempDir } = app.fixture;
  const sentinel = path.join(tempDir, 'untouched.txt');
  fs.writeFileSync(sentinel, 'untouched');
  const directories = () => fs.readdirSync(tempDir, { recursive: true }).sort();
  const before = directories();
  const zip = new AdmZip();
  zip.addFile('SKILL.md', Buffer.from('# Example'));
  const buffer = zip.toBuffer();
  const publish = async (id, file = buffer) => {
    const body = new FormData();
    body.set('skill_id', id);
    body.set('name', 'Example');
    body.set('zip_file', new Blob([file]), 'skill.zip');
    const request = new Request('http://localhost', { method: 'POST', body });
    return post('/skills/publish', Buffer.from(await request.arrayBuffer()), {
      cookie, 'content-type': request.headers.get('content-type')
    });
  };

  for (const id of ['.', '..', 'two/parts', 'two\\parts', '%2F', 'blank space', 'with\u0000null', 'demo.zip', 'CON', 'x'.repeat(201)]) {
    assert.equal((await publish(id)).statusCode, 400, JSON.stringify(id));
  }
  assert.equal((await publish('example', Buffer.from('not an archive'))).statusCode, 400);
  assert.deepEqual(directories(), before);
  assert.equal(app.db.prepare('SELECT count(*) AS total FROM skills').get().total, 0);
  const result = await publish('example_1');
  assert.equal(result.statusCode, 200);
  assert.deepEqual(fs.readdirSync(dataDir, { recursive: true }).sort(), [
    'skills', 'skills/example_1', `skills/example_1/${result.json().version}.zip`
  ]);
  assert.equal(fs.readFileSync(sentinel, 'utf8'), 'untouched');
  assert.deepEqual(directories().filter((file) => !file.startsWith('data/')), before);
  const download = await app.inject(`/api/v1/skills/example_1/versions/${result.json().version}/download`);
  assert.equal(download.headers['content-digest'], `sha-256=:${createHash('sha256').update(buffer).digest('base64')}:`);
});

test('GitHub import validates the target before fetching and publishes a verified archive', async (t) => {
  const { app, post, token } = await securityFixture(t);
  const { userId } = (await post('/init/setup', {
    username: 'local-admin', password: 'local-test-password', setup_token: token
  })).json();
  const headers = { cookie: 'session_id=' + app.createSession(userId) };
  const githubArchive = new AdmZip();
  githubArchive.addFile('sample-abc/SKILL.md', Buffer.from('# Demo\n\nDemo description'));
  const fetchStub = t.mock.method(globalThis, 'fetch', async (url) => {
    assert.match(url, /\/zipball\/main$/);
    return new Response(githubArchive.toBuffer());
  });

  const source = { source: 'example/sample', ref: 'main' };
  const endpoint = '/skills/import/github';
  for (const id of ['two/parts', 'CON', 'x'.repeat(201)]) {
    assert.equal((await post(endpoint, { ...source, target_skill_id: id }, headers)).statusCode, 400);
  }
  assert.equal(fetchStub.mock.callCount(), 0);
  const imported = await post(endpoint, { ...source, target_skill_id: 'sample-demo' }, headers);
  assert.equal(imported.statusCode, 200, imported.body);
  assert.equal(fetchStub.mock.callCount(), 1);
  const stored = app.db.prepare('SELECT sha256 FROM skill_versions WHERE skill_id = ?').get('sample-demo');
  assert.match(stored.sha256, /^[0-9a-f]{64}$/);
});
