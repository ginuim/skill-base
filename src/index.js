const fs = require('fs');
const path = require('path');

const isDebug = process.env.DEBUG === 'true';
if (!process.env.CACHE_MAX_MB) {
  process.env.CACHE_MAX_MB = '50';
}

const fastify = require('fastify')({
  logger: isDebug,
  // 100MB body limit for large zip uploads
  bodyLimit: 100 * 1024 * 1024
});
const CappyMascot = require('./cappy');

if (isDebug) {
  console.log('DEBUG: Debug mode is enabled.');
  console.log('DEBUG: PORT:', process.env.PORT);
  console.log('DEBUG: HOST:', process.env.HOST);
  console.log('DEBUG: APP_BASE_PATH:', process.env.APP_BASE_PATH);
  console.log('DEBUG: CACHE_MAX_MB:', process.env.CACHE_MAX_MB);
}

// 1. Normalize deploy prefix (APP_BASE_PATH)
let APP_BASE_PATH = process.env.APP_BASE_PATH || '/';
// Leading /, trailing /
if (!APP_BASE_PATH.startsWith('/')) APP_BASE_PATH = '/' + APP_BASE_PATH;
if (!APP_BASE_PATH.endsWith('/')) APP_BASE_PATH = APP_BASE_PATH + '/';
// Collapse repeated slashes
APP_BASE_PATH = APP_BASE_PATH.replace(/\/+/g, '/');

const STATIC_ROOT = path.join(__dirname, '../static');
const INDEX_HTML_PATH = path.join(STATIC_ROOT, 'index.html');

function renderSpaHtml() {
  const html = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
  const baseTag = `    <base href="${APP_BASE_PATH}">`;

  if (html.includes('<base href=')) {
    return html.replace(/<base href="[^"]*">/, baseTag.trim());
  }

  return html.replace('<head>', `<head>\n${baseTag}`);
}

// Main bootstrap
async function start() {
  try {
    if (isDebug) console.log('DEBUG: Registering core plugins...');
    // 1. Plugins
    // @fastify/cors — CORS
    await fastify.register(require('@fastify/cors'), {
      origin: true,
      credentials: true
    });
    if (isDebug) console.log('DEBUG: Registered @fastify/cors');

    // @fastify/cookie
    await fastify.register(require('@fastify/cookie'));
    if (isDebug) console.log('DEBUG: Registered @fastify/cookie');

    // @fastify/multipart — uploads
    await fastify.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 100 * 1024 * 1024  // 100MB
      }
    });
    if (isDebug) console.log('DEBUG: Registered @fastify/multipart');

    // Before static: with index:false, directory + trailing slash can 403 in send and skip notFoundHandler
    fastify.route({
      method: ['GET', 'HEAD'],
      url: APP_BASE_PATH,
      async handler(request, reply) {
        reply.type('text/html; charset=utf-8');
        if (request.method === 'HEAD') {
          return reply.send();
        }
        return reply.send(renderSpaHtml());
      }
    });

    // @fastify/static — serve static/
    await fastify.register(require('@fastify/static'), {
      root: STATIC_ROOT,
      prefix: APP_BASE_PATH,
      wildcard: true,
      index: false
    });
    if (isDebug) console.log('DEBUG: Registered @fastify/static at', STATIC_ROOT);

    // 2. Custom middleware
    if (isDebug) console.log('DEBUG: Registering custom middlewares...');
    // Errors
    await fastify.register(require('./middleware/error'));
    // Auth (authenticate, createSession, …)
    await fastify.register(require('./middleware/auth'));
    // Admin (requireAdmin)
    await fastify.register(require('./middleware/admin'));
    if (isDebug) console.log('DEBUG: Custom middlewares registered.');

    // 3. API routes
    const API_PREFIX = (APP_BASE_PATH + 'api/v1').replace(/\/+/g, '/');
    if (isDebug) console.log('DEBUG: Registering API routes with prefix:', API_PREFIX);

    // Health
    fastify.get(`${API_PREFIX}/health`, async () => {
      return { status: 'ok', timestamp: new Date().toISOString() };
    });

    await fastify.register(require('./routes/init'), { prefix: `${API_PREFIX}/init` });
    await fastify.register(require('./routes/auth'), { prefix: `${API_PREFIX}/auth` });
    await fastify.register(require('./routes/skills'), { prefix: `${API_PREFIX}/skills` });
    await fastify.register(require('./routes/publish'), { prefix: `${API_PREFIX}/skills` });
    await fastify.register(require('./routes/collaborators'), { prefix: `${API_PREFIX}/skills` });
    await fastify.register(require('./routes/users'), { prefix: `${API_PREFIX}/users` });
    if (isDebug) console.log('DEBUG: API routes registered.');

    // 4. SPA fallback for non-API routes
    fastify.setNotFoundHandler(async (request, reply) => {
      const requestPath = request.url.split('?')[0];

      // API → JSON 404
      if (requestPath.startsWith(API_PREFIX)) {
        return reply.code(404).send({ detail: 'Not found' });
      }

      // Missing assets → 404, not HTML-as-JS/CSS
      if (
        requestPath.startsWith(`${APP_BASE_PATH}assets/`) ||
        requestPath === `${APP_BASE_PATH}favicon.ico`
      ) {
        return reply.code(404).send({ detail: 'Not found' });
      }

      // Everything else → index HTML (Vue Router)
      return reply.type('text/html; charset=utf-8').send(renderSpaHtml());
    });

    // 5. DB init
    require('./database');

    // 6. Listen
    const PORT = process.env.PORT || 8000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    // Cappy off unless ENABLE_CAPPY=true
    const enableCappy = process.env.ENABLE_CAPPY === 'true';
    let cappy = null;

    if (enableCappy) {
      if (isDebug) console.log('DEBUG: CappyMascot is enabled.');
      // Cappy (decorate before listen)
      cappy = new CappyMascot(PORT, APP_BASE_PATH);
      fastify.decorate('cappy', cappy);

      // Drive Cappy from onResponse; no route changes
      fastify.addHook('onResponse', (request, reply, done) => {
        // Only 2xx
        if (reply.statusCode >= 200 && reply.statusCode < 300) {
          const method = request.method;
          const url = request.url.split('?')[0];

          if (method === 'POST' && url === `${API_PREFIX}/users`) {
            cappy.action('New user added. Another worker on the roster; the system stays steady.');
          } else if (method === 'POST' && url === `${API_PREFIX}/skills/publish`) {
            cappy.action('New skill or version published. Hope the code stays simple.');
          } else if (method === 'GET' && url.match(new RegExp(`^${API_PREFIX}/skills/[^/]+/versions/[^/]+/download/?$`))) {
            cappy.action('Someone downloaded a skill. Code is moving—Cappy approves.');
          }
        }
        done();
      });
    } else {
      if (isDebug) console.log('DEBUG: CappyMascot is disabled.');
      fastify.decorate('cappy', { action: () => {} });
    }

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n📦 Skill Base Engine Initialized at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}${APP_BASE_PATH}\n`);
    
    if (enableCappy && cappy) {
      // Start Cappy loop
      cappy.start();
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
