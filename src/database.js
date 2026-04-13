const { execFileSync } = require('child_process');
const { Database } = require('node-sqlite3-wasm');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Database file path, supports environment variable configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/skills.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const DB_CLOSE_KEY = Symbol.for('skill-base.database.close');

function closeSilently(database) {
  try {
    if (database?.isOpen) {
      database.close();
    }
  } catch {
    // Ignore close errors during reload/shutdown.
  }
}

function getBundledSqlite3ExecutablePath() {
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

  const bundledPath = path.join(__dirname, '../vendor/sqlite3', platform, arch, process.platform === 'win32' ? 'sqlite3.exe' : 'sqlite3');
  return fs.existsSync(bundledPath) ? bundledPath : null;
}

const WAL_NORMALIZE_CLI_SQL = 'PRAGMA wal_checkpoint(TRUNCATE); PRAGMA journal_mode=DELETE;';

/** 迁移时优先 PATH 里的 sqlite3（与发行版 libc 一致）；bundled 仅作兜底，避免 glibc/musl 不匹配。 */
function walMigrationSqlite3Candidates() {
  const explicit = process.env.SKILL_BASE_SQLITE3_PATH;
  if (explicit && String(explicit).trim() !== '') {
    return [String(explicit).trim()];
  }
  const candidates = ['sqlite3'];
  const bundled = getBundledSqlite3ExecutablePath();
  if (bundled) {
    candidates.push(bundled);
  }
  return candidates;
}

function hasWalSidecarFiles(dbFilePath) {
  return fs.existsSync(`${dbFilePath}-wal`) || fs.existsSync(`${dbFilePath}-shm`);
}

function databaseHeaderIndicatesWalMode(dbFilePath) {
  try {
    const header = fs.readFileSync(dbFilePath);
    if (header.length < 32) return false;
    if (header.subarray(0, 16).toString('utf8') !== 'SQLite format 3\u0000') {
      return false;
    }
    return header[18] === 2 && header[19] === 2;
  } catch {
    return false;
  }
}

function shouldAttemptWalMigration(dbFilePath) {
  return hasWalSidecarFiles(dbFilePath) || databaseHeaderIndicatesWalMode(dbFilePath);
}

/**
 * better-sqlite3 / 系统 SQLite 默认常用 WAL；node-sqlite3-wasm 的 Node VFS 无法正常打开带 WAL 侧车的库。
 * 用 sqlite3 CLI 做 checkpoint 并改为 DELETE journal。
 */
function normalizeJournalWithSqlite3Cli(dbFilePath) {
  const candidates = walMigrationSqlite3Candidates();
  const failures = [];
  for (const helperPath of candidates) {
    try {
      execFileSync(helperPath, [dbFilePath, WAL_NORMALIZE_CLI_SQL], { stdio: 'ignore', timeout: 120_000 });
      return;
    } catch (err) {
      failures.push(`${helperPath}: ${err && err.message ? err.message : String(err)}`);
    }
  }
  throw new Error(
    'Skill Base 无法自动迁移旧版 SQLite WAL 数据库。' +
      `\n数据库: ${dbFilePath}` +
      `\n已依次尝试: ${candidates.join(' -> ')}` +
      '\n请在服务器安装 sqlite3（确保在 PATH 中）或设置 SKILL_BASE_SQLITE3_PATH 指向可执行文件。' +
      `\n详情: ${failures.join(' | ')}`
  );
}

/**
 * 有 -wal/-shm 时必须先迁出；无侧车时多数已是 DELETE journal，不应每次启动都跑 bundled sqlite3
 *（部分 Linux 上该二进制可能无法运行，会误杀正常实例）。
 * 少数「头文件仍是 WAL、但侧车已被 checkpoint 掉」的库，由下方首次 open 失败后再跑一次 CLI 兜底。
 */
function tryNormalizeSqliteJournalForWasm(dbFilePath) {
  if (!fs.existsSync(dbFilePath)) return;
  if (shouldAttemptWalMigration(dbFilePath)) {
    normalizeJournalWithSqlite3Cli(dbFilePath);
  }
}

// In tests we reload this module with different DATABASE_PATH values.
closeSilently(global[DB_CLOSE_KEY]?.database);

function normalizeValue(value) {
  if (typeof value === 'bigint' && value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)) {
    return Number(value);
  }
  return value;
}

function normalizeRow(row) {
  if (row === null) return undefined;
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key] = normalizeValue(value);
  }
  return normalized;
}

function normalizeRows(rows) {
  return rows.map((row) => normalizeRow(row));
}

function normalizeRunResult(result) {
  if (!result || typeof result !== 'object') return result;
  return {
    ...result,
    changes: normalizeValue(result.changes),
    lastInsertRowid: normalizeValue(result.lastInsertRowid)
  };
}

function bindArgs(args) {
  if (args.length === 0) return undefined;
  if (args.length === 1) return args[0];
  return args;
}

tryNormalizeSqliteJournalForWasm(dbPath);

