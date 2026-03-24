const fp = require('fastify-plugin');
const db = require('../database');

// 内存 Session 存储（简单实现，生产可换 Redis）
const sessions = new Map();

// 创建 Session
function createSession(userId) {
  const { generateSessionId } = require('../utils/crypto');
  const sessionId = generateSessionId();
  sessions.set(sessionId, { userId, createdAt: Date.now() });
  return sessionId;
}

// 销毁 Session
function destroySession(sessionId) {
  sessions.delete(sessionId);
}

// 认证中间件装饰器 —— 注册为 Fastify 的 decorate + preHandler
// 用法：在路由中通过 { preHandler: [fastify.authenticate] } 使用
async function authPlugin(fastify, options) {
  // 将 sessions 暴露出去供路由使用
  fastify.decorate('sessions', sessions);
  fastify.decorate('createSession', createSession);
  fastify.decorate('destroySession', destroySession);

  // 认证装饰器
  fastify.decorate('authenticate', async function(request, reply) {
    // 1. 先尝试 Cookie Session
    const sessionId = request.cookies?.session_id;
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(session.userId);
      if (user) {
        request.user = user;
        return;
      }
    }

    // 2. 再尝试 Bearer Token（PAT）
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const pat = db.prepare('SELECT user_id FROM personal_access_tokens WHERE token = ?').get(token);
      if (pat) {
        const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(pat.user_id);
        if (user) {
          // 更新 last_used_at
          db.prepare('UPDATE personal_access_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = ?').run(token);
          request.user = user;
          return;
        }
      }
    }

    // 3. 未认证
    reply.code(401).send({ detail: 'Authentication required' });
  });

  // 可选认证（不强制，有则解析）
  fastify.decorate('optionalAuth', async function(request, reply) {
    try {
      // 复用 authenticate 逻辑，但不抛错
      const sessionId = request.cookies?.session_id;
      if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId);
        const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(session.userId);
        if (user) { request.user = user; return; }
      }
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const pat = db.prepare('SELECT user_id FROM personal_access_tokens WHERE token = ?').get(token);
        if (pat) {
          const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(pat.user_id);
          if (user) { request.user = user; return; }
        }
      }
    } catch (e) { /* ignore */ }
  });
}

module.exports = fp(authPlugin);
