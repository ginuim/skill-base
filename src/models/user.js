const db = require('../database');

const UserModel = {
  // 根据 ID 查询用户
  findById(id) {
    return db.prepare('SELECT id, username, role, created_at FROM users WHERE id = ?').get(id);
  },

  // 根据用户名查询（含 password_hash，用于登录验证）
  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  // 创建用户
  create(username, passwordHash, role = 'developer') {
    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, passwordHash, role);
    return this.findById(result.lastInsertRowid);
  },

  // 列出所有用户
  list() {
    return db.prepare('SELECT id, username, role, created_at FROM users').all();
  }
};

module.exports = UserModel;
