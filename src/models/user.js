const db = require('../database');
const modelCache = require('../utils/model-cache');

function queryById(id) {
  return db.prepare('SELECT id, username, name, role, status, is_super_admin, created_at, updated_at FROM users WHERE id = ?').get(id);
}

const UserModel = {
  // Find user by ID
  findById(id) {
    return modelCache.remember(
      modelCache.keys.userBasic(id),
      () => queryById(id),
      modelCache.refs.user
    );
  },

  // Find user by username (includes password_hash for login verification)
  findByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  // Create user
  create(username, passwordHash, role = 'developer') {
    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, passwordHash, role);
    modelCache.invalidateUser(result.lastInsertRowid);
    return queryById(result.lastInsertRowid);
  },

  // List users (supports pagination and search)
  list({ q, status, page = 1, limit = 20 } = {}) {
    let sql = 'SELECT id, username, name, role, status, is_super_admin, created_at, updated_at FROM users WHERE 1=1';
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

  // Update username
  updateUsername(id, username) {
    const result = db.prepare(
      "UPDATE users SET username = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(username, id);
    if (result.changes > 0) {
      modelCache.invalidateUser(id);
    }
    return result.changes > 0;
  },

  // Update password
  updatePassword(id, passwordHash) {
    const result = db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(passwordHash, id);
    if (result.changes > 0) {
      modelCache.invalidateUser(id);
    }
    return result.changes > 0;
  },

  // Update user (for admin use)
  update(id, fields) {
    const allowed = ['role', 'status', 'username', 'name', 'is_super_admin'];
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
    if (result.changes > 0) {
      modelCache.invalidateUser(id);
    }
    return result.changes > 0;
  },

  // Reset password (for admin use)
  resetPassword(id, passwordHash) {
    const result = db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(passwordHash, id);
    if (result.changes > 0) {
      modelCache.invalidateUser(id);
    }
    return result.changes > 0;
  },

  delete(id) {
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    if (result.changes > 0) {
      modelCache.invalidateUser(id);
    }
    return result.changes > 0;
  },

  // Find user details (includes creator info)
  findByIdWithCreator(id) {
    return db.prepare(`
      SELECT u.id, u.username, u.name, u.role, u.status, u.is_super_admin, u.created_at, u.updated_at,
             c.id as creator_id, c.username as creator_username
      FROM users u
      LEFT JOIN users c ON u.created_by = c.id
      WHERE u.id = ?
    `).get(id);
  },

  countSuperAdmins() {
    return db.prepare('SELECT COUNT(*) AS count FROM users WHERE is_super_admin = 1').get().count;
  },

  canDemoteOrDisableSuperAdmin(id) {
    const user = db.prepare('SELECT is_super_admin FROM users WHERE id = ?').get(id);
    if (!user?.is_super_admin) {
      return true;
    }
    return this.countSuperAdmins() > 1;
  },

  canDeleteSuperAdmin(id) {
    return this.canDemoteOrDisableSuperAdmin(id);
  },

  // Update username and name
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
    if (result.changes > 0) {
      modelCache.invalidateUser(id);
    }
    return result.changes > 0;
  }
};

module.exports = UserModel;
