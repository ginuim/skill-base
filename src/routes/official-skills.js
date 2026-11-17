const path = require('node:path');
const AdmZip = require('adm-zip');

const officialSkills = new Set(['skill-base', 'skill-base-web-deploy', 'skill-base-cli']);

module.exports = async function officialSkillRoutes(fastify) {
  fastify.get('/:skill_id/download', async (request, reply) => {
    const { skill_id: skillId } = request.params;
    if (!officialSkills.has(skillId)) {
      return reply.code(404).send({ detail: 'Official skill not found' });
    }

    const archive = new AdmZip();
    archive.addLocalFolder(path.join(__dirname, '../../skills', skillId), skillId);
    return reply
      .type('application/zip')
      .header('Content-Disposition', `attachment; filename="${skillId}.zip"`)
      .send(archive.toBuffer());
  });
};
