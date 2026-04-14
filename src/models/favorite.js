const db = require('../database');
const modelCache = require('../utils/model-cache');

function syncFavoriteCount(skillId) {
  db.prepare(`
    UPDATE skills
    SET favorite_count = (
      SELECT COUNT(*)
      FROM skill_favorites
      WHERE skill_id = ?
    )
    WHERE id = ?
  `).run(skillId, skillId);
  modelCache.invalidateSkill(skillId);
}

const FavoriteModel = {
  isFavorited(userId, skillId) {
    return !!db.prepare('SELECT 1 FROM skill_favorites WHERE user_id = ? AND skill_id = ?').get(userId, skillId);
  },

  add(userId, skillId) {
    db.transaction(() => {
      db.prepare(`
        INSERT OR IGNORE INTO skill_favorites (user_id, skill_id)
        VALUES (?, ?)
      `).run(userId, skillId);
      syncFavoriteCount(skillId);
    })();

    return this.isFavorited(userId, skillId);
  },

  remove(userId, skillId) {
    db.transaction(() => {
      db.prepare(`
        DELETE FROM skill_favorites
        WHERE user_id = ? AND skill_id = ?
      `).run(userId, skillId);
      syncFavoriteCount(skillId);
    })();

    return false;
  },

  countBySkillId(skillId) {
    return db.prepare(`
      SELECT COUNT(*) AS count
      FROM skill_favorites
      WHERE skill_id = ?
    `).get(skillId).count;
  }
};

module.exports = FavoriteModel;
