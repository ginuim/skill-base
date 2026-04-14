const fs = require('fs');
const path = require('path');
const db = require('../database');
const SkillModel = require('../models/skill');
const VersionModel = require('../models/version');
const FavoriteModel = require('../models/favorite');
const TagModel = require('../models/tag');
const { getZipPath, resolveZipPath } = require('../utils/zip');
const { canManageSkill } = require('../utils/permission');
const { parseWebhookUrlField, notifySkillWebhook, canViewSkillWebhook } = require('../utils/skill-webhook');

function listCollaboratorUsersForSkillDetail(skillId) {
  const rows = db.prepare(`
    SELECT u.id as user_id, u.username, u.name
    FROM skill_collaborators sc
    JOIN users u ON sc.user_id = u.id
    WHERE sc.skill_id = ? AND sc.role = 'collaborator'
    ORDER BY sc.created_at ASC
  `).all(skillId);
  return rows.map((r) => ({
    id: r.user_id,
    username: r.username,
    name: r.name
  }));
}

// Format skill, convert owner to object
function formatSkill(skill, currentUser) {
  if (!skill) return null;
  const result = {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    latest_version: skill.latest_version,
    favorite_count: skill.favorite_count || 0,
    download_count: skill.download_count || 0,
    tags: TagModel.listSkillTags(skill.id),
    owner: {
      id: skill.owner_id,
      username: skill.owner_username,
      name: skill.owner_name
    },
    created_at: skill.created_at,
    updated_at: skill.updated_at
  };

  if (currentUser) {
    if (currentUser.role === 'admin' || currentUser.id === skill.owner_id) {
      result.permission = 'owner';
    } else {
      const collab = db.prepare('SELECT role FROM skill_collaborators WHERE skill_id = ? AND user_id = ?').get(skill.id, currentUser.id);
      if (collab) {
        result.permission = collab.role;
      } else {
        result.permission = 'user';
      }
    }
  } else {
    result.permission = 'user';
  }

  result.is_favorited = currentUser ? FavoriteModel.isFavorited(currentUser.id, skill.id) : false;

  if (canViewSkillWebhook(currentUser, result.permission)) {
    result.webhook_url = skill.webhook_url || null;
  }

  return result;
}

// Format version, convert uploader to object
function formatVersion(version) {
  if (!version) return null;
  return {
    id: version.id,
    skill_id: version.skill_id,
    version: version.version,
    changelog: version.changelog,
    description: version.description,
    download_count: version.download_count || 0,
    zip_path: version.zip_path,
    uploader: {
      id: version.uploader_id,
      username: version.uploader_username,
      name: version.uploader_name
    },
    created_at: version.created_at
  };
}

