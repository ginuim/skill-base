const SkillModel = require('../models/skill');
const { hasSkillPermission, canViewSkill } = require('../utils/permission');
const screenshotsUtil = require('../utils/screenshots');

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif'
};

// Screenshots endpoints, mounted under /api/v1/skills (same prefix as skills.js)
async function screenshotsRoutes(fastify, options) {
  // GET /:skill_id/screenshots/:shot_id/file - Serve screenshot image
  fastify.get('/:skill_id/screenshots/:shot_id/file', {
    preHandler: [fastify.optionalAuth]
  }, async (request, reply) => {
    const { skill_id, shot_id } = request.params;

    if (!canViewSkill(request.user, skill_id)) {
      return reply.code(404).send({ detail: 'Screenshot not found' });
    }

    const skill = SkillModel.findById(skill_id);
    if (!skill) {
      return reply.code(404).send({ detail: 'Screenshot not found' });
    }

    const shot = screenshotsUtil.findScreenshot(screenshotsUtil.listScreenshots(skill), shot_id);
    if (!shot) {
      return reply.code(404).send({ detail: 'Screenshot not found' });
    }

    const filePath = screenshotsUtil.resolveScreenshotFile(skill_id, shot);
    if (!filePath) {
      return reply.code(404).send({ detail: 'Screenshot not found' });
    }

    const fs = require('fs');
    const ext = require('path').extname(shot.filename).toLowerCase();
    reply.header('Content-Type', shot.mime || MIME_BY_EXT[ext] || 'application/octet-stream');
    reply.header('Cache-Control', 'private, max-age=3600');
    return fs.createReadStream(filePath);
  });

  // POST /:skill_id/screenshots - Upload a screenshot (owner/collaborator, multipart field "image")
  fastify.post('/:skill_id/screenshots', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }
    if (!hasSkillPermission(request.user, skill_id, 'any')) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or collaborator permission required' });
    }

    let imageBuffer = null;
    let imageMime = null;
    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'image') {
        imageMime = part.mimetype;
        const chunks = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        imageBuffer = Buffer.concat(chunks);
      }
    }

    if (!imageBuffer) {
      return reply.code(400).send({ detail: 'image file is required' });
    }

    const result = screenshotsUtil.addScreenshot(skill_id, imageMime, imageBuffer);
    if (result.error) {
      const status = result.error === 'not_found' ? 404 : 400;
      return reply.code(status).send({ ok: false, error: result.error, detail: result.detail });
    }

    const skill = SkillModel.findById(skill_id);
    return {
      ok: true,
      skill_id,
      screenshot: {
        id: result.screenshot.id,
        url: `skills/${skill_id}/screenshots/${result.screenshot.id}/file`,
        created_at: result.screenshot.created_at
      },
      screenshots: screenshotsUtil.formatScreenshots(skill)
    };
  });

  // DELETE /:skill_id/screenshots/:shot_id - Delete a screenshot (owner/collaborator)
  fastify.delete('/:skill_id/screenshots/:shot_id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id, shot_id } = request.params;

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }
    if (!hasSkillPermission(request.user, skill_id, 'any')) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or collaborator permission required' });
    }

    const result = screenshotsUtil.removeScreenshot(skill_id, shot_id);
    if (result.error) {
      return reply.code(404).send({ ok: false, error: result.error, detail: result.detail });
    }

    const skill = SkillModel.findById(skill_id);
    return { ok: true, skill_id, screenshots: screenshotsUtil.formatScreenshots(skill) };
  });

  // PUT /:skill_id/screenshots - Reorder screenshots (owner/collaborator)
  fastify.put('/:skill_id/screenshots', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { screenshot_ids: screenshotIds } = request.body || {};

    if (!Array.isArray(screenshotIds)) {
      return reply.code(400).send({ detail: 'screenshot_ids must be an array' });
    }

    if (!SkillModel.exists(skill_id)) {
      return reply.code(404).send({ detail: 'Skill not found' });
    }
    if (!hasSkillPermission(request.user, skill_id, 'any')) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or collaborator permission required' });
    }

    const result = screenshotsUtil.reorderScreenshots(skill_id, screenshotIds);
    if (result.error) {
      const status = result.error === 'not_found' ? 404 : 400;
      return reply.code(status).send({ ok: false, error: result.error, detail: result.detail });
    }

    return {
      ok: true,
      skill_id,
      screenshots: result.screenshots.map((shot) => ({
        id: shot.id,
        url: `skills/${skill_id}/screenshots/${shot.id}/file`,
        created_at: shot.created_at || null
      }))
    };
  });
}

module.exports = screenshotsRoutes;
