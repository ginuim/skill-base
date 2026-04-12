const {
  GitHubImportError,
  loadGithubSkillPayload,
  previewGithubImport,
  buildPublishZipBuffer,
  suggestedImportSkillId,
  checkGithubConnectivity
} = require('../utils/github-import');
const { publishSkillFromZip } = require('../utils/publish-skill');
const SkillModel = require('../models/skill');
const { canPublishSkill } = require('../utils/permission');

function mapGithubError(reply, err) {
  if (err instanceof GitHubImportError) {
    return reply.code(err.statusCode).send({
      ok: false,
      error: err.code,
      detail: err.message
    });
  }
  return reply.code(502).send({
    ok: false,
    error: 'import_failed',
    detail: err && err.message ? err.message : String(err)
  });
}

async function importGithubRoutes(fastify) {
  fastify.get('/import/github/connectivity', {
    preHandler: [fastify.authenticate]
  }, async () => checkGithubConnectivity());

  fastify.post('/import/github/preview', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { source, ref, subpath } = request.body || {};
    try {
      const payload = await loadGithubSkillPayload(source, ref, subpath);
      return previewGithubImport(request.user, payload);
    } catch (err) {
      return mapGithubError(reply, err);
    }
  });

  fastify.post('/import/github', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { source, ref, subpath, target_skill_id, changelog } = request.body || {};
    const target = String(target_skill_id || '').trim();

    if (!target || !/^[\w-]+$/.test(target)) {
      return reply.code(400).send({
        ok: false,
        error: 'invalid_target_id',
        detail: 'target_skill_id is required and must match /^[\\w-]+$/'
      });
    }

    let payload;
    try {
      payload = await loadGithubSkillPayload(source, ref, subpath);
    } catch (err) {
      return mapGithubError(reply, err);
    }

    if (SkillModel.exists(target) && !canPublishSkill(request.user, target)) {
      return reply.code(409).send({
        ok: false,
        error: 'skill_id_conflict',
        detail:
          'This skill id already exists and you do not have publish permission. Choose another target_skill_id.',
        default_skill_id: payload.default_skill_id,
        suggested_skill_id: suggestedImportSkillId(payload.owner, payload.repo)
      });
    }

    let zipBuffer;
    try {
      zipBuffer = buildPublishZipBuffer(payload.files, target);
    } catch (err) {
      return mapGithubError(reply, err);
    }

    const nameForCreate = payload.name && String(payload.name).trim() ? payload.name : target;
    const descForCreate = payload.description != null ? String(payload.description) : '';

    const result = publishSkillFromZip({
      user: request.user,
      skillId: target,
      name: nameForCreate,
      description: descForCreate,
      changelog: changelog != null ? String(changelog) : '',
      zipBuffer
    });

    if (!result.ok) {
      return reply.code(result.status).send(result.body);
    }

    return {
      ok: true,
      skill_id: result.skill_id,
      version: result.version,
      created_at: result.created_at
    };
  });
}

module.exports = importGithubRoutes;
