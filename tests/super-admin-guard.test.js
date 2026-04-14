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
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-base-super-admin-'));
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
  clearModule('../src/models/user');
  clearModule('../src/utils/model-cache');

  const db = require('../src/database');
  const UserModel = require('../src/models/user');

  try {
    return callback(db, UserModel);
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

function seedAdmins(db) {
  db.prepare(`
    INSERT INTO users (id, username, password_hash, role, status, is_super_admin, created_at, updated_at)
    VALUES
      (1, 'root', 'hash', 'admin', 'active', 1, datetime('now'), datetime('now')),
      (2, 'ops-admin', 'hash', 'admin', 'active', 0, datetime('now'), datetime('now'))
  `).run();
}

test('user model refuses to disable or delete the last super admin', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    withDatabase(dbPath, (db, UserModel) => {
      seedAdmins(db);

      assert.equal(UserModel.countSuperAdmins(), 1);
      assert.equal(UserModel.canDemoteOrDisableSuperAdmin(1), false);
      assert.equal(UserModel.canDeleteSuperAdmin(1), false);
      assert.equal(UserModel.canDemoteOrDisableSuperAdmin(2), true);
      assert.equal(UserModel.canDeleteSuperAdmin(2), true);
    });
  } finally {
    destroyFixture(tempDir);
  }
});

test('user model allows changes when more than one super admin exists', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    withDatabase(dbPath, (db, UserModel) => {
      seedAdmins(db);
      db.prepare(`
        UPDATE users
        SET is_super_admin = 1
        WHERE id = 2
      `).run();

      assert.equal(UserModel.countSuperAdmins(), 2);
      assert.equal(UserModel.canDemoteOrDisableSuperAdmin(1), true);
      assert.equal(UserModel.canDeleteSuperAdmin(1), true);
    });
  } finally {
    destroyFixture(tempDir);
  }
});
