const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (error) {
    // Ignore modules that were not loaded yet.
  }
}

function loadFreshModels(dbPath, cacheMaxMb = '50') {
  process.env.DATABASE_PATH = dbPath;
  process.env.CACHE_MAX_MB = cacheMaxMb;

  clearModule('../src/utils/lru-cache');
  clearModule('../src/utils/model-cache');
  clearModule('../src/database');
  clearModule('../src/models/skill');
  clearModule('../src/models/version');
  clearModule('../src/models/user');

  const db = require('../src/database');
  const SkillModel = require('../src/models/skill');
  const VersionModel = require('../src/models/version');
  const UserModel = require('../src/models/user');

  return { db, SkillModel, VersionModel, UserModel };
}

function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-base-cache-'));
  const dbPath = path.join(tempDir, 'skills.db');
  return { tempDir, dbPath };
}

function destroyFixture(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function seedUsers(db) {
  const alice = db.prepare(`
    INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
    VALUES ('alice', 'hash', 'developer', 'Alice', 'active', datetime('now'), datetime('now'))
  `).run();
  const bob = db.prepare(`
    INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
    VALUES ('bob', 'hash', 'developer', 'Bob', 'active', datetime('now'), datetime('now'))
  `).run();

  return { aliceId: alice.lastInsertRowid, bobId: bob.lastInsertRowid };
}

function trackPrepareCalls(db, matcher) {
  const originalPrepare = db.prepare.bind(db);
  let count = 0;

  db.prepare = function trackedPrepare(sql) {
    if (matcher(sql)) {
      count += 1;
    }
    return originalPrepare(sql);
  };

  return {
    get count() {
      return count;
    },
    restore() {
      db.prepare = originalPrepare;
    }
  };
}

test('findById caches skill detail reads', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const { db, SkillModel } = loadFreshModels(dbPath);
    const { aliceId } = seedUsers(db);
    db.prepare(`
      INSERT INTO skills (id, name, description, latest_version, owner_id, created_at, updated_at)
      VALUES ('skill-a', 'Skill A', 'First skill', 'v1', ?, datetime('now'), datetime('now'))
    `).run(aliceId);

    const tracked = trackPrepareCalls(db, (sql) => sql.includes('FROM skills s'));

    const first = SkillModel.findById('skill-a');
    const second = SkillModel.findById('skill-a');

    tracked.restore();

    assert.equal(first.name, 'Skill A');
    assert.equal(second.name, 'Skill A');
    assert.equal(tracked.count, 1);
  } finally {
    destroyFixture(tempDir);
  }
});

test('skill update invalidates cached detail and search results', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const { db, SkillModel } = loadFreshModels(dbPath);
    const { aliceId } = seedUsers(db);
    db.prepare(`
      INSERT INTO skills (id, name, description, latest_version, owner_id, created_at, updated_at)
      VALUES ('skill-a', 'Skill A', 'First skill', 'v1', ?, datetime('now'), datetime('now'))
    `).run(aliceId);

    const original = SkillModel.findById('skill-a');
    const originalSearch = SkillModel.search('');

    assert.equal(original.name, 'Skill A');
    assert.equal(originalSearch[0].name, 'Skill A');

    SkillModel.update('skill-a', 'Skill A+', 'Updated description');

    const updated = SkillModel.findById('skill-a');
    const updatedSearch = SkillModel.search('');

    assert.equal(updated.name, 'Skill A+');
    assert.equal(updated.description, 'Updated description');
    assert.equal(updatedSearch[0].name, 'Skill A+');
  } finally {
    destroyFixture(tempDir);
  }
});

test('version writes invalidate latest and list caches', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const { db, SkillModel, VersionModel } = loadFreshModels(dbPath);
    const { aliceId, bobId } = seedUsers(db);
    db.prepare(`
      INSERT INTO skills (id, name, description, latest_version, owner_id, created_at, updated_at)
      VALUES ('skill-a', 'Skill A', 'First skill', 'v1', ?, datetime('now'), datetime('now'))
    `).run(aliceId);

    VersionModel.create('skill-a', 'v1', 'first', 'skill-a/v1.zip', aliceId, 'Version one');
    SkillModel.updateLatestVersion('skill-a', 'v1');

    const initialLatest = VersionModel.getLatest('skill-a');
    const initialList = VersionModel.listBySkillId('skill-a');

    assert.equal(initialLatest.version, 'v1');
    assert.equal(initialList.length, 1);

    VersionModel.create('skill-a', 'v2', 'second', 'skill-a/v2.zip', bobId, 'Version two');
    SkillModel.updateLatestVersion('skill-a', 'v2');

    const refreshedLatest = VersionModel.getLatest('skill-a');
    const refreshedList = VersionModel.listBySkillId('skill-a');
    const refreshedSkill = SkillModel.findById('skill-a');

    assert.equal(refreshedLatest.version, 'v2');
    assert.equal(refreshedList.length, 2);
    assert.equal(refreshedSkill.latest_version, 'v2');
  } finally {
    destroyFixture(tempDir);
  }
});

test('findById caches user basics and invalidates after profile update', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const { db, UserModel } = loadFreshModels(dbPath);
    const { aliceId } = seedUsers(db);
    const tracked = trackPrepareCalls(db, (sql) => sql.includes('FROM users WHERE id = ?'));

    const first = UserModel.findById(aliceId);
    const second = UserModel.findById(aliceId);

    assert.equal(first.name, 'Alice');
    assert.equal(second.name, 'Alice');
    assert.equal(tracked.count, 1);

    UserModel.updateProfile(aliceId, { name: 'Alice Updated' });
    const updated = UserModel.findById(aliceId);

    tracked.restore();

    assert.equal(updated.name, 'Alice Updated');
    assert.equal(tracked.count, 2);
  } finally {
    destroyFixture(tempDir);
  }
});

test('rolled back skill creation does not leave ghost cache entries', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const { db, SkillModel } = loadFreshModels(dbPath);
    const { aliceId } = seedUsers(db);
    const createAndRollback = db.transaction(() => {
      SkillModel.create('ghost-skill', 'Ghost Skill', 'Should roll back', aliceId);
      throw new Error('force rollback');
    });

    assert.throws(() => createAndRollback(), /force rollback/);
    assert.equal(SkillModel.findById('ghost-skill'), undefined);
    assert.equal(SkillModel.exists('ghost-skill'), false);
  } finally {
    destroyFixture(tempDir);
  }
});

test('rolled back user creation does not leave ghost cache entries', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const { db, UserModel } = loadFreshModels(dbPath);
    const createAndRollback = db.transaction(() => {
      UserModel.create('ghost-user', 'hash', 'developer');
      throw new Error('force rollback');
    });

    assert.throws(() => createAndRollback(), /force rollback/);
    assert.equal(UserModel.findByUsername('ghost-user'), undefined);
    assert.equal(UserModel.findById(1), undefined);
  } finally {
    destroyFixture(tempDir);
  }
});

test('lru evicts old entries when max bytes is exceeded', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    loadFreshModels(dbPath, '0.0001');
    const LruCache = require('../src/utils/lru-cache');
    const cache = new LruCache({ maxBytes: 80 });

    cache.set('first', { value: 'a'.repeat(40) });
    cache.set('second', { value: 'b'.repeat(40) });

    assert.equal(cache.get('first'), undefined);
    assert.deepEqual(cache.get('second'), { value: 'b'.repeat(40) });
  } finally {
    destroyFixture(tempDir);
  }
});
