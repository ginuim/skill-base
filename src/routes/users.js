const UserModel = require('../models/user');
const { hashPassword } = require('../utils/crypto');
const db = require('../database');

async function usersRoutes(fastify, options) {
  // GET /search - User search (login required only, no admin permission needed)
  // Note: Must be registered before /:user_id
  fastify.get('/search', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { q } = request.query;
    const trimmed = q != null ? String(q).trim() : '';

    if (!trimmed) {
      const users = db.prepare(`
        SELECT id, username, name, status
        FROM users
        WHERE status = 'active'
        ORDER BY username ASC
        LIMIT 2000
      `).all();
      return reply.send({ users });
    }

    const pattern = `%${trimmed}%`;
    const users = db.prepare(`
      SELECT id, username, name, status
      FROM users
      WHERE (username LIKE ? OR name LIKE ?) AND status = 'active'
      ORDER BY username ASC
      LIMIT 100
    `).all(pattern, pattern);

    return reply.send({ users });
  });

  // Routes below require admin permission
  fastify.register(async function adminRoutes(fastify) {
    fastify.addHook('preHandler', fastify.requireAdmin);

  // GET / - User list
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

  // POST / - Create user
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
    // Record created_by when creating user
    const result = db.prepare(
      "INSERT INTO users (username, password_hash, role, name, status, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', ?, datetime('now'), datetime('now'))"
    ).run(username.trim(), passwordHash, role, name || null, request.user.id);
    
    const user = UserModel.findById(result.lastInsertRowid);
    return reply.code(201).send({ ok: true, user });
  });

  // GET /:user_id - User details
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
      is_super_admin: user.is_super_admin || 0,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
    if (user.creator_id) {
      result.created_by = { id: user.creator_id, username: user.creator_username };
    }
    
    return reply.send(result);
  });

  // PATCH /:user_id - Update user
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
      if (status === 'disabled' && !UserModel.canDemoteOrDisableSuperAdmin(userId)) {
        return reply.code(400).send({ ok: false, error: 'last_super_admin', detail: 'Cannot disable the last super admin' });
      }
      fields.status = status;
    }
    if (role !== undefined && role === 'developer' && !UserModel.canDemoteOrDisableSuperAdmin(userId)) {
      return reply.code(400).send({ ok: false, error: 'last_super_admin', detail: 'Cannot downgrade the last super admin' });
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

  // POST /:user_id/reset-password - Reset password
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

  // DELETE /:user_id - Delete user
  fastify.delete('/:user_id', async (request, reply) => {
    const userId = parseInt(request.params.user_id);
    const user = UserModel.findById(userId);

    if (!user) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'User not found' });
    }

    if (userId === request.user.id) {
      return reply.code(400).send({ ok: false, error: 'self_protection', detail: 'Cannot delete your own account' });
    }

    if (!UserModel.canDeleteSuperAdmin(userId)) {
      return reply.code(400).send({ ok: false, error: 'last_super_admin', detail: 'Cannot delete the last super admin' });
    }

    return reply.send({ ok: UserModel.delete(userId) });
  });
  });
}

module.exports = usersRoutes;
