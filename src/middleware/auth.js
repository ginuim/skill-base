const fp = require('fastify-plugin');
const db = require('../database');
const { generateSessionId } = require('../utils/crypto');

// Session storage mode: 'memory' | 'sqlite', configured via environment variable
const SESSION_STORE = process.env.SESSION_STORE || 'memory';
// Session expiration time (default 7 days)
const SESSION_EXPIRES_DAYS = parseInt(process.env.SESSION_EXPIRES_DAYS || '7', 10);

// ============ Memory storage implementation ============
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
    // Check expiration
    if (Date.now() > session.expiresAt) {
      memorySessions.delete(sessionId);
      return null;
    }
    return session;
  },
  destroy(sessionId) {
    memorySessions.delete(sessionId);
  },
  // Clean up expired sessions
  cleanup() {
    const now = Date.now();
    for (const [id, session] of memorySessions) {
      if (now > session.expiresAt) {
        memorySessions.delete(id);
      }
    }
  }
};

// ============ SQLite storage implementation ============
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
  // Clean up expired sessions
  cleanup() {
    db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  }
};

// Select storage implementation based on configuration
const sessionStore = SESSION_STORE === 'sqlite' ? sqliteStore : memoryStore;

// Clean up expired sessions on startup
sessionStore.cleanup();

// Periodically clean up expired sessions (every hour)
setInterval(() => sessionStore.cleanup(), 60 * 60 * 1000);

// Authentication middleware decorator - registered as Fastify's decorate + preHandler
// Usage: use via { preHandler: [fastify.authenticate] } in routes
async function authPlugin(fastify, options) {
  const authUserColumns = 'id, username, name, role, status, is_super_admin';

  // Expose sessionStore for routes to use
  fastify.decorate('sessionStore', sessionStore);
  fastify.decorate('createSession', (userId) => sessionStore.create(userId));
  fastify.decorate('destroySession', (sessionId) => sessionStore.destroy(sessionId));

  // Authentication decorator
  fastify.decorate('authenticate', async function(request, reply) {
    // 1. Try Cookie Session first
    const sessionId = request.cookies?.session_id;
    if (sessionId) {
      const session = sessionStore.get(sessionId);
      if (session) {
        const user = db.prepare(`SELECT ${authUserColumns} FROM users WHERE id = ?`).get(session.userId);
        if (!user || user.status === 'disabled') {
          return reply.code(401).send({
            ok: false,
            error: 'account_disabled',
            detail: 'Account has been disabled'
          });
        }
        request.user = user;
        return;
      }
    }

    // 2. Then try Bearer Token (PAT)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const pat = db.prepare('SELECT user_id FROM personal_access_tokens WHERE token = ?').get(token);
      if (pat) {
        const user = db.prepare(`SELECT ${authUserColumns} FROM users WHERE id = ?`).get(pat.user_id);
        if (!user || user.status === 'disabled') {
          return reply.code(401).send({
            ok: false,
            error: 'account_disabled',
            detail: 'Account has been disabled'
          });
        }
        // Update last_used_at
        db.prepare('UPDATE personal_access_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token = ?').run(token);
        request.user = user;
        return;
      }
    }

    // 3. Not authenticated
    reply.code(401).send({ detail: 'Authentication required' });
  });

  // Optional authentication (not enforced, parse if present)
  fastify.decorate('optionalAuth', async function(request, reply) {
    try {
      // Reuse authenticate logic but don't throw error
      const sessionId = request.cookies?.session_id;
      if (sessionId) {
        const session = sessionStore.get(sessionId);
        if (session) {
          const user = db.prepare(`SELECT ${authUserColumns} FROM users WHERE id = ?`).get(session.userId);
          if (user && user.status !== 'disabled') { request.user = user; return; }
        }
      }
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        const pat = db.prepare('SELECT user_id FROM personal_access_tokens WHERE token = ?').get(token);
        if (pat) {
          const user = db.prepare(`SELECT ${authUserColumns} FROM users WHERE id = ?`).get(pat.user_id);
          if (user && user.status !== 'disabled') { request.user = user; return; }
        }
      }
    } catch (e) { /* ignore */ }
  });
}

module.exports = fp(authPlugin, {
  name: 'auth-plugin'
});
