const db = require('../database');

const SkillModel = {
  // 根据 ID 查询 Skill（附带 owner 信息）
  findById(id) {
    return db.prepare(`
      SELECT s.*, u.username as owner_username, u.name as owner_name
      FROM skills s
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE s.id = ?
    `).get(id);
  },

  // 搜索/列出 Skills（支持关键词搜索 name 或 description）
  search(query) {
    if (query) {
      const pattern = `%${query}%`;
      return db.prepare(`
        SELECT s.*, u.username as owner_username, u.name as owner_name
        FROM skills s
        LEFT JOIN users u ON s.owner_id = u.id
        WHERE s.name LIKE ? OR s.description LIKE ?
        ORDER BY s.updated_at DESC
      `).all(pattern, pattern);
    }
    return db.prepare(`
      SELECT s.*, u.username as owner_username, u.name as owner_name
      FROM skills s
      LEFT JOIN users u ON s.owner_id = u.id
      ORDER BY s.updated_at DESC
    `).all();
  },

  // 创建新 Skill
  create(id, name, description, ownerId) {
    db.prepare(`
      INSERT INTO skills (id, name, description, owner_id)
      VALUES (?, ?, ?, ?)
    `).run(id, name, description || '', ownerId);
    return this.findById(id);
  },

  // 更新 latest_version 和 updated_at
  updateLatestVersion(id, version) {
    db.prepare(`
      UPDATE skills SET latest_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(version, id);
  },

  // 检查 Skill 是否存在
  exists(id) {
    const row = db.prepare('SELECT 1 FROM skills WHERE id = ?').get(id);
    return !!row;
  }
};

module.exports = SkillModel;
