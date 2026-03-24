const db = require('../database');

const VersionModel = {
  // 创建新版本
  create(skillId, version, changelog, zipPath, uploaderId) {
    const result = db.prepare(`
      INSERT INTO skill_versions (skill_id, version, changelog, zip_path, uploader_id)
      VALUES (?, ?, ?, ?, ?)
    `).run(skillId, version, changelog || '', zipPath, uploaderId);
    return this.findById(result.lastInsertRowid);
  },

  // 根据 ID 查询版本
  findById(id) {
    return db.prepare(`
      SELECT sv.*, u.username as uploader_username
      FROM skill_versions sv
      LEFT JOIN users u ON sv.uploader_id = u.id
      WHERE sv.id = ?
    `).get(id);
  },

  // 根据 skill_id 和 version 查询
  findByVersion(skillId, version) {
    return db.prepare(`
      SELECT sv.*, u.username as uploader_username
      FROM skill_versions sv
      LEFT JOIN users u ON sv.uploader_id = u.id
      WHERE sv.skill_id = ? AND sv.version = ?
    `).get(skillId, version);
  },

  // 列出某 Skill 的所有版本（按创建时间倒序）
  listBySkillId(skillId) {
    return db.prepare(`
      SELECT sv.*, u.username as uploader_username
      FROM skill_versions sv
      LEFT JOIN users u ON sv.uploader_id = u.id
      WHERE sv.skill_id = ?
      ORDER BY sv.created_at DESC
    `).all(skillId);
  },

  // 获取某 Skill 的最新版本
  getLatest(skillId) {
    return db.prepare(`
      SELECT sv.*, u.username as uploader_username
      FROM skill_versions sv
      LEFT JOIN users u ON sv.uploader_id = u.id
      WHERE sv.skill_id = ?
      ORDER BY sv.created_at DESC
      LIMIT 1
    `).get(skillId);
  }
};

module.exports = VersionModel;
