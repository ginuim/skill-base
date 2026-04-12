const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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

function withEnv(overrides, fn) {
  const previous = {};
  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];
    if (typeof value === 'undefined') {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (typeof value === 'undefined') {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function createLegacyWalDatabase(dbPath) {
  execFileSync('sqlite3', [
    dbPath,
    `
      PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT DEFAULT 'developer',
        name TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
      VALUES ('legacy-user', 'hash', 'developer', 'Legacy User', 'active', datetime('now'), datetime('now'));
    `
  ]);
}

function getBundledSqlite3Path() {
  const platformMap = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'win32'
  };
  const archMap = {
    arm64: 'arm64',
    x64: 'x64'
  };
  const platform = platformMap[process.platform];
  const arch = archMap[process.arch];
  if (!platform || !arch) return null;
  const fileName = process.platform === 'win32' ? 'sqlite3.exe' : 'sqlite3';
  return path.join(__dirname, '..', 'vendor', 'sqlite3', platform, arch, fileName);
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

test('database adapter migrates legacy WAL db without relying on PATH sqlite3', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    createLegacyWalDatabase(dbPath);

    const helperPath = execFileSync('which', ['sqlite3'], { encoding: 'utf8' }).trim();
    const db = withEnv({
      DATABASE_PATH: dbPath,
      PATH: '',
      SKILL_BASE_SQLITE3_PATH: helperPath
    }, () => {
      clearModule('../src/database');
      return require('../src/database');
    });

    const user = db.prepare('SELECT username, name FROM users WHERE username = ?').get('legacy-user');
    assert.deepEqual(user, { username: 'legacy-user', name: 'Legacy User' });

    if (typeof db.close === 'function') {
      db.close();
    }
  } finally {
    destroyFixture(tempDir);
  }
});

test('database adapter uses bundled sqlite3 helper when PATH has no sqlite3', () => {
  const bundledHelper = getBundledSqlite3Path();
  if (!bundledHelper || !fs.existsSync(bundledHelper)) {
    return;
  }

  const { tempDir, dbPath } = createFixture();

  try {
    createLegacyWalDatabase(dbPath);

    const db = withEnv({
      DATABASE_PATH: dbPath,
      PATH: '',
      SKILL_BASE_SQLITE3_PATH: undefined
    }, () => {
      clearModule('../src/database');
      return require('../src/database');
    });

    const user = db.prepare('SELECT username, name FROM users WHERE username = ?').get('legacy-user');
    assert.deepEqual(user, { username: 'legacy-user', name: 'Legacy User' });

    if (typeof db.close === 'function') {
      db.close();
    }
  } finally {
    destroyFixture(tempDir);
  }
});
