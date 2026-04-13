const fs = require('fs');
const path = require('path');
const db = require('../database');
const SkillModel = require('../models/skill');
const VersionModel = require('../models/version');
const { getZipPath, resolveZipPath } = require('../utils/zip');
const { canManageSkill } = require('../utils/permission');

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
    owner: {
      id: skill.owner_id,
      username: skill.owner_username,
      name: skill.owner_name
    },
    created_at: skill.created_at,
    updated_at: skill.updated_at
  };

  if (currentUser) {
    if (currentUser.id === skill.owner_id) {
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

    // Prefer using zip_path from database for backward compatibility; fallback to rule-based path if missing
    const zipPath = resolveZipPath(versionRecord.zip_path, skill_id, versionRecord.version);
    const fallbackZipPath = getZipPath(skill_id, versionRecord.version);

    // Check if file exists
    if (!fs.existsSync(zipPath)) {
      if (!fs.existsSync(fallbackZipPath)) {
        return reply.code(404).send({ detail: 'Version not found' });
      }
    }

    const finalZipPath = fs.existsSync(zipPath) ? zipPath : fallbackZipPath;

    // Set response headers and return file stream
    const fileName = `${skill_id}-${versionRecord.version}.zip`;
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

    return fs.createReadStream(finalZipPath);
  });

  // PUT /:skill_id - Update skill basic info
  fastify.put('/:skill_id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { name, description } = request.body || {};

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }

    const updated = SkillModel.update(skill_id, name, description);
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
    return formatVersion(updated);
  });
}

module.exports = skillsRoutes;
