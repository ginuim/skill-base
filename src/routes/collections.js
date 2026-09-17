const CollectionModel = require('../models/collection');
const {
  isDescriptionTooLong,
  isValidSlug,
  isSlugConflictError
} = require('../models/collection');
const TagModel = require('../models/tag');
const { buildCollectionZipBuffer, incrementDownloadCounts } = require('../utils/collection-bundle');

function formatSkill(skill) {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    latest_version: skill.latest_version,
    favorite_count: skill.favorite_count || 0,
    download_count: skill.download_count || 0,
    visibility: skill.visibility || 'public',
    tags: TagModel.listSkillTags(skill.id),
    collections: CollectionModel.listSkillCollections(skill.id),
    owner: {
      id: skill.owner_id,
      username: skill.owner_username,
      name: skill.owner_name,
      avatar: skill.owner_avatar || null
    },
    created_at: skill.created_at,
    updated_at: skill.updated_at
  };
}

function formatCollection(collection) {
  if (!collection) return collection;
  const { creator_username, creator_name, created_by, ...rest } = collection;
  const formatted = {
    ...rest,
    download_count: rest.download_count || 0
  };
  if (created_by) {
    formatted.created_by = {
      id: created_by,
      username: creator_username || null,
      name: creator_name || null
    };
  }
  return formatted;
}

function assertSlug(reply, slug, { required = false } = {}) {
  if (slug === undefined || slug === null || slug === '') {
    if (required) {
      reply.code(400).send({ detail: 'Collection slug is required' });
      return false;
    }
    return true;
  }
  if (!isValidSlug(slug)) {
    reply.code(400).send({
      detail: 'Collection slug must start with a letter and contain only lowercase letters, numbers, and hyphens'
    });
    return false;
  }
  return true;
}

function assertMutableFields(reply, body, requireName) {
  const name = body?.name;
  if (requireName && !String(name || '').trim()) {
    reply.code(400).send({ detail: 'Collection name is required' });
    return false;
  }
  if (name !== undefined && !String(name || '').trim()) {
    reply.code(400).send({ detail: 'Collection name is required' });
    return false;
  }
  const slug = body?.slug;
  if (requireName && (slug === undefined || slug === null || !String(slug).trim())) {
    reply.code(400).send({ detail: 'Collection slug is required' });
    return false;
  }
  if (slug !== undefined && slug !== null) {
    if (!String(slug).trim()) {
      reply.code(400).send({ detail: 'Collection slug is required' });
      return false;
    }
    if (!assertSlug(reply, slug)) {
      return false;
    }
  }
  if (body?.sort_order !== undefined && !Number.isFinite(Number(body.sort_order))) {
    reply.code(400).send({ detail: 'sort_order must be a number' });
    return false;
  }
  if (body?.description !== undefined && isDescriptionTooLong(body.description)) {
    reply.code(400).send({ detail: 'Collection description is too long' });
    return false;
  }
  return true;
}

function mutateCollection(reply, action) {
  try {
    return action();
  } catch (error) {
    if (isSlugConflictError(error)) {
      reply.code(409).send({ detail: 'Collection slug already exists' });
      return null;
    }
    throw error;
  }
}

