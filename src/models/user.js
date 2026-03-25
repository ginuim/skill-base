const db = require('../database');

const UserModel = {
  // 根据 ID 查询用户
  findById(id) {
    return db.prepare('SELECT id, username, name, role, status, created_at, updated_at FROM users WHERE id = ?').get(id);
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

  // 列出用户（支持分页和搜索）
  list({ q, status, page = 1, limit = 20 } = {}) {
    let sql = 'SELECT id, username, name, role, status, created_at, updated_at FROM users WHERE 1=1';
    let countSql = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    const countParams = [];
    
    if (q) {
      sql += ' AND (username LIKE ? OR name LIKE ?)';
      countSql += ' AND (username LIKE ? OR name LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
      countParams.push(`%${q}%`, `%${q}%`);
    }
    if (status) {
      sql += ' AND status = ?';
      countSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }
    
    const total = db.prepare(countSql).get(...countParams).total;
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    
    const users = db.prepare(sql).all(...params);
    return { users, total, page, limit };
  },

  // 更新用户名
  updateUsername(id, username) {
    const result = db.prepare(
      "UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(username, id);
    return result.changes > 0;
  },

  // 更新密码
  updatePassword(id, passwordHash) {
    const result = db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(passwordHash, id);
    return result.changes > 0;
  },

  // 更新用户（管理员用）
  update(id, fields) {
    const allowed = ['role', 'status', 'username', 'name'];
    const sets = [];
    const params = [];
    
    for (const [key, value] of Object.entries(fields)) {
      if (allowed.includes(key) && value !== undefined) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
    }
    
    if (sets.length === 0) return false;
    
    sets.push("updated_at = datetime('now')");
    params.push(id);
    
    const result = db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return result.changes > 0;
  },

  // 重置密码（管理员用）
  resetPassword(id, passwordHash) {
    const result = db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(passwordHash, id);
    return result.changes > 0;
  },

  // 查询用户详情（含创建者信息）
  findByIdWithCreator(id) {
    return db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.status, u.created_at, u.updated_at,
             c.id as creator_id, c.username as creator_username
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
      WHERE u.id = ?
    `).get(id);
  },

  // 更新用户名和姓名
  updateProfile(id, { username, name }) {
    const sets = [];
    const params = [];
    
    if (username !== undefined) {
      sets.push('username = ?');
      params.push(username);
    }
    if (name !== undefined) {
      sets.push('name = ?');
      params.push(name);
    }
    
    if (sets.length === 0) return false;
    
    sets.push("updated_at = datetime('now')");
    params.push(id);
    
    const result = db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    return result.changes > 0;
  }
};

module.exports = UserModel;
