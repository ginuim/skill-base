const TagModel = require('../models/tag');
const { isSuperAdmin } = require('../utils/permission');

async function tagsRoutes(fastify) {
  async function requireSuperAdmin(request, reply) {
    if (!isSuperAdmin(request.user)) {
      return reply.code(403).send({
        ok: false,
        error: 'forbidden',
        detail: 'Super admin permission required'
      });
    }
  }

  fastify.get('/', {
    preHandler: [fastify.authenticate]
  }, async () => {
    return { tags: TagModel.listAllWithUsage() };
  });

  fastify.post('/', {
    preHandler: [fastify.authenticate, requireSuperAdmin]
  }, async (request, reply) => {
    const name = String(request.body?.name || '').trim();
    if (!name) {
      return reply.code(400).send({ detail: 'Tag name is required' });
    }

    const tag = TagModel.create({ name, actorId: request.user.id });
    return reply.code(201).send({ ok: true, tag });
  });

  fastify.patch('/:tag_id', {
    preHandler: [fastify.authenticate, requireSuperAdmin]
  }, async (request, reply) => {
    const tagId = parseInt(request.params.tag_id, 10);
    const name = String(request.body?.name || '').trim();
    if (!Number.isInteger(tagId) || tagId <= 0) {
      return reply.code(400).send({ detail: 'Invalid tag id' });
    }
    if (!name) {
      return reply.code(400).send({ detail: 'Tag name is required' });
    }

    const tag = TagModel.update(tagId, { name, actorId: request.user.id });
    if (!tag) {
      return reply.code(404).send({ detail: 'Tag not found' });
    }
    return { ok: true, tag };
  });

  fastify.delete('/:tag_id', {
    preHandler: [fastify.authenticate, requireSuperAdmin]
  }, async (request, reply) => {
    const tagId = parseInt(request.params.tag_id, 10);
    if (!Number.isInteger(tagId) || tagId <= 0) {
      return reply.code(400).send({ detail: 'Invalid tag id' });
    }

    const deleted = TagModel.delete(tagId);
    if (!deleted) {
      return reply.code(404).send({ detail: 'Tag not found' });
    }
    return { ok: true };
  });
}

module.exports = tagsRoutes;
