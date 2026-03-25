const fp = require('fastify-plugin');

async function adminPlugin(fastify, options) {
  fastify.decorate('requireAdmin', async function(request, reply) {
    // 1. 先调用 authenticate 确保已登录
    await fastify.authenticate(request, reply);
    if (reply.sent) return;
    
    // 2. 检查管理员角色
    if (request.user.role !== 'admin') {
      return reply.code(403).send({
        ok: false,
        error: 'forbidden',
        detail: '需要管理员权限'
      });
    }
  });
}

module.exports = fp(adminPlugin, {
  name: 'admin-plugin',
  dependencies: ['auth-plugin']
});
