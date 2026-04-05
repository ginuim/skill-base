const db = require('../database');
const modelCache = require('../utils/model-cache');

function queryById(id) {
  return db.prepare(`
    SELECT s.*, u.username as owner_username, u.name as owner_name
    FROM skills s
    LEFT JOIN users u ON s.owner_id = u.id
    WHERE s.id = ?
  `).get(id);
}

const SkillModel = {
  // Find Skill by ID (includes owner info)
  findById(id) {
    return modelCache.remember(
      modelCache.keys.skill(id),
      () => queryById(id),
      modelCache.refs.skill
    );
  },

  // Search/List Skills (supports keyword search on name or description)
  search(query) {
    const normalizedQuery = query ? String(query) : '';
    return modelCache.remember(
      modelCache.keys.skillSearch(normalizedQuery),
      () => {
        if (normalizedQuery) {
          const pattern = `%${normalizedQuery}%`;
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
      modelCache.refs.skillSearch
    );
  },

  // Create new Skill
  create(id, name, description, ownerId) {
    db.prepare(`
      INSERT INTO skills (id, name, description, owner_id)
      VALUES (?, ?, ?, ?)
    `).run(id, name, description || '', ownerId);
    modelCache.invalidateSkill(id);
    return queryById(id);
  },

  // Update Skill
  update(id, name, description) {
    const fields = [];
    const values = [];
    if (name !== undefined) {
      fields.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (fields.length === 0) return this.findById(id);
    
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    
    db.prepare(`
      UPDATE skills SET ${fields.join(', ')} WHERE id = ?
    `).run(...values);

    modelCache.invalidateSkill(id);
    return queryById(id);
  },

  // Update latest_version and updated_at
  updateLatestVersion(id, version) {
    db.prepare(`
      UPDATE skills SET latest_version = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(version, id);
    modelCache.invalidateSkill(id);
  },

  // Check if Skill exists
  exists(id) {
    return modelCache.remember(
      modelCache.keys.skillExists(id),
      () => {
        const row = db.prepare('SELECT 1 FROM skills WHERE id = ?').get(id);
        return !!row;
      },
      [`skill:${id}`]
    );
  }
};

module.exports = SkillModel;
