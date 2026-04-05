const db = require('../database');
const modelCache = require('../utils/model-cache');

const VersionModel = {
  // Create new version
  create(skillId, version, changelog, zipPath, uploaderId, description) {
    const result = db.prepare(`
      INSERT INTO skill_versions (skill_id, version, changelog, zip_path, uploader_id, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(skillId, version, changelog || '', zipPath, uploaderId, description || '');
    modelCache.invalidateSkill(skillId);
    return this.findById(result.lastInsertRowid);
  },

  // Find version by ID
  findById(id) {
    return db.prepare(`
      SELECT sv.*, u.username as uploader_username, u.name as uploader_name
      FROM skill_versions sv
      LEFT JOIN users u ON sv.uploader_id = u.id
      WHERE sv.id = ?
    `).get(id);
  },

  // Find by skill_id and version
  findByVersion(skillId, version) {
    return modelCache.remember(
      modelCache.keys.skillVersion(skillId, version),
      () => db.prepare(`
        SELECT sv.*, u.username as uploader_username, u.name as uploader_name
        FROM skill_versions sv
        LEFT JOIN users u ON sv.uploader_id = u.id
        WHERE sv.skill_id = ? AND sv.version = ?
      `).get(skillId, version),
      modelCache.refs.version
    );
  },

  // List all versions of a Skill (sorted by created_at descending)
  listBySkillId(skillId) {
    return modelCache.remember(
      modelCache.keys.skillVersions(skillId),
      () => db.prepare(`
        SELECT sv.*, u.username as uploader_username, u.name as uploader_name
        FROM skill_versions sv
        LEFT JOIN users u ON sv.uploader_id = u.id
        WHERE sv.skill_id = ?
        ORDER BY sv.created_at DESC, sv.id DESC
      `).all(skillId),
      (versions) => modelCache.refs.versionList(skillId, versions)
    );
  },

  // Get the latest version of a Skill
  getLatest(skillId) {
    return modelCache.remember(
      modelCache.keys.skillLatest(skillId),
      () => db.prepare(`
        SELECT sv.*, u.username as uploader_username, u.name as uploader_name
        FROM skill_versions sv
        LEFT JOIN users u ON sv.uploader_id = u.id
        WHERE sv.skill_id = ?
        ORDER BY sv.created_at DESC, sv.id DESC
        LIMIT 1
      `).get(skillId),
      modelCache.refs.version
    );
  },

  // Update version description and changelog
  update(id, description, changelog) {
    const existing = this.findById(id);
    db.prepare(`
      UPDATE skill_versions
      SET description = ?, changelog = ?
      WHERE id = ?
    `).run(description, changelog, id);
    if (existing) {
      modelCache.invalidateSkill(existing.skill_id);
    }
    return this.findById(id);
  }
};

module.exports = VersionModel;
