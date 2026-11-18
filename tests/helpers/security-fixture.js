const { randomBytes } = require('node:crypto');
const { buildTestApp } = require('./build-app');

async function securityFixture(t, store = 'memory') {
  const token = randomBytes(32).toString('base64url');
  const env = { SKILL_BASE_SETUP_TOKEN: process.env.SKILL_BASE_SETUP_TOKEN, SESSION_STORE: process.env.SESSION_STORE };
  process.env.SKILL_BASE_SETUP_TOKEN = token;
  process.env.SESSION_STORE = store;
  let app;
  try {
    app = await buildTestApp({ security: true });
  } finally {
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  t.after(() => app.cleanup());
  const post = (url, payload, headers) => app.inject({ method: 'POST', url: `/api/v1${url}`, payload, headers });
  return { app, post, token };
}

module.exports = { securityFixture };
