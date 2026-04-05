const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// Database file path, supports environment variable configuration
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/skills.db');

// Create database connection
const db = new Database(dbPath);

// Enable WAL mode for better concurrency performance
db.pragma('journal_mode = WAL');

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
