const fs = require('fs');
const path = require('path');
const SkillModel = require('../models/skill');
const VersionModel = require('../models/version');
const { getZipPath, resolveZipPath } = require('../utils/zip');
const { canManageSkill } = require('../utils/permission');

// 格式化 skill，将 owner 转为对象
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
      const db = require('../database');
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

// 格式化 version，将 uploader 转为对象
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
  // GET / - 获取 skills 列表
  fastify.get('/', { preHandler: [fastify.optionalAuth] }, async (request, reply) => {
    const { q } = request.query;
    const skills = SkillModel.search(q);
    const formattedSkills = skills.map(skill => formatSkill(skill, request.user));

    return {
      skills: formattedSkills,
      total: formattedSkills.length
    };
  });

  // GET /:skill_id - 获取单个 skill
  fastify.get('/:skill_id', { preHandler: [fastify.optionalAuth] }, async (request, reply) => {
    const { skill_id } = request.params;
    const skill = SkillModel.findById(skill_id);

    if (!skill) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    return formatSkill(skill, request.user);
  });

  // GET /:skill_id/versions - 获取 skill 的所有版本
  fastify.get('/:skill_id/versions', async (request, reply) => {
    const { skill_id } = request.params;

    // 先检查 skill 是否存在
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

  // GET /:skill_id/versions/:version/download - 下载版本 zip 文件
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

    // 优先使用数据库里的 zip_path，兼容历史数据；缺失时再回退到规则路径
    const zipPath = resolveZipPath(versionRecord.zip_path, skill_id, versionRecord.version);
    const fallbackZipPath = getZipPath(skill_id, versionRecord.version);

    // 检查文件是否存在
    if (!fs.existsSync(zipPath)) {
      if (!fs.existsSync(fallbackZipPath)) {
        return reply.code(404).send({ detail: 'Version not found' });
      }
    }

    const finalZipPath = fs.existsSync(zipPath) ? zipPath : fallbackZipPath;

    // 设置响应头并返回文件流
    const fileName = `${skill_id}-${versionRecord.version}.zip`;
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

    return fs.createReadStream(finalZipPath);
  });

  // PUT /:skill_id - 更新 skill 的基本信息
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

  // PUT /:skill_id/head - 设置 skill 的最新版本 (Head 指针)
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

  // PATCH /:skill_id/versions/:version - 更新指定版本的介绍和日志
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
