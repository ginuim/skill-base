const db = require('../database');
const UserModel = require('../models/user');
const { verifyPassword, generateCliCode, generatePAT } = require('../utils/crypto');

async function authRoutes(fastify, options) {
  // POST /login - 用户登录
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body || {};

    if (!username || !password) {
      return reply.code(400).send({ detail: '用户名和密码不能为空' });
    }

    // 查找用户
    const user = UserModel.findByUsername(username);
    if (!user) {
      return reply.code(401).send({ detail: '用户名或密码错误' });
    }

    // 验证密码
    if (!verifyPassword(password, user.password_hash)) {
      return reply.code(401).send({ detail: '用户名或密码错误' });
    }

    // 创建 session 并设置 cookie
    const sessionId = fastify.createSession(user.id);
    reply.setCookie('session_id', sessionId, { path: '/', httpOnly: true });

    return { ok: true, user: { id: user.id, username: user.username, role: user.role } };
  });

  // POST /logout - 用户登出
  fastify.post('/logout', async (request, reply) => {
    const sessionId = request.cookies?.session_id;
    if (sessionId) {
      fastify.destroySession(sessionId);
    }
    reply.clearCookie('session_id', { path: '/' });
    return { ok: true };
  });

  // POST /cli-code/generate - 生成 CLI 验证码
  fastify.post('/cli-code/generate', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const code = generateCliCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 写入 cli_auth_codes 表
    db.prepare(`
      INSERT INTO cli_auth_codes (code, user_id, expires_at, used)
      VALUES (?, ?, ?, FALSE)
    `).run(code, request.user.id, expiresAt);

    return { ok: true, code, expires_at: expiresAt };
  });

  // POST /cli-code/verify - 验证 CLI 验证码
  fastify.post('/cli-code/verify', async (request, reply) => {
    const { code } = request.body || {};

    if (!code) {
      return reply.code(400).send({ detail: '验证码不能为空' });
    }

    // 查找验证码：未使用且未过期
    const codeRecord = db.prepare(`
      SELECT * FROM cli_auth_codes
      WHERE code = ? AND used = FALSE AND expires_at > datetime('now')
    `).get(code);

    if (!codeRecord) {
      return reply.code(401).send({ detail: '验证码无效或已过期' });
    }

    // 标记为已使用
    db.prepare('UPDATE cli_auth_codes SET used = TRUE WHERE code = ?').run(code);

    // 生成 PAT
    const token = generatePAT();
    db.prepare(`
      INSERT INTO personal_access_tokens (token, user_id, description)
      VALUES (?, ?, ?)
    `).run(token, codeRecord.user_id, 'CLI generated token');

    // 获取用户信息
    const user = UserModel.findById(codeRecord.user_id);

    return {
      ok: true,
      token,
      user: { id: user.id, username: user.username }
    };
  });

  // GET /me - 获取当前用户信息
  fastify.get('/me', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    return request.user;
  });
}

module.exports = authRoutes;
