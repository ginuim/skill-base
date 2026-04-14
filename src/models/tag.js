const db = require('../database');
const modelCache = require('../utils/model-cache');

function normalizeName(name) {
  return String(name || '').trim();
}

function getTagById(id) {
  return db.prepare(`
    SELECT id, name, created_at, updated_at, created_by, updated_by
    FROM tags
    WHERE id = ?
  `).get(id);
}

function invalidateSkillTagRefs(skillIds) {
  for (const skillId of skillIds || []) {
    modelCache.invalidateSkill(skillId);
  }
}

const TagModel = {
  create({ name, actorId }) {
    const normalizedName = normalizeName(name);
    const result = db.prepare(`
      INSERT INTO tags (name, created_by, updated_by)
      VALUES (?, ?, ?)
    `).run(normalizedName, actorId, actorId);
    return getTagById(result.lastInsertRowid);
  },

  update(id, { name, actorId }) {
    const normalizedName = normalizeName(name);
    db.prepare(`
      UPDATE tags
      SET name = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ?
      WHERE id = ?
    `).run(normalizedName, actorId, id);
    return getTagById(id);
  },

  delete(id) {
    const affectedSkills = db.prepare(`
      SELECT skill_id
      FROM skill_tags
      WHERE tag_id = ?
    `).all(id).map((row) => row.skill_id);

    const result = db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    invalidateSkillTagRefs(affectedSkills);
    return result.changes > 0;
  },

  listSkillTags(skillId) {
    return db.prepare(`
      SELECT t.id, t.name
      FROM skill_tags st
      JOIN tags t ON t.id = st.tag_id
      WHERE st.skill_id = ?
      ORDER BY t.name ASC
    `).all(skillId);
  },

  listAllWithUsage() {
    return db.prepare(`
      SELECT t.id, t.name, COUNT(st.skill_id) AS usage_count
      FROM tags t
      LEFT JOIN skill_tags st ON st.tag_id = t.id
      GROUP BY t.id, t.name
      ORDER BY t.name ASC
    `).all();
  },

  replaceSkillTags(skillId, tagIds, actorId) {
    const uniqueTagIds = [...new Set((tagIds || []).map((id) => Number(id)))];

    return db.transaction(() => {
      if (uniqueTagIds.length > 0) {
        const placeholders = uniqueTagIds.map(() => '?').join(', ');
        const rows = db.prepare(`SELECT id FROM tags WHERE id IN (${placeholders})`).all(...uniqueTagIds);
        if (rows.length !== uniqueTagIds.length) {
          throw new Error('One or more tags do not exist');
        }
      }

      db.prepare('DELETE FROM skill_tags WHERE skill_id = ?').run(skillId);
      const insert = db.prepare(`
        INSERT INTO skill_tags (skill_id, tag_id, created_by)
        VALUES (?, ?, ?)
      `);

      for (const tagId of uniqueTagIds) {
        insert.run(skillId, tagId, actorId);
      }

      modelCache.invalidateSkill(skillId);
      return this.listSkillTags(skillId);
    })();
  }
};

module.exports = TagModel;
