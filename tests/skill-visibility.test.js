const test = require('node:test');
const assert = require('node:assert/strict');

const { buildTestApp } = require('./helpers/build-app');

function sessionCookie(app, userId) {
  return `session_id=${app.createSession(userId)}`;
}

function seedUsers(app) {
  app.db.prepare(`
    INSERT INTO users (id, username, password_hash, role, status, is_super_admin, created_at, updated_at)
    VALUES
      (1, 'owner', 'hash', 'developer', 'active', 0, datetime('now'), datetime('now')),
      (2, 'collab', 'hash', 'developer', 'active', 0, datetime('now'), datetime('now')),
      (3, 'outsider', 'hash', 'developer', 'active', 0, datetime('now'), datetime('now'))
  `).run();
}

function seedSkills(app) {
  app.db.prepare(`
    INSERT INTO skills (id, name, description, visibility, owner_id, created_at, updated_at)
    VALUES
      ('public-skill', 'Public Skill', 'visible to everyone', 'public', 1, datetime('now'), datetime('now')),
      ('private-skill', 'Private Skill', 'visible to collaborators only', 'private', 1, datetime('now'), datetime('now'))
  `).run();

  app.db.prepare(`
    INSERT INTO skill_collaborators (skill_id, user_id, role, created_by)
    VALUES
      ('public-skill', 1, 'owner', 1),
      ('private-skill', 1, 'owner', 1),
      ('private-skill', 2, 'collaborator', 1)
  `).run();
}

test('private skill only visible to collaborators', async () => {
  const app = await buildTestApp();
  try {
    seedUsers(app);
    seedSkills(app);

    const anonymousList = await app.inject({
      method: 'GET',
      url: `${app.apiPrefix}/skills`
    });
    const anonymousPayload = anonymousList.json();
    assert.equal(anonymousPayload.skills.some((s) => s.id === 'private-skill'), false);

    const collaboratorList = await app.inject({
      method: 'GET',
      url: `${app.apiPrefix}/skills`,
      headers: { cookie: sessionCookie(app, 2) }
    });
    const collaboratorPayload = collaboratorList.json();
    assert.equal(collaboratorPayload.skills.some((s) => s.id === 'private-skill'), true);

    const outsiderDetail = await app.inject({
      method: 'GET',
      url: `${app.apiPrefix}/skills/private-skill`,
      headers: { cookie: sessionCookie(app, 3) }
    });
    assert.equal(outsiderDetail.statusCode, 404);
  } finally {
    await app.cleanup();
  }
});

test('skill visibility defaults to public when omitted', async () => {
  const app = await buildTestApp();
  try {
    seedUsers(app);
    app.db.prepare(`
      INSERT INTO skills (id, name, description, owner_id, created_at, updated_at)
      VALUES ('legacy-skill', 'Legacy', 'old row', 1, datetime('now'), datetime('now'))
    `).run();
    app.db.prepare(`
      INSERT INTO skill_collaborators (skill_id, user_id, role, created_by)
      VALUES ('legacy-skill', 1, 'owner', 1)
    `).run();

    const stored = app.db.prepare('SELECT visibility FROM skills WHERE id = ?').get('legacy-skill');
    assert.equal(stored.visibility, 'public');

    const list = await app.inject({
      method: 'GET',
      url: `${app.apiPrefix}/skills`
    });
    const payload = list.json();
    assert.equal(payload.skills.some((s) => s.id === 'legacy-skill'), true);
  } finally {
    await app.cleanup();
  }
});
