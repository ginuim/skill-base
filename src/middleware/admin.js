const fp = require('fastify-plugin');

async function adminPlugin(fastify, options) {
  fastify.decorate('requireAdmin', async function(request, reply) {
    // 1. First call authenticate to ensure logged in
    await fastify.authenticate(request, reply);
    if (reply.sent) return;
    
    // 2. Check admin role
    if (request.user.role !== 'admin') {
      return reply.code(403).send({
        ok: false,
        error: 'forbidden',
        detail: 'Admin permission required'
      });
    }
  });
}

module.exports = fp(adminPlugin, {
  name: 'admin-plugin',
  dependencies: ['auth-plugin']
});
