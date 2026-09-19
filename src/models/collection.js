const db = require('../database');
const modelCache = require('../utils/model-cache');

const MAX_COLLECTION_SKILLS = 10;
const MAX_COLLECTION_DESCRIPTION_LENGTH = 120;
const MIN_COLLECTION_SLUG_LENGTH = 2;
const MAX_COLLECTION_SLUG_LENGTH = 64;
const COLLECTION_SLUG_PATTERN = /^[a-z][a-z0-9-]*$/;

function normalizeName(name) {
  return String(name || '').trim();
}

function normalizeDescription(description) {
  if (description === undefined || description === null) return '';
  return String(description).trim();
}

function isDescriptionTooLong(description) {
  return normalizeDescription(description).length > MAX_COLLECTION_DESCRIPTION_LENGTH;
}

function normalizeSortOrder(sortOrder) {
  const n = Number(sortOrder);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function normalizeSlug(slug) {
  return String(slug || '').trim().toLowerCase();
}

function isValidSlug(slug) {
  const normalized = normalizeSlug(slug);
  return (
    normalized.length >= MIN_COLLECTION_SLUG_LENGTH
    && normalized.length <= MAX_COLLECTION_SLUG_LENGTH
    && COLLECTION_SLUG_PATTERN.test(normalized)
  );
}

function isSlugConflictError(error) {
  const message = String(error && error.message ? error.message : error);
  return message.includes('UNIQUE constraint failed') && message.includes('collections.slug');
}

function getCollectionById(id) {
  return db.prepare(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.description,
      c.sort_order,
      c.download_count,
      c.created_at,
      c.updated_at,
      c.created_by,
      c.updated_by,
      u.username AS creator_username,
      u.name AS creator_name,
      COUNT(cs.skill_id) AS skill_count
    FROM collections c
    LEFT JOIN collection_skills cs ON cs.collection_id = c.id
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.id = ?
    GROUP BY c.id
  `).get(id);
}

function invalidateSkillRefs(skillIds) {
  for (const skillId of skillIds || []) {
    modelCache.invalidateSkill(skillId);
  }
}

function collectionBrowseVisibilityPredicate(viewer) {
  if (viewer) {
    return {
      join: 'LEFT JOIN skill_collaborators sc_view ON s.id = sc_view.skill_id AND sc_view.user_id = ?',
      where: "AND (s.visibility = 'public' OR sc_view.user_id IS NOT NULL)",
      params: [viewer.id]
    };
  }
  return { join: '', where: "AND s.visibility = 'public'", params: [] };
}

const CollectionModel = {
  create({ name, slug, description, sortOrder, actorId }) {
    const result = db.prepare(`
      INSERT INTO collections (name, slug, description, sort_order, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      normalizeName(name),
      normalizeSlug(slug),
      normalizeDescription(description),
      normalizeSortOrder(sortOrder),
      actorId,
      actorId
    );
    return getCollectionById(result.lastInsertRowid);
  },

  update(id, { name, slug, description, sortOrder, actorId }) {
    const fields = [];
    const values = [];

    if (name !== undefined) {
      fields.push('name = ?');
      values.push(normalizeName(name));
    }
    if (slug !== undefined) {
      fields.push('slug = ?');
      values.push(normalizeSlug(slug));
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(normalizeDescription(description));
    }
    if (sortOrder !== undefined) {
      fields.push('sort_order = ?');
      values.push(normalizeSortOrder(sortOrder));
    }
    if (fields.length === 0) return getCollectionById(id);

    fields.push('updated_at = CURRENT_TIMESTAMP');
    fields.push('updated_by = ?');
    values.push(actorId, id);

    db.prepare(`UPDATE collections SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return getCollectionById(id);
  },

  delete(id) {
    const affectedSkills = db.prepare(`
      SELECT skill_id
      FROM collection_skills
      WHERE collection_id = ?
    `).all(id).map((row) => row.skill_id);

    const result = db.prepare('DELETE FROM collections WHERE id = ?').run(id);
    invalidateSkillRefs(affectedSkills);
    return result.changes > 0;
  },

  exists(id) {
    const row = db.prepare('SELECT 1 FROM collections WHERE id = ?').get(id);
    return !!row;
  },

  findById(id) {
    return getCollectionById(id);
  },

  findBySlug(slug) {
    const normalized = normalizeSlug(slug);
    if (!normalized) return null;
    const row = db.prepare('SELECT id FROM collections WHERE slug = ?').get(normalized);
    if (!row) return null;
    return getCollectionById(row.id);
  },

  resolveRef(ref) {
    const raw = String(ref || '').trim();
    if (!raw) return null;

    const asId = Number(raw);
    if (Number.isInteger(asId) && asId > 0) {
      return this.findById(asId);
    }

    return this.findBySlug(raw);
  },

  countVisibleCollectionSkills(collectionId, viewer) {
    const visibility = collectionBrowseVisibilityPredicate(viewer);
    const row = db.prepare(`
      SELECT COUNT(*) AS count
      FROM collection_skills cs
      JOIN skills s ON s.id = cs.skill_id
      ${visibility.join}
      WHERE cs.collection_id = ?
      ${visibility.where}
    `).get(...visibility.params, collectionId);
    return row?.count || 0;
  },

  listAllWithUsage(viewer) {
    const collections = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.sort_order,
        c.download_count,
        c.created_at,
        c.updated_at
      FROM collections c
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    return collections.map((collection) => ({
      ...collection,
      skill_count: this.countVisibleCollectionSkills(collection.id, viewer)
    }));
  },

  listSkillCollections(skillId) {
    return db.prepare(`
      SELECT c.id, c.name
      FROM collection_skills cs
      JOIN collections c ON c.id = cs.collection_id
      WHERE cs.skill_id = ?
      ORDER BY c.sort_order ASC, c.name ASC
    `).all(skillId);
  },

  listCollectionSkills(collectionId, viewer) {
    const visibility = collectionBrowseVisibilityPredicate(viewer);
    return db.prepare(`
      SELECT s.*, u.username as owner_username, u.name as owner_name, u.avatar as owner_avatar
      FROM collection_skills cs
      JOIN skills s ON s.id = cs.skill_id
      LEFT JOIN users u ON s.owner_id = u.id
      ${visibility.join}
      WHERE cs.collection_id = ?
        ${visibility.where}
      ORDER BY cs.sort_order ASC, s.updated_at DESC
    `).all(...visibility.params, collectionId);
  },

  listAllCollectionSkills(collectionId) {
    return db.prepare(`
      SELECT s.*, u.username as owner_username, u.name as owner_name, u.avatar as owner_avatar
      FROM collection_skills cs
      JOIN skills s ON s.id = cs.skill_id
      LEFT JOIN users u ON s.owner_id = u.id
      WHERE cs.collection_id = ?
      ORDER BY cs.sort_order ASC, s.updated_at DESC
    `).all(collectionId);
  },

  incrementDownloadCount(id) {
    db.prepare(`
      UPDATE collections
      SET download_count = COALESCE(download_count, 0) + 1
      WHERE id = ?
    `).run(id);
  },

  replaceCollectionSkills(collectionId, skillIds, actorId) {
    const uniqueSkillIds = [...new Set((skillIds || []).map((id) => String(id).trim()).filter(Boolean))];

    if (uniqueSkillIds.length > MAX_COLLECTION_SKILLS) {
      throw new Error(`A collection can contain at most ${MAX_COLLECTION_SKILLS} skills`);
    }

    return db.transaction(() => {
      if (!this.exists(collectionId)) {
        throw new Error('Collection not found');
      }

      if (uniqueSkillIds.length > 0) {
        const placeholders = uniqueSkillIds.map(() => '?').join(', ');
        const rows = db.prepare(`SELECT id FROM skills WHERE id IN (${placeholders})`).all(...uniqueSkillIds);
        if (rows.length !== uniqueSkillIds.length) {
          throw new Error('One or more skills do not exist');
        }
      }

      const previousSkillIds = db.prepare(`
        SELECT skill_id
        FROM collection_skills
        WHERE collection_id = ?
      `).all(collectionId).map((row) => row.skill_id);

      db.prepare('DELETE FROM collection_skills WHERE collection_id = ?').run(collectionId);
      const insert = db.prepare(`
        INSERT INTO collection_skills (collection_id, skill_id, sort_order, created_by)
        VALUES (?, ?, ?, ?)
      `);

      uniqueSkillIds.forEach((skillId, index) => {
        insert.run(collectionId, skillId, index, actorId);
      });

      invalidateSkillRefs([...new Set([...previousSkillIds, ...uniqueSkillIds])]);
      return this.listAllCollectionSkills(collectionId);
    })();
  }
};

module.exports = CollectionModel;
module.exports.MAX_COLLECTION_SKILLS = MAX_COLLECTION_SKILLS;
module.exports.MAX_COLLECTION_DESCRIPTION_LENGTH = MAX_COLLECTION_DESCRIPTION_LENGTH;
module.exports.MIN_COLLECTION_SLUG_LENGTH = MIN_COLLECTION_SLUG_LENGTH;
module.exports.MAX_COLLECTION_SLUG_LENGTH = MAX_COLLECTION_SLUG_LENGTH;
module.exports.isDescriptionTooLong = isDescriptionTooLong;
module.exports.normalizeSlug = normalizeSlug;
module.exports.isValidSlug = isValidSlug;
module.exports.isSlugConflictError = isSlugConflictError;
