const UserModel = require('../models/user');
const { hashPassword } = require('../utils/crypto');
const db = require('../database');

async function usersRoutes(fastify, options) {
  // GET /search - 用户搜索（仅需登录，不需要管理员权限）
  // 注意：必须在 /:user_id 之前注册
  fastify.get('/search', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { q } = request.query;
    
    if (!q || q.trim().length < 1) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Search keyword must be at least 1 character' });
    }
    
    const pattern = `%${q.trim()}%`;
    const users = db.prepare(`
      SELECT id, username, name, status
      FROM users
      WHERE (username LIKE ? OR name LIKE ?) AND status = 'active'
      LIMIT 10
    `).all(pattern, pattern);
    
    return reply.send({ users });
  });

  // 以下路由都需要管理员权限
  fastify.register(async function adminRoutes(fastify) {
    fastify.addHook('preHandler', fastify.requireAdmin);

  // GET / - 用户列表
  fastify.get('/', async (request, reply) => {
    const { q, status, page = 1, limit = 20 } = request.query;
    const result = UserModel.list({
      q,
      status,
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 100)
    });
    return reply.send(result);
  });

  // POST / - 创建用户
  fastify.post('/', async (request, reply) => {
    const { username, password, role = 'developer', name } = request.body || {};
    
    if (!username || !password) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Username and password are required' });
    }
    if (password.length < 6) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Password must be at least 6 characters' });
    }
    if (!['admin', 'developer'].includes(role)) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Role must be admin or developer' });
    }
    
    // Check if username already exists
    const existing = UserModel.findByUsername(username.trim());
    if (existing) {
      return reply.code(400).send({ ok: false, error: 'username_exists', detail: 'Username already exists' });
    }
    
    const passwordHash = await hashPassword(password);
    // 创建用户时记录 created_by
    const result = db.prepare(
      "INSERT INTO users (username, password_hash, role, name, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))"
    ).run(username.trim(), passwordHash, role, name || null, request.user.id);
    
    const user = UserModel.findById(result.lastInsertRowid);
    return reply.code(201).send({ ok: true, user });
  });

  // GET /:user_id - 用户详情
  fastify.get('/:user_id', async (request, reply) => {
    const { user_id } = request.params;
    const user = UserModel.findByIdWithCreator(parseInt(user_id));
    
    if (!user) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'User not found' });
    }
    
    // Format created_by
    const result = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    if (user.creator_id) {
      result.created_by = { id: user.creator_id, username: user.creator_username };
    }
    
    return reply.send(result);
  });

  // PATCH /:user_id - 更新用户
  fastify.patch('/:user_id', async (request, reply) => {
    const userId = parseInt(request.params.user_id);
    const { role, status, name } = request.body || {};
    
    const user = UserModel.findById(userId);
    if (!user) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'User not found' });
    }
    
    // Self-protection for admins
    if (userId === request.user.id) {
      if (status === 'disabled') {
        return reply.code(400).send({ ok: false, error: 'self_protection', detail: 'Cannot disable your own account' });
      }
      if (role === 'developer') {
        return reply.code(400).send({ ok: false, error: 'self_protection', detail: 'Cannot downgrade your own role' });
      }
    }
    
    // Validate field values
    const fields = {};
    if (role !== undefined) {
      if (!['admin', 'developer'].includes(role)) {
        return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Role must be admin or developer' });
      }
      fields.role = role;
    }
    if (status !== undefined) {
      if (!['active', 'disabled'].includes(status)) {
        return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Status must be active or disabled' });
      }
      fields.status = status;
    }
    if (name !== undefined) {
      fields.name = name;
    }
    
    if (Object.keys(fields).length === 0) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'No fields to update' });
    }
    
    UserModel.update(userId, fields);
    const updated = UserModel.findById(userId);
    return reply.send({ ok: true, user: updated });
  });

  // POST /:user_id/reset-password - 重置密码
  fastify.post('/:user_id/reset-password', async (request, reply) => {
    const userId = parseInt(request.params.user_id);
    const { new_password } = request.body || {};
    
    if (!new_password || new_password.length < 6) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'New password must be at least 6 characters' });
    }
    
    const user = UserModel.findById(userId);
    if (!user) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'User not found' });
    }
    
    const passwordHash = await hashPassword(new_password);
    UserModel.resetPassword(userId, passwordHash);
    
    return reply.send({ ok: true, message: 'Password has been reset' });
  });
  });
}

module.exports = usersRoutes;
