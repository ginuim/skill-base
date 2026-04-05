const db = require('../database');
const UserModel = require('../models/user');
const { verifyPassword, hashPassword, generateCliCode, generatePAT } = require('../utils/crypto');

async function authRoutes(fastify, options) {
  // POST /login - User login
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body || {};

    if (!username || !password) {
      return reply.code(400).send({ detail: 'Username and password are required' });
    }

    // Find user
    const user = UserModel.findByUsername(username);
    if (!user) {
      return reply.code(401).send({ detail: 'Invalid username or password' });
    }

    // Check account status
    if (user.status === 'disabled') {
      return reply.code(401).send({
        ok: false,
        error: 'account_disabled',
        detail: 'Account is disabled'
      });
    }

    // Verify password
    if (!verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ detail: 'Invalid username or password' });
    }

    // Create session and set cookie
    const sessionId = fastify.createSession(user.id);
    reply.setCookie('session_id', sessionId, { path: '/', httpOnly: true });

    return { ok: true, user: { id: user.id, username: user.username, name: user.name || null, role: user.role } };
  });

  // POST /logout - User logout
  fastify.post('/logout', async (request, reply) => {
    const sessionId = request.cookies?.session_id;
    if (sessionId) {
      fastify.destroySession(sessionId);
    }
    reply.clearCookie('session_id', { path: '/' });
    return { ok: true };
  });

  // POST /cli-code/generate - Generate CLI verification code
  fastify.post('/cli-code/generate', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const code = generateCliCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Write to cli_auth_codes table
    db.prepare(`
      INSERT INTO cli_auth_codes (code, user_id, expires_at, used)
      VALUES (?, ?, ?, FALSE)
    `).run(code, request.user.id, expiresAt);

    return { ok: true, code, expires_at: expiresAt };
  });

  // POST /cli-code/verify - Verify CLI verification code
  fastify.post('/cli-code/verify', async (request, reply) => {
    const { code } = request.body || {};

    if (!code) {
      return reply.code(400).send({ detail: 'Code is required' });
    }

    // Find verification code: unused and not expired
    const codeRecord = db.prepare(`
      SELECT * FROM cli_auth_codes
      WHERE code = ? AND used = FALSE AND expires_at > datetime('now')
    `).get(code);

    if (!codeRecord) {
      return reply.code(401).send({ detail: 'Invalid or expired code' });
    }

    // Mark as used
    db.prepare('UPDATE cli_auth_codes SET used = TRUE WHERE code = ?').run(code);

    // Generate PAT
    const token = generatePAT();
    db.prepare(`
      INSERT INTO personal_access_tokens (token, user_id, description)
      VALUES (?, ?, ?)
    `).run(token, codeRecord.user_id, 'CLI generated token');

    // Get user info
    const user = UserModel.findById(codeRecord.user_id);

    return {
      ok: true,
      token,
      user: { id: user.id, username: user.username, name: user.name || null }
    };
  });

  // GET /me - Get current user info
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return request.user;
  });

  // PATCH /me - Update personal info (username and name)
  fastify.patch('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { username, name } = request.body || {};

    // At least one field must be provided
    if (username === undefined && name === undefined) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'At least one field must be provided' });
    }

    // Validate username
    if (username !== undefined) {
      if (typeof username !== 'string' || username.trim().length === 0) {
        return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Username cannot be empty' });
      }
      const trimmed = username.trim();
      // Check if username already exists (exclude self)
      const existing = UserModel.findByUsername(trimmed);
      if (existing && existing.id !== request.user.id) {
        return reply.code(400).send({ ok: false, error: 'username_exists', detail: 'Username already exists' });
      }
    }

    UserModel.updateProfile(request.user.id, {
      username: username ? username.trim() : undefined,
      name: name !== undefined ? name : undefined
    });
    const updated = UserModel.findById(request.user.id);

    return reply.send({ ok: true, user: updated });
  });

  // POST /me/change-password - Change password
  fastify.post('/me/change-password', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { old_password, new_password } = request.body || {};

    if (!old_password || !new_password) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'Old password and new password are required' });
    }

    if (new_password.length < 6) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'New password must be at least 6 characters' });
    }

    // Verify old password - need to get user info with password
    const user = UserModel.findByUsername(request.user.username);

    if (!verifyPassword(old_password, user.password_hash)) {
      return reply.code(400).send({ ok: false, error: 'wrong_password', detail: 'Incorrect old password' });
    }

    const newHash = hashPassword(new_password);
    UserModel.updatePassword(request.user.id, newHash);

    return reply.send({ ok: true, message: 'Password changed successfully' });
  });
}

module.exports = authRoutes;
