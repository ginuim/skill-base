const fs = require('fs');
const path = require('path');
const SkillModel = require('../models/skill');
const VersionModel = require('../models/version');
const { getZipPath } = require('../utils/zip');

// 格式化 skill，将 owner 转为对象
function formatSkill(skill) {
  if (!skill) return null;
  return {
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
}

// 格式化 version，将 uploader 转为对象
function formatVersion(version) {
  if (!version) return null;
  return {
    id: version.id,
    skill_id: version.skill_id,
    version: version.version,
    changelog: version.changelog,
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
  fastify.get('/', async (request, reply) => {
    const { q } = request.query;
    const skills = SkillModel.search(q);
    const formattedSkills = skills.map(formatSkill);

    return {
      skills: formattedSkills,
      total: formattedSkills.length
    };
  });

  // GET /:skill_id - 获取单个 skill
  fastify.get('/:skill_id', async (request, reply) => {
    const { skill_id } = request.params;
    const skill = SkillModel.findById(skill_id);

    if (!skill) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }

    return formatSkill(skill);
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

    // 获取文件路径
    const zipPath = getZipPath(skill_id, versionRecord.version);

    // 检查文件是否存在
    if (!fs.existsSync(zipPath)) {
      return reply.code(404).send({ detail: 'Version not found' });
    }

    // 设置响应头并返回文件流
    const fileName = `${skill_id}-${versionRecord.version}.zip`;
    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);

    return fs.createReadStream(zipPath);
  });
}

module.exports = skillsRoutes;
