const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // Ignore modules that were not loaded yet.
  }
}

function loadFreshPublish(dbPath, dataDir) {
  process.env.DATABASE_PATH = dbPath;
  process.env.DATA_DIR = dataDir;

  clearModule('../src/utils/lru-cache');
  clearModule('../src/utils/model-cache');
  clearModule('../src/database');
  clearModule('../src/models/skill');
  clearModule('../src/models/version');
  clearModule('../src/utils/permission');
  clearModule('../src/utils/skill-webhook');
  clearModule('../src/utils/zip');
  clearModule('../src/utils/publish-skill');

  const db = require('../src/database');
  const { publishSkillFromZip } = require('../src/utils/publish-skill');

  return { db, publishSkillFromZip };
}

function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-base-publish-'));
  const dbPath = path.join(tempDir, 'skills.db');
  const dataDir = path.join(tempDir, 'data');
  return { tempDir, dbPath, dataDir };
}

function destroyFixture(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function seedUser(db) {
  return db.prepare(`
    INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
    VALUES ('alice', 'hash', 'developer', 'Alice', 'active', datetime('now'), datetime('now'))
  `).run().lastInsertRowid;
}

function seedUserByUsername(db, username) {
  return db.prepare(`
    INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
    VALUES (?, 'hash', 'developer', ?, 'active', datetime('now'), datetime('now'))
  `).run(username, username).lastInsertRowid;
}

function withFixedDate(isoString, fn) {
  const RealDate = Date;
  const fixedTimestamp = new RealDate(isoString).getTime();

  class FakeDate extends RealDate {
    constructor(...args) {
      super(...(args.length > 0 ? args : [fixedTimestamp]));
    }

    static now() {
      return fixedTimestamp;
    }
  }

  FakeDate.parse = RealDate.parse;
  FakeDate.UTC = RealDate.UTC;

  global.Date = FakeDate;
  try {
    return fn();
  } finally {
    global.Date = RealDate;
  }
}

test('publish rejects same-second duplicate without overwriting existing zip', () => {
  const { tempDir, dbPath, dataDir } = createFixture();

  try {
    const { db, publishSkillFromZip } = loadFreshPublish(dbPath, dataDir);
    const userId = seedUser(db);
    const user = { id: userId, role: 'developer', username: 'alice' };

    const firstZip = Buffer.from('first-zip');
    const secondZip = Buffer.from('second-zip');

    let firstResult;
    let secondResult;
    withFixedDate('2026-04-14T12:34:56Z', () => {
      firstResult = publishSkillFromZip({
        user,
        skillId: 'skill-a',
        name: 'Skill A',
        description: 'First publish',
        changelog: 'v1',
        zipBuffer: firstZip
      });

      secondResult = publishSkillFromZip({
        user,
        skillId: 'skill-a',
        name: 'Skill A',
        description: 'Second publish',
        changelog: 'v2',
        zipBuffer: secondZip
      });
    });

    assert.equal(firstResult.ok, true);
    assert.equal(secondResult.ok, false);
    assert.equal(secondResult.status, 409);
    assert.match(secondResult.body.detail, /already exists/i);

    const zipPath = path.join(dataDir, 'skills', 'skill-a', `${firstResult.version}.zip`);
    assert.deepEqual(fs.readFileSync(zipPath), firstZip);

    const versionCount = db.prepare('SELECT COUNT(*) AS count FROM skill_versions WHERE skill_id = ?').get('skill-a');
    assert.equal(versionCount.count, 1);
  } finally {
    destroyFixture(tempDir);
  }
});

test('publish existing skill by non-collaborator returns conflict error', () => {
  const { tempDir, dbPath, dataDir } = createFixture();

  try {
    const { db, publishSkillFromZip } = loadFreshPublish(dbPath, dataDir);
    const ownerId = seedUserByUsername(db, 'owner');
    const outsiderId = seedUserByUsername(db, 'outsider');

    const owner = { id: ownerId, role: 'developer', username: 'owner' };
    const outsider = { id: outsiderId, role: 'developer', username: 'outsider' };
    const zipBuffer = Buffer.from('zip-content');

    const created = publishSkillFromZip({
      user: owner,
      skillId: 'shared-skill',
      name: 'Shared Skill',
      description: 'init',
      changelog: 'v1',
      zipBuffer
    });
    assert.equal(created.ok, true);

    const denied = publishSkillFromZip({
      user: outsider,
      skillId: 'shared-skill',
      name: 'Shared Skill',
      description: 'try overwrite',
      changelog: 'v2',
      zipBuffer
    });

    assert.equal(denied.ok, false);
    assert.equal(denied.status, 403);
    assert.equal(denied.body.error, 'skill_conflict');
  } finally {
    destroyFixture(tempDir);
  }
});
