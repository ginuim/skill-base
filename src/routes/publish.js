const fs = require('fs');
const SkillModel = require('../models/skill');
const VersionModel = require('../models/version');
const { ensureSkillDir, generateVersionNumber, getZipPath, getZipRelativePath } = require('../utils/zip');

async function publishRoutes(fastify, options) {
  // POST /publish - 发布新版本
  fastify.post('/publish', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const fields = {};
    let zipBuffer = null;
    let zipFilename = null;

    // 解析 multipart 数据
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'zip_file') {
          // 读取文件到 buffer
          const chunks = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          zipBuffer = Buffer.concat(chunks);
          zipFilename = part.filename;
        }
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value;
      }
    }

    // 检查必须的 zip 文件
    if (!zipBuffer) {
      return reply.code(400).send({ detail: 'zip_file is required' });
    }

    const { skill_id, name, description, changelog } = fields;

    // 检查 skill_id
    if (!skill_id) {
      return reply.code(400).send({ detail: 'skill_id is required' });
    }

    // 检查 skill 是否存在
    const skillExists = SkillModel.exists(skill_id);

    // 如果 skill 不存在，需要 name 字段来创建新 skill
    if (!skillExists) {
      if (!name) {
        return reply.code(400).send({ detail: 'name is required for new skill' });
      }
      // 创建新 skill
      SkillModel.create(skill_id, name, description || '', request.user.id);
    }

    // 生成版本号
    const version = generateVersionNumber();

    // 确保目录存在
    ensureSkillDir(skill_id);

    // 写入 zip 文件
    const zipPath = getZipPath(skill_id, version);
    fs.writeFileSync(zipPath, zipBuffer);

    // 获取相对路径（存入数据库）
    const zipRelativePath = getZipRelativePath(skill_id, version);

    // 创建版本记录
    const versionRecord = VersionModel.create(
      skill_id,
      version,
      changelog || '',
      zipRelativePath,
      request.user.id
    );

    // 更新 skill 的最新版本
    SkillModel.updateLatestVersion(skill_id, version);

    return {
      ok: true,
      skill_id,
      version,
      created_at: versionRecord.created_at
    };
  });
}

module.exports = publishRoutes;