async function collectionsRoutes(fastify) {
  fastify.get('/', {
    preHandler: [fastify.optionalAuth]
  }, async (request) => {
    return { collections: CollectionModel.listAllWithUsage(request.user).map(formatCollection) };
  });

  fastify.get('/:collection_ref', {
    preHandler: [fastify.optionalAuth]
  }, async (request, reply) => {
    const collection = CollectionModel.resolveRef(request.params.collection_ref);
    if (!collection) {
      return reply.code(404).send({ detail: 'Collection not found' });
    }

    const includePrivate = request.query?.include_private === '1' && request.user?.role === 'admin';
    const rawSkills = includePrivate
      ? CollectionModel.listAllCollectionSkills(collection.id)
      : CollectionModel.listCollectionSkills(collection.id, request.user);
    const skills = rawSkills.map(formatSkill);
    const formattedCollection = formatCollection(collection);
    formattedCollection.skill_count = skills.length;
    return { collection: formattedCollection, skills, total: skills.length };
  });

  fastify.get('/:collection_ref/download', {
    preHandler: [fastify.optionalAuth]
  }, async (request, reply) => {
    const collection = CollectionModel.resolveRef(request.params.collection_ref);
    if (!collection) {
      return reply.code(404).send({ detail: 'Collection not found' });
    }

    const skills = CollectionModel.listCollectionSkills(collection.id, request.user);
    const { buffer, fileName, packagedSkills } = buildCollectionZipBuffer(collection, skills);

    if (packagedSkills.length === 0) {
      return reply.code(404).send({ detail: 'No downloadable skills in this collection' });
    }

    incrementDownloadCounts(packagedSkills);
    CollectionModel.incrementDownloadCount(collection.id);

    reply.header('Content-Type', 'application/zip');
    reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
    return reply.send(buffer);
  });

  fastify.post('/', {
    preHandler: [fastify.requireAdmin]
  }, async (request, reply) => {
    if (!assertMutableFields(reply, request.body, true)) return reply;

    const collection = mutateCollection(reply, () => CollectionModel.create({
      name: request.body.name,
      slug: request.body.slug,
      description: request.body.description,
      sortOrder: request.body.sort_order,
      actorId: request.user.id
    }));
    if (!collection) return reply;
    return reply.code(201).send({ ok: true, collection: formatCollection(collection) });
  });

  fastify.patch('/:collection_ref', {
    preHandler: [fastify.requireAdmin]
  }, async (request, reply) => {
    const collection = CollectionModel.resolveRef(request.params.collection_ref);
    if (!collection) {
      return reply.code(404).send({ detail: 'Collection not found' });
    }
    if (!assertMutableFields(reply, request.body, false)) return reply;

    const updated = mutateCollection(reply, () => CollectionModel.update(collection.id, {
      name: request.body?.name,
      slug: request.body?.slug,
      description: request.body?.description,
      sortOrder: request.body?.sort_order,
      actorId: request.user.id
    }));
    if (!updated) return reply;
    return { ok: true, collection: formatCollection(updated) };
  });

  fastify.delete('/:collection_ref', {
    preHandler: [fastify.requireAdmin]
  }, async (request, reply) => {
    const collection = CollectionModel.resolveRef(request.params.collection_ref);
    if (!collection) {
      return reply.code(404).send({ detail: 'Collection not found' });
    }

    const deleted = CollectionModel.delete(collection.id);
    if (!deleted) {
      return reply.code(404).send({ detail: 'Collection not found' });
    }
    return { ok: true };
  });

  fastify.put('/:collection_ref/skills', {
    preHandler: [fastify.requireAdmin]
  }, async (request, reply) => {
    const collection = CollectionModel.resolveRef(request.params.collection_ref);
    const { skill_ids: skillIds } = request.body || {};

    if (!collection) {
      return reply.code(404).send({ detail: 'Collection not found' });
    }
    if (skillIds !== undefined && !Array.isArray(skillIds)) {
      return reply.code(400).send({ detail: 'skill_ids must be an array' });
    }

    try {
      const skills = CollectionModel.replaceCollectionSkills(collection.id, skillIds || [], request.user.id).map(formatSkill);
      return { ok: true, collection_id: collection.id, skills };
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      if (message.includes('Collection not found')) {
        return reply.code(404).send({ detail: 'Collection not found' });
      }
      if (message.includes('skills do not exist')) {
        return reply.code(400).send({ detail: 'One or more skills do not exist' });
      }
      if (message.includes('can contain at most')) {
        return reply.code(400).send({ detail: message });
      }
      throw error;
    }
  });
}

module.exports = collectionsRoutes;
