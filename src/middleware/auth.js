const fp = require('fastify-plugin');
const db = require('../database');
const { generateSessionId } = require('../utils/crypto');

// Session 存储模式：'memory' | 'sqlite'，通过环境变量配置
const SESSION_STORE = process.env.SESSION_STORE || 'memory';
// Session 过期时间（默认 7 天）
const SESSION_EXPIRES_DAYS = parseInt(process.env.SESSION_EXPIRES_DAYS || '7', 10);

// ============ 内存存储实现 ============
const memorySessions = new Map();

const memoryStore = {
  create(userId) {
    const sessionId = generateSessionId();
    const expiresAt = Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000;
    memorySessions.set(sessionId, { userId, createdAt: Date.now(), expiresAt });
    return sessionId;
  },
  get(sessionId) {
    const session = memorySessions.get(sessionId);
    if (!session) return null;
    // 检查过期
    if (Date.now() > session.expiresAt) {
      memorySessions.delete(sessionId);
      return null;
    }
    return session;
  },
  destroy(sessionId) {
    memorySessions.delete(sessionId);
  },
  // 清理过期 Session
  cleanup() {
    const now = Date.now();
    for (const [id, session] of memorySessions) {
      if (now > session.expiresAt) {
        memorySessions.delete(id);
      }
    }
  }
};

// ============ SQLite 存储实现 ============
const sqliteStore = {
  create(userId) {
    const sessionId = generateSessionId();
    const expiresAt = new Date(Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO sessions (session_id, user_id, expires_at) VALUES (?, ?, ?)
    `).run(sessionId, userId, expiresAt);
    return sessionId;
  },
  get(sessionId) {
    const session = db.prepare(`
      SELECT session_id, user_id as userId, created_at as createdAt, expires_at as expiresAt
      FROM sessions 
      WHERE session_id = ? AND expires_at > datetime('now')
    `).get(sessionId);
    return session || null;
  },
  destroy(sessionId) {
    db.prepare('DELETE FROM sessions WHERE session_id = ?').run(sessionId);
  },
  // 清理过期 Session
  cleanup() {
    db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  }
};

// 根据配置选择存储实现
const sessionStore = SESSION_STORE === 'sqlite' ? sqliteStore : memoryStore;

// 启动时清理一次过期 Session
sessionStore.cleanup();

// 定期清理过期 Session（每小时）
setInterval(() => sessionStore.cleanup(), 60 * 60 * 1000);

// 认证中间件装饰器 —— 注册为 Fastify 的 decorate + preHandler
// 用法：在路由中通过 { preHandler: [fastify.authenticate] } 使用
async function authPlugin(fastify, options) {
  // 将 sessionStore 暴露出去供路由使用
  fastify.decorate('sessionStore', sessionStore);
  fastify.decorate('createSession', (userId) => sessionStore.create(userId));
  fastify.decorate('destroySession', (sessionId) => sessionStore.destroy(sessionId));

  // 认证装饰器
  fastify.decorate('authenticate', async function(request, reply) {
    // 1. 先尝试 Cookie Session
    const sessionId = request.cookies?.session_id;
    if (sessionId) {
      const session = sessionStore.get(sessionId);
      if (session) {
        const user = db.prepare('SELECT id, username, name, role, status FROM users WHERE id = ?').get(session.userId);
        if (!user || user.status === 'disabled') {
          return reply.code(401).send({
            ok: false,
            error: 'account_disabled',
            detail: '账号已被禁用'
          });
        }
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
        const user = db.prepare('SELECT id, username, name, role, status FROM users WHERE id = ?').get(pat.user_id);
        if (!user || user.status === 'disabled') {
          return reply.code(401).send({
            ok: false,
            error: 'account_disabled',
            detail: '账号已被禁用'
          });
        }
        // 更新 last_used_at
        db.prepare('UPDATE personal_access_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = ?').run(token);
        request.user = user;
        return;
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
      if (sessionId) {
        const session = sessionStore.get(sessionId);
        if (session) {
          const user = db.prepare('SELECT id, username, name, role, status FROM users WHERE id = ?').get(session.userId);
          if (user && user.status !== 'disabled') { request.user = user; return; }
        }
      }
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const pat = db.prepare('SELECT user_id FROM personal_access_tokens WHERE token = ?').get(token);
        if (pat) {
          const user = db.prepare('SELECT id, username, name, role, status FROM users WHERE id = ?').get(pat.user_id);
          if (user && user.status !== 'disabled') { request.user = user; return; }
        }
      }
    } catch (e) { /* ignore */ }
  });
}

module.exports = fp(authPlugin, {
  name: 'auth-plugin'
});
