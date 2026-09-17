const test = require('node:test');
const assert = require('node:assert/strict');
const { buildTestApp } = require('./helpers/build-app');

function seed(app) {
  const db = app.db;
  for (let id = 1; id <= 6; id++) {
    db.prepare("INSERT INTO users (id, username, name, avatar, password_hash, role, status) VALUES (?, ?, ?, ?, 'hash', ?, 'active')")
      .run(id, `user${id}`, `Person ${id}`, id === 2 ? 'fox.png' : null, id === 6 ? 'admin' : 'developer');
  }
  for (const [id, visibility, downloads] of [['public', 'public', 10], ['private', 'private', 90], ['unpublished', 'public', 0]]) {
    db.prepare('INSERT INTO skills (id, name, owner_id, visibility, download_count) VALUES (?, ?, 1, ?, ?)').run(id, id, visibility, downloads);
    db.prepare("INSERT INTO skill_collaborators (skill_id, user_id, role, created_by) VALUES (?, 1, 'owner', 1)").run(id);
  }
  db.prepare("INSERT INTO skill_collaborators (skill_id, user_id, role, created_by) VALUES ('private', 2, 'collaborator', 1)").run();
  // Owner 1 never published. Authors 3–5 need not still be members.
  for (const [skill, user, version] of [['public', 2, 'v1'], ['public', 2, 'v2'], ['public', 3, 'v3'], ['public', 4, 'v4'], ['public', 5, 'v5'], ['private', 2, 'v1']]) {
    db.prepare("INSERT INTO skill_versions (skill_id, uploader_id, version, zip_path, created_at) VALUES (?, ?, ?, 'test.zip', '2026-09-18 00:00:00')").run(skill, user, version);
  }
}

test('contributors come from distinct version uploaders, including former members; avatars stay fresh', async () => {
  const app = await buildTestApp();
  try {
    seed(app);
    const getList = async () => (await app.inject('/api/v1/skills')).json();
    const list = await getList();
    const contributors = list.skills.find(s => s.id === 'public').contributors;
    assert.deepEqual(contributors.map(p => p.id), [2, 3, 4, 5]);
    assert.equal(contributors[0].version_count, 2);
    assert.equal(contributors[0].avatar, 'fox.png');
    assert.deepEqual(list.skills.find(s => s.id === 'unpublished').contributors, []);
    const detail = (await app.inject('/api/v1/skills/public')).json();
    assert.deepEqual(detail.contributors, contributors);
    require('../src/models/user').updateProfile(2, { name: 'Updated', avatar: 'penguin.png' });
    const fresh = (await getList()).skills.find(s => s.id === 'public').contributors[0];
    assert.equal(fresh.name, 'Updated');
    assert.equal(fresh.avatar, 'penguin.png');
    app.db.prepare("DELETE FROM skill_versions WHERE skill_id = 'public' AND uploader_id = 2").run();
    assert.deepEqual((await getList()).skills.find(s => s.id === 'public').contributors.map(p => p.id), [3, 4, 5]);
  } finally { await app.cleanup(); }
});

test('profile lists unique contributed skills and aggregates only viewer-visible contributions', async () => {
  const app = await buildTestApp();
  try {
    seed(app);
    for (const [viewer, expected] of [[null, [1, 2, 10]], [3, [1, 2, 10]], [2, [2, 3, 100]], [1, [2, 3, 100]], [6, [2, 3, 100]]]) {
      const response = await app.inject({ url: '/api/v1/users/2/profile', headers: viewer ? { cookie: `session_id=${app.createSession(viewer)}` } : {} });
      assert.equal(response.statusCode, 200);
      const body = response.json();
      assert.deepEqual([body.stats.skill_count, body.stats.version_count, body.stats.download_count], expected);
      assert.equal(body.skills.length, expected[0]);
      assert.deepEqual(Object.keys(body.user).sort(), ['avatar', 'created_at', 'id', 'name', 'username']);
      assert.equal(body.skills.some(s => s.id === 'unpublished'), false);
      if (!viewer || viewer === 3) assert.equal(JSON.stringify(body).includes('private'), false);
    }
    const owner = (await app.inject('/api/v1/users/1/profile')).json();
    assert.deepEqual(owner.stats, { skill_count: 0, version_count: 0, download_count: 0 });
    assert.deepEqual(owner.skills, []);
    for (const id of ['999', '2foo', '0', '-1', '9007199254740993']) {
      assert.equal((await app.inject(`/api/v1/users/${id}/profile`)).statusCode, 404);
    }
    // The existing administrative user detail endpoint remains protected.
    assert.equal((await app.inject('/api/v1/users/2')).statusCode, 401);
  } finally { await app.cleanup(); }
});
