const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Fastify = require('fastify');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // Ignore modules that were not loaded yet.
  }
}

function createFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-base-app-'));
  return {
    tempDir,
    dbPath: path.join(tempDir, 'skills.db'),
    dataDir: path.join(tempDir, 'data')
  };
}

async function buildTestApp() {
  const fixture = createFixture();
  fs.mkdirSync(fixture.dataDir, { recursive: true });

  const previousDatabasePath = process.env.DATABASE_PATH;
  const previousDataDir = process.env.DATA_DIR;
  process.env.DATABASE_PATH = fixture.dbPath;
  process.env.DATA_DIR = fixture.dataDir;

  clearModule('../../src/database');
  clearModule('../../src/middleware/error');
  clearModule('../../src/middleware/auth');
  clearModule('../../src/middleware/admin');
  clearModule('../../src/routes/auth');
  clearModule('../../src/routes/skills');
  clearModule('../../src/routes/users');
  clearModule('../../src/routes/tags');
  clearModule('../../src/models/user');
  clearModule('../../src/models/skill');
  clearModule('../../src/models/version');
  clearModule('../../src/models/favorite');
  clearModule('../../src/models/tag');
  clearModule('../../src/utils/model-cache');

  const db = require('../../src/database');
  const app = Fastify({ logger: false });

  await app.register(require('@fastify/cookie'));
  await app.register(require('../../src/middleware/error'));
  const originalSetInterval = global.setInterval;
  global.setInterval = (fn, ms, ...args) => {
    const timer = originalSetInterval(fn, ms, ...args);
    if (typeof timer.unref === 'function') {
      timer.unref();
    }
    return timer;
  };
  const authPlugin = require('../../src/middleware/auth');
  global.setInterval = originalSetInterval;
  await app.register(authPlugin);
  await app.register(require('../../src/middleware/admin'));

  const apiPrefix = '/api/v1';
  await app.register(require('../../src/routes/auth'), { prefix: `${apiPrefix}/auth` });
  await app.register(require('../../src/routes/skills'), { prefix: `${apiPrefix}/skills` });
  await app.register(require('../../src/routes/users'), { prefix: `${apiPrefix}/users` });

  try {
    await app.register(require('../../src/routes/tags'), { prefix: `${apiPrefix}/tags` });
  } catch (error) {
    if (!String(error && error.message ? error.message : error).includes("Cannot find module '../../src/routes/tags'")) {
      throw error;
    }
  }

  await app.ready();

  app.db = db;
  app.apiPrefix = apiPrefix;
  app.fixture = fixture;
  app.cleanup = async () => {
    await app.close();
    if (typeof db.close === 'function') {
      db.close();
    }
    if (previousDatabasePath === undefined) {
      delete process.env.DATABASE_PATH;
    } else {
      process.env.DATABASE_PATH = previousDatabasePath;
    }
    if (previousDataDir === undefined) {
      delete process.env.DATA_DIR;
    } else {
      process.env.DATA_DIR = previousDataDir;
    }
    fs.rmSync(fixture.tempDir, { recursive: true, force: true });
  };

  return app;
}

module.exports = {
  buildTestApp
};
