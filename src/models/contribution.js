const db = require('../database');

// Query live version authors in batches: membership and ownership are not contributions.
// No extra cache, so profile/avatar edits and version deletion are reflected immediately.
function forSkills(skillIds) {
  const result = new Map();
  const ids = [...new Set(skillIds)];
  for (let offset = 0; offset < ids.length; offset += 400) {
    const batch = ids.slice(offset, offset + 400);
    const rows = db.prepare(`
      SELECT v.skill_id, u.id, u.username, u.name, u.avatar,
        COUNT(*) AS version_count, MAX(v.created_at) AS last_contributed_at
      FROM skill_versions v JOIN users u ON u.id = v.uploader_id
      WHERE v.skill_id IN (${batch.map(() => '?').join(',')})
      GROUP BY v.skill_id, u.id
      ORDER BY last_contributed_at DESC, u.id ASC
    `).all(...batch);
    for (const { skill_id, ...person } of rows) {
      if (!result.has(skill_id)) result.set(skill_id, []);
      result.get(skill_id).push(person);
    }
  }
  return result;
}

function byUser(userId) {
  return new Map(db.prepare(`
    SELECT skill_id, COUNT(*) AS version_count, MAX(created_at) AS last_contributed_at
    FROM skill_versions WHERE uploader_id = ? GROUP BY skill_id
  `).all(userId).map(row => [row.skill_id, row]));
}

module.exports = { forSkills, byUser };
