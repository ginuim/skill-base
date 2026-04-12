const { publishSkillFromZip } = require('../utils/publish-skill');

async function publishRoutes(fastify, options) {
  fastify.post('/publish', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const fields = {};
    let zipBuffer = null;

    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname === 'zip_file') {
          const chunks = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
          }
          zipBuffer = Buffer.concat(chunks);
        }
      } else if (part.type === 'field') {
        fields[part.fieldname] = part.value;
      }
    }

    const { skill_id, name, description, changelog } = fields;

    const result = publishSkillFromZip({
      user: request.user,
      skillId: skill_id,
      name,
      description,
      changelog,
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

module.exports = publishRoutes;