function openRawDatabaseOrMigrate() {
  let db;
  try {
    db = new Database(dbPath);
  } catch (err) {
    if (!fs.existsSync(dbPath)) {
      throw err;
    }
    if (!shouldAttemptWalMigration(dbPath)) {
      throw err;
    }
    normalizeJournalWithSqlite3Cli(dbPath);
    db = new Database(dbPath);
  }
  try {
    db.exec('SELECT 1');
    return db;
  } catch (err) {
    closeSilently(db);
    if (!fs.existsSync(dbPath)) {
      throw new Error('SQLite 数据库文件在启动探测阶段不存在');
    }
    if (hasWalSidecarFiles(dbPath)) {
      throw new Error(
        '数据库处于 WAL 且仍存在 -wal/-shm 侧车，但当前驱动无法执行 SQL。请确认无其他进程占用该库，或设置 SKILL_BASE_SQLITE3_PATH 使用本机 sqlite3 完成迁移。'
      );
    }
    if (!databaseHeaderIndicatesWalMode(dbPath)) {
      throw err;
    }
    normalizeJournalWithSqlite3Cli(dbPath);
    db = new Database(dbPath);
    db.exec('SELECT 1');
    return db;
  }
}

const rawDb = openRawDatabaseOrMigrate();
global[DB_CLOSE_KEY] = { database: rawDb };

function createStatement(sql) {
  return {
    get(...args) {
      return normalizeRow(rawDb.get(sql, bindArgs(args)));
    },
    all(...args) {
      return normalizeRows(rawDb.all(sql, bindArgs(args)));
    },
    run(...args) {
      return normalizeRunResult(rawDb.run(sql, bindArgs(args)));
    }
  };
}

const db = {
  exec(sql) {
    return rawDb.exec(sql);
  },
  pragma(sql) {
    return rawDb.exec(`PRAGMA ${sql}`);
  },
  prepare(sql) {
    return createStatement(sql);
  },
  transaction(fn) {
    return (...args) => {
      rawDb.exec('BEGIN');
      try {
        const result = fn(...args);
        rawDb.exec('COMMIT');
        return result;
      } catch (error) {
        if (rawDb.inTransaction) {
          rawDb.exec('ROLLBACK');
        }
        throw error;
      }
    };
  },
  close() {
    closeSilently(rawDb);
  }
};

Object.defineProperty(db, 'inTransaction', {
  enumerable: true,
  get() {
    return rawDb.inTransaction;
  }
});

// node-sqlite3-wasm: keep default DELETE journal (WAL + this VFS breaks on many existing DBs).

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

// Table creation SQL
const createTablesSql = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role          TEXT DEFAULT 'developer',
    name          TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CLI temporary auth code table
CREATE TABLE IF NOT EXISTS cli_auth_codes (
    code          TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    expires_at    DATETIME NOT NULL,
    used          BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Personal Access Token table (PAT)
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    token         TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    description   TEXT,
    last_used_at  DATETIME,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Skill main table
CREATE TABLE IF NOT EXISTS skills (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    description   TEXT,
    latest_version TEXT,
    owner_id      INTEGER NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Version table
CREATE TABLE IF NOT EXISTS skill_versions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id     TEXT NOT NULL,
    version      TEXT NOT NULL,
    changelog    TEXT,
    zip_path     TEXT NOT NULL,
    uploader_id  INTEGER NOT NULL,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(id),
    UNIQUE(skill_id, version)
);

-- Skill collaborators table
CREATE TABLE IF NOT EXISTS skill_collaborators (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id      TEXT NOT NULL,
    user_id       INTEGER NOT NULL,
    role          TEXT NOT NULL DEFAULT 'collaborator',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by    INTEGER NOT NULL,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(skill_id, user_id)
);

-- Session table (optional, enabled via SESSION_STORE=sqlite)
CREATE TABLE IF NOT EXISTS sessions (
    session_id    TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at    DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_versions_skill_id ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_cli_codes_user ON cli_auth_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_pat_tokens_user ON personal_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_skill ON skill_collaborators(skill_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON skill_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`;

// Execute table creation statements
db.exec(createTablesSql);

// Safely add new columns (if not exists)
try { db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"); } catch(e) {}
// SQLite does not support ALTER TABLE with CURRENT_TIMESTAMP default, requires two steps
try { 
  db.exec("ALTER TABLE users ADD COLUMN updated_at DATETIME"); 
  db.exec("UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL");
} catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id)"); } catch(e) {}
try { db.exec("ALTER TABLE users ADD COLUMN name TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE skill_versions ADD COLUMN description TEXT"); } catch(e) {}
try { db.exec('ALTER TABLE skills ADD COLUMN webhook_url TEXT'); } catch (e) {}

// Data migration: insert skill_collaborators record for existing Skills owners
const existingSkills = db.prepare('SELECT id, owner_id FROM skills').all();
const insertCollaborator = db.prepare(`
  INSERT OR IGNORE INTO skill_collaborators (skill_id, user_id, role, created_by)
  VALUES (?, ?, 'owner', ?)
`);
for (const skill of existingSkills) {
  insertCollaborator.run(skill.id, skill.owner_id, skill.owner_id);
}

module.exports = db;
