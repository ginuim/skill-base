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

function createInvalidDatabaseFile(dbPath) {
  fs.writeFileSync(dbPath, 'this is not a sqlite database');
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

test('database adapter does not disguise non-sqlite files as WAL migration failures', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    createInvalidDatabaseFile(dbPath);

    let error;
    try {
      withEnv(
        {
          DATABASE_PATH: dbPath
        },
        () => {
          clearModule('../src/database');
          require('../src/database');
        }
      );
    } catch (caught) {
      error = caught;
    }

    assert.ok(error);
    assert.match(String(error.message || error), /database/i);
    assert.doesNotMatch(
      String(error.message || error),
      /Skill Base 无法自动迁移旧版 SQLite WAL 数据库/
    );
  } finally {
    destroyFixture(tempDir);
  }
});

test('database migration adds super admin favorites downloads and tags schema', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    const db = loadFreshDatabase(dbPath);

    const userColumns = db.prepare('PRAGMA table_info(users)').all();
    const skillColumns = db.prepare('PRAGMA table_info(skills)').all();
    const versionColumns = db.prepare('PRAGMA table_info(skill_versions)').all();
    const tables = db.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('schema_migrations', 'skill_favorites', 'tags', 'skill_tags')
      ORDER BY name ASC
    `).all();

    assert.ok(userColumns.some((column) => column.name === 'is_super_admin'));
    assert.ok(skillColumns.some((column) => column.name === 'favorite_count'));
    assert.ok(skillColumns.some((column) => column.name === 'download_count'));
    assert.ok(versionColumns.some((column) => column.name === 'download_count'));
    assert.deepEqual(tables, [
      { name: 'schema_migrations' },
      { name: 'skill_favorites' },
      { name: 'skill_tags' },
      { name: 'tags' }
    ]);

    if (typeof db.close === 'function') {
      db.close();
    }
  } finally {
    destroyFixture(tempDir);
  }
});

test('database migration backfills earliest admin as super admin', () => {
  const { tempDir, dbPath } = createFixture();

  try {
    execFileSync('sqlite3', [
      dbPath,
      `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT,
          role TEXT DEFAULT 'developer',
          name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO users (username, password_hash, role, created_at)
        VALUES
          ('first-admin', 'hash', 'admin', '2026-04-01 00:00:00'),
          ('later-admin', 'hash', 'admin', '2026-04-02 00:00:00');
      `
    ]);

    const db = loadFreshDatabase(dbPath);
    const admins = db.prepare(`
      SELECT username, is_super_admin
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at ASC, id ASC
    `).all();

    assert.deepEqual(admins, [
      { username: 'first-admin', is_super_admin: 1 },
      { username: 'later-admin', is_super_admin: 0 }
    ]);

    if (typeof db.close === 'function') {
      db.close();
    }
  } finally {
    destroyFixture(tempDir);
  }
});
