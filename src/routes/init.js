const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const { hashPassword } = require('../utils/crypto');
const db = require('../database');

function isInitialized() {
  return Boolean(db.prepare("SELECT 1 FROM users WHERE role = 'admin' LIMIT 1").get());
}

function digest(token) {
  return createHash('sha256').update(token).digest();
}

async function initRoutes(fastify) {
  let setupDigest;
  if (!isInitialized()) {
    const configured = process.env.SKILL_BASE_SETUP_TOKEN;
    if (configured !== undefined && !/^[A-Za-z0-9_-]{32,128}$/.test(configured)) {
      throw new Error('SKILL_BASE_SETUP_TOKEN must contain 32–128 letters, digits, hyphens or underscores');
    }
    const token = configured ?? randomBytes(32).toString('base64url');
    setupDigest = digest(token);
    if (!configured) console.log(`Skill Base one-time setup token: ${token}`);
  }

  fastify.get('/status', async () => ({ initialized: isInitialized() }));

  fastify.post('/setup', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (isInitialized()) {
      return reply.code(400).send({ detail: 'System already initialized' });
    }

    const { username, password, setup_token } = request.body || {};
    if (!setupDigest || typeof setup_token !== 'string' || setup_token.length > 128
      || !timingSafeEqual(digest(setup_token), setupDigest)) {
      return reply.code(403).send({ detail: 'Invalid setup token. Check the server startup log or configured token.' });
    }
    if (typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 50) {
      return reply.code(400).send({ detail: 'Username must be 3–50 characters' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return reply.code(400).send({ detail: 'Password must be at least 6 characters' });
    }
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username.trim())) {
      return reply.code(400).send({ detail: 'Username already exists' });
    }

    const result = db.prepare(`
      INSERT INTO users (username, password_hash, role, is_super_admin)
      SELECT ?, ?, 'admin', 1
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin')
    `).run(username.trim(), hashPassword(password));
    if (!result.changes) {
      return reply.code(400).send({ detail: 'System already initialized' });
    }
    setupDigest = undefined;
    return { success: true, message: 'Admin account created successfully', userId: result.lastInsertRowid };
  });
}

module.exports = initRoutes;
