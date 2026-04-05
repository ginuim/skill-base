const fs = require('fs');
const db = require('../database');
const SkillModel = require('../models/skill');
const VersionModel = require('../models/version');
const { invalidateSkill } = require('../utils/model-cache');
const { ensureSkillDir, generateVersionNumber, getZipPath, getZipRelativePath } = require('../utils/zip');
const { canPublishSkill } = require('../utils/permission');

async function publishRoutes(fastify, options) {
  // POST /publish - Publish new version
  fastify.post('/publish', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const fields = {};
    let zipBuffer = null;
    let zipFilename = null;

    // Parse multipart data
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'zip_file') {
          // Read file into buffer
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

    // Check required zip file
    if (!zipBuffer) {
      return reply.code(400).send({ detail: 'zip_file is required' });
    }

    const { skill_id, name, description, changelog } = fields;

    // Check skill_id
    if (!skill_id) {
      return reply.code(400).send({ detail: 'skill_id is required' });
    }

    // Check publish permission
    if (!canPublishSkill(request.user, skill_id)) {
      return reply.code(403).send({
        ok: false,
        error: 'permission_denied',
        detail: 'You do not have publish permission for this Skill'
      });
    }

    // Check if skill exists
    const skillExists = SkillModel.exists(skill_id);

    // If skill does not exist, name field is required to create new skill
    if (!skillExists) {
      if (!name) {
        return reply.code(400).send({ detail: 'name is required for new skill' });
      }
      // Use transaction to create new skill and add owner collaborator record
      const createSkillTx = db.transaction(() => {
        SkillModel.create(skill_id, name, description || '', request.user.id);
        db.prepare(
          'INSERT INTO skill_collaborators (skill_id, user_id, role, created_by) VALUES (?, ?, ?, ?)'
        ).run(skill_id, request.user.id, 'owner', request.user.id);
      });
      createSkillTx();
    }

    // Generate version number
    const version = generateVersionNumber();

    // Ensure directory exists
    ensureSkillDir(skill_id);

    // Write zip file
    const zipPath = getZipPath(skill_id, version);
    fs.writeFileSync(zipPath, zipBuffer);

    // Get relative path (stored in database)
    const zipRelativePath = getZipRelativePath(skill_id, version);

    // Create version record
    const versionRecord = VersionModel.create(
      skill_id,
      version,
      changelog || '',
      zipRelativePath,
      request.user.id,
      description || ''
    );

    // Update skill's latest version
    SkillModel.updateLatestVersion(skill_id, version);
    invalidateSkill(skill_id);

    return {
      ok: true,
      skill_id,
      version,
      created_at: versionRecord.created_at
    };
  });
}

module.exports = publishRoutes;
