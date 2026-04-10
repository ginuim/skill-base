const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const packageJson = require('../package.json');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // Ignore modules that were not loaded yet.
  }
}

function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-base-db-'));
  const dbPath = path.join(tempDir, 'skills.db');
  return { tempDir, dbPath };
}

function destroyFixture(tempDir) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function loadFreshDatabase(dbPath) {
  process.env.DATABASE_PATH = dbPath;
  clearModule('../src/database');
  return require('../src/database');
}

test('package.json replaces better-sqlite3 with node-sqlite3-wasm', () => {
  assert.equal(packageJson.dependencies['better-sqlite3'], undefined);
  assert.ok(packageJson.dependencies['node-sqlite3-wasm']);
});

test('database adapter keeps prepare get all run contract', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const db = loadFreshDatabase(dbPath);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const insertResult = insertUser.run('alice', 'hash', 'developer', 'Alice', 'active');

    assert.equal(typeof insertResult.lastInsertRowid, 'number');
    assert.equal(insertResult.changes, 1);

    const selectedUser = db.prepare(`
      SELECT id, username, name FROM users WHERE id = ?
    `).get(insertResult.lastInsertRowid);
    assert.equal(selectedUser.username, 'alice');
    assert.equal(selectedUser.name, 'Alice');

    db.prepare(`
      INSERT INTO skills (id, name, description, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('skill-a', 'Skill A', 'First skill', insertResult.lastInsertRowid);
    db.prepare(`
      INSERT INTO skills (id, name, description, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run('skill-b', 'Skill B', 'Second skill', insertResult.lastInsertRowid);

    const skills = db.prepare(`
      SELECT id, name FROM skills ORDER BY id ASC
    `).all();
    assert.deepEqual(skills, [
      { id: 'skill-a', name: 'Skill A' },
      { id: 'skill-b', name: 'Skill B' }
    ]);

    if (typeof db.close === 'function') {
      db.close();
    }
  } finally {
    destroyFixture(tempDir);
  }
});

test('database adapter transaction rolls back on error', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const db = loadFreshDatabase(dbPath);
    const runInTransaction = db.transaction((username) => {
      db.prepare(`
        INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
        VALUES (?, 'hash', 'developer', 'Ghost', 'active', datetime('now'), datetime('now'))
      `).run(username);
      throw new Error('force rollback');
    });

    assert.throws(() => runInTransaction('ghost-user'), /force rollback/);

    const user = db.prepare('SELECT id FROM users WHERE username = ?').get('ghost-user');
    assert.equal(user, undefined);

    if (typeof db.close === 'function') {
      db.close();
    }
  } finally {
    destroyFixture(tempDir);
  }
});
