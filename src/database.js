const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

// 数据库文件路径，支持环境变量配置
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/skills.db');

// 创建数据库连接
const db = new Database(dbPath);

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL');

// 建表 SQL
const createTablesSql = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role          TEXT DEFAULT 'developer',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CLI 临时验证码表
CREATE TABLE IF NOT EXISTS cli_auth_codes (
    code          TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    expires_at    DATETIME NOT NULL,
    used          BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 长效访问令牌表 (PAT)
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    token         TEXT PRIMARY KEY,
    user_id       INTEGER NOT NULL,
    description   TEXT,
    last_used_at  DATETIME,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Skill 主表
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

-- 版本表
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

-- 索引
CREATE INDEX IF NOT EXISTS idx_versions_skill_id ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_cli_codes_user ON cli_auth_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_pat_tokens_user ON personal_access_tokens(user_id);
`;

// 执行建表语句
db.exec(createTablesSql);

// 检查 users 表是否为空，如果为空则插入默认管理员账号
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (userCount.count === 0) {
    const passwordHash = bcrypt.hashSync('admin123', 10);
    const insertAdmin = db.prepare(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)'
    );
    insertAdmin.run('admin', passwordHash, 'admin');
}

module.exports = db;
