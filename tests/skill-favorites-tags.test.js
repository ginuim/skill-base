const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // Ignore modules that were not loaded yet.
  }
}

function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-base-favorites-'));
  const dbPath = path.join(tempDir, 'skills.db');
  return { tempDir, dbPath };
}

function destroyFixture(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function withDatabase(dbPath, callback) {
  const previousPath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = dbPath;
  clearModule('../src/database');
  clearModule('../src/models/favorite');
  clearModule('../src/models/tag');
  clearModule('../src/models/skill');
  clearModule('../src/models/user');
  clearModule('../src/utils/model-cache');

  const db = require('../src/database');

  try {
    return callback(db);
  } finally {
    if (typeof db.close === 'function') {
      db.close();
    }
    if (previousPath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = previousPath;
    }
  }
}

function seedUserAndSkill(db) {
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, status, is_super_admin, created_at, updated_at)
    VALUES (1, 'alice', 'hash', 'developer', 'active', 0, datetime('now'), datetime('now'))
  `).run();

  db.prepare(`
    INSERT INTO skills (id, name, description, owner_id, favorite_count, download_count, created_at, updated_at)
    VALUES ('skill-a', 'Skill A', 'Test skill', 1, 0, 0, datetime('now'), datetime('now'))
  `).run();

  db.prepare(`
    INSERT INTO skill_collaborators (skill_id, user_id, role, created_by)
    VALUES ('skill-a', 1, 'owner', 1)
  `).run();
}

test('favorite model toggles rows and keeps counts in sync', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    withDatabase(dbPath, (db) => {
      seedUserAndSkill(db);
      const FavoriteModel = require('../src/models/favorite');

      assert.equal(FavoriteModel.isFavorited(1, 'skill-a'), false);

      FavoriteModel.add(1, 'skill-a');
      assert.equal(FavoriteModel.isFavorited(1, 'skill-a'), true);
      assert.equal(db.prepare('SELECT favorite_count FROM skills WHERE id = ?').get('skill-a').favorite_count, 1);

      FavoriteModel.add(1, 'skill-a');
      assert.equal(db.prepare('SELECT favorite_count FROM skills WHERE id = ?').get('skill-a').favorite_count, 1);

      FavoriteModel.remove(1, 'skill-a');
      assert.equal(FavoriteModel.isFavorited(1, 'skill-a'), false);
      assert.equal(db.prepare('SELECT favorite_count FROM skills WHERE id = ?').get('skill-a').favorite_count, 0);
    });
  } finally {
    destroyFixture(tempDir);
  }
});

test('tag model replaces skill tags with validated global tag ids', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    withDatabase(dbPath, (db) => {
      seedUserAndSkill(db);
      const TagModel = require('../src/models/tag');

      const frontend = TagModel.create({ name: 'frontend', actorId: 1 });
      const vue = TagModel.create({ name: 'vue', actorId: 1 });

      TagModel.replaceSkillTags('skill-a', [frontend.id, vue.id], 1);
      let tags = TagModel.listSkillTags('skill-a');
      assert.deepEqual(tags.map((tag) => tag.name), ['frontend', 'vue']);

      TagModel.replaceSkillTags('skill-a', [vue.id], 1);
      tags = TagModel.listSkillTags('skill-a');
      assert.deepEqual(tags.map((tag) => tag.name), ['vue']);

      assert.throws(() => {
        TagModel.replaceSkillTags('skill-a', [999], 1);
      }, /tag/i);
    });
  } finally {
    destroyFixture(tempDir);
  }
});