async function skillsRoutes(fastify, options) {
  function resolveExistingZipPath(skillId, versionRecord) {
    const zipPath = resolveZipPath(versionRecord.zip_path, skillId, versionRecord.version);
    const fallbackZipPath = getZipPath(skillId, versionRecord.version);

    if (!fs.existsSync(zipPath) && !fs.existsSync(fallbackZipPath)) {
      return null;
    }

    return fs.existsSync(zipPath) ? zipPath : fallbackZipPath;
  }

  // GET / - Get skills list
  fastify.get('/', { preHandler: [fastify.optionalAuth] }, async (request, reply) => {
    const { q } = request.query;
    const skills = SkillModel.search(q);
    const formattedSkills = skills.map(skill => formatSkill(skill, request.user));

    return {
      skills: formattedSkills,
      total: formattedSkills.length
    };
  });

  // GET /:skill_id - Get single skill
  fastify.get('/:skill_id', { preHandler: [fastify.optionalAuth] }, async (request, reply) => {
    const { skill_id } = request.params;
    const skill = SkillModel.findById(skill_id);

    if (!skill) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    const formatted = formatSkill(skill, request.user);
    formatted.collaborators = listCollaboratorUsersForSkillDetail(skill_id);
    return formatted;
  });

  // GET /:skill_id/versions - Get all versions of a skill
  fastify.get('/:skill_id/versions', async (request, reply) => {
    const { skill_id } = request.params;

    // First check if skill exists
    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    const versions = VersionModel.listBySkillId(skill_id);
    const formattedVersions = versions.map(formatVersion);

    return {
      skill_id,
      versions: formattedVersions
    };
  });

  // GET /:skill_id/versions/:version/download - Download version zip file
  fastify.get('/:skill_id/versions/:version/download', async (request, reply) => {
    const { skill_id, version } = request.params;

    let versionRecord;

    if (version === 'latest') {
      versionRecord = VersionModel.getLatest(skill_id);
    } else {
      versionRecord = VersionModel.findByVersion(skill_id, version);
    }

    if (!versionRecord) {
      return reply.code(404).send({ detail: 'Version not found' });
    }

    const finalZipPath = resolveExistingZipPath(skill_id, versionRecord);
    if (!finalZipPath) {
      return reply.code(404).send({ detail: 'Version not found' });
    }

    SkillModel.incrementDownloadCount(skill_id);
    VersionModel.incrementDownloadCount(skill_id, versionRecord.version);

    // Set response headers and return file stream
    const fileName = `${skill_id}-${versionRecord.version}.zip`;
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

    return fs.createReadStream(finalZipPath);
  });

  // GET /:skill_id/versions/:version/view - View version zip file without counting download
  fastify.get('/:skill_id/versions/:version/view', async (request, reply) => {
    const { skill_id, version } = request.params;

    const versionRecord = version === 'latest'
      ? VersionModel.getLatest(skill_id)
      : VersionModel.findByVersion(skill_id, version);

    if (!versionRecord) {
      return reply.code(404).send({ detail: 'Version not found' });
    }

    const finalZipPath = resolveExistingZipPath(skill_id, versionRecord);
    if (!finalZipPath) {
      return reply.code(404).send({ detail: 'Version not found' });
    }

    const fileName = `${skill_id}-${versionRecord.version}.zip`;
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `inline; filename="${fileName}"`);

    return fs.createReadStream(finalZipPath);
  });

  // POST /:skill_id/favorite - Favorite skill
  fastify.post('/:skill_id/favorite', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    FavoriteModel.add(request.user.id, skill_id);
    const skill = SkillModel.findById(skill_id);

    return {
      ok: true,
      skill_id,
      favorited: true,
      favorite_count: skill.favorite_count || 0
    };
  });

  // DELETE /:skill_id/favorite - Unfavorite skill
  fastify.delete('/:skill_id/favorite', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    FavoriteModel.remove(request.user.id, skill_id);
    const skill = SkillModel.findById(skill_id);

    return {
      ok: true,
      skill_id,
      favorited: false,
      favorite_count: skill.favorite_count || 0
    };
  });

  // PUT /:skill_id/tags - Replace skill tags
  fastify.put('/:skill_id/tags', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { tag_ids } = request.body || {};

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }

    if (tag_ids !== undefined && !Array.isArray(tag_ids)) {
      return reply.code(400).send({ detail: 'tag_ids must be an array' });
    }

    const tags = TagModel.replaceSkillTags(skill_id, tag_ids || [], request.user.id);
    return { ok: true, skill_id, tags };
  });

  // PUT /:skill_id - Update skill basic info
  fastify.put('/:skill_id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { name, description, webhook_url: webhookUrlRaw } = request.body || {};

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }

    const parsed = parseWebhookUrlField(webhookUrlRaw);
    if (!parsed.ok) {
      return reply.code(400).send({ detail: parsed.detail });
    }

    const prev = SkillModel.findById(skill_id);
    const webhookColumn = parsed.omit ? undefined : parsed.value;
    const updated = SkillModel.update(skill_id, name, description, webhookColumn);

    const metaChanged =
      (name !== undefined && String(name) !== String(prev.name)) ||
      (description !== undefined && String(description ?? '') !== String(prev.description ?? ''));
    if (metaChanged) {
      notifySkillWebhook(
        updated,
        'skill.updated',
        { kind: 'metadata', name: updated.name, description: updated.description },
        request.user
      );
    }

    return formatSkill(updated, request.user);
  });

  // PUT /:skill_id/head - Set skill's latest version (Head pointer)
  fastify.put('/:skill_id/head', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { version } = request.body || {};

    if (!version) {
      return reply.code(400).send({ detail: 'Version is required' });
    }

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }

    const versionRecord = VersionModel.findByVersion(skill_id, version);
    if (!versionRecord) {
      return reply.code(404).send({ detail: 'Version not found' });
    }

    SkillModel.updateLatestVersion(skill_id, version);
    notifySkillWebhook(
      SkillModel.findById(skill_id),
      'skill.updated',
      { kind: 'head', latest_version: version },
      request.user
    );
    return { ok: true, skill_id, latest_version: version };
  });

  // PATCH /:skill_id/versions/:version - Update description and changelog for specified version
  fastify.patch('/:skill_id/versions/:version', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id, version } = request.params;
    const { description, changelog } = request.body || {};

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }

    const versionRecord = VersionModel.findByVersion(skill_id, version);
    if (!versionRecord) {
      return reply.code(404).send({ detail: 'Version not found' });
    }

    const updated = VersionModel.update(versionRecord.id, description, changelog);
    notifySkillWebhook(
      SkillModel.findById(skill_id),
      'skill.updated',
      { kind: 'version_metadata', version },
      request.user
    );
    return formatVersion(updated);
  });
}

module.exports = skillsRoutes;
