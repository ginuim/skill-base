const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AdmZip = require('adm-zip');

const { buildTestApp } = require('./helpers/build-app');

function createZipFile(targetPath) {
  const zip = new AdmZip();
  zip.addFile('SKILL.md', Buffer.from('# Skill A\n\nTest skill\n', 'utf8'));
  zip.writeZip(targetPath);
}

function seedSkillWithVersion(app) {
  const zipDir = path.join(app.fixture.dataDir, 'skills', 'skill-a');
  fs.mkdirSync(zipDir, { recursive: true });
  const version = 'v20260414.120000';
  const zipPath = path.join(zipDir, `${version}.zip`);
  createZipFile(zipPath);

  app.db.prepare(`
    INSERT INTO users (id, username, password_hash, role, status, is_super_admin, created_at, updated_at)
    VALUES
      (1, 'root', 'hash', 'admin', 'active', 1, datetime('now'), datetime('now')),
      (2, 'ops-admin', 'hash', 'admin', 'active', 0, datetime('now'), datetime('now')),
      (3, 'owner', 'hash', 'developer', 'active', 0, datetime('now'), datetime('now'))
  `).run();

  app.db.prepare(`
    INSERT INTO skills (id, name, description, owner_id, latest_version, favorite_count, download_count, created_at, updated_at)
    VALUES ('skill-a', 'Skill A', 'Desc', 3, ?, 0, 0, datetime('now'), datetime('now'))
  `).run(version);

  app.db.prepare(`
    INSERT INTO skill_collaborators (skill_id, user_id, role, created_by)
    VALUES ('skill-a', 3, 'owner', 1)
  `).run();

  app.db.prepare(`
    INSERT INTO skill_versions (skill_id, version, changelog, zip_path, uploader_id, description, download_count, created_at)
    VALUES ('skill-a', ?, 'init', ?, 3, 'Version desc', 0, datetime('now'))
  `).run(version, `skills/skill-a/${version}.zip`);

  return { version };
}

function sessionCookie(app, userId) {
  return `session_id=${app.createSession(userId)}`;
}

test('GET /skills/:id/versions/:version/view returns zip without incrementing download counts', async () => {
  const app = await buildTestApp();

  try {
    const { version } = seedSkillWithVersion(app);
    const before = app.db.prepare(`
      SELECT s.download_count AS skill_download_count, sv.download_count AS version_download_count
      FROM skills s
      JOIN skill_versions sv ON sv.skill_id = s.id
      WHERE s.id = ? AND sv.version = ?
    `).get('skill-a', version);

    const response = await app.inject({
      method: 'GET',
      url: `${app.apiPrefix}/skills/skill-a/versions/${version}/view`
    });

    const after = app.db.prepare(`
      SELECT s.download_count AS skill_download_count, sv.download_count AS version_download_count
      FROM skills s
      JOIN skill_versions sv ON sv.skill_id = s.id
      WHERE s.id = ? AND sv.version = ?
    `).get('skill-a', version);

    assert.equal(response.statusCode, 200);
    assert.equal(after.skill_download_count, before.skill_download_count);
    assert.equal(after.version_download_count, before.version_download_count);
  } finally {
    await app.cleanup();
  }
});

test('GET /skills/:id/versions/:version/download increments both download counters', async () => {
  const app = await buildTestApp();

  try {
    const { version } = seedSkillWithVersion(app);

    const response = await app.inject({
      method: 'GET',
      url: `${app.apiPrefix}/skills/skill-a/versions/${version}/download`
    });

    const row = app.db.prepare(`
      SELECT s.download_count AS skill_download_count, sv.download_count AS version_download_count
      FROM skills s
      JOIN skill_versions sv ON sv.skill_id = s.id
      WHERE s.id = ? AND sv.version = ?
    `).get('skill-a', version);

    assert.equal(response.statusCode, 200);
    assert.equal(row.skill_download_count, 1);
    assert.equal(row.version_download_count, 1);
  } finally {
    await app.cleanup();
  }
});

test('super admin can manage tags but normal admin cannot', async () => {
  const app = await buildTestApp();

  try {
    seedSkillWithVersion(app);

    const ok = await app.inject({
      method: 'POST',
      url: `${app.apiPrefix}/tags`,
      headers: { cookie: sessionCookie(app, 1) },
      payload: { name: 'frontend' }
    });

    const forbidden = await app.inject({
      method: 'POST',
      url: `${app.apiPrefix}/tags`,
      headers: { cookie: sessionCookie(app, 2) },
      payload: { name: 'backend' }
    });

    assert.equal(ok.statusCode, 201);
    assert.equal(forbidden.statusCode, 403);
  } finally {
    await app.cleanup();
  }
});
