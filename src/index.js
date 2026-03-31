const fs = require('fs');
const path = require('path');
const fastify = require('fastify')({
  logger: false,
  // 设置 body 大小限制为 100MB（支持大 zip 上传）
  bodyLimit: 100 * 1024 * 1024
});
const CappyMascot = require('./cappy');

// 1. 规范化部署前缀 (APP_BASE_PATH)
let APP_BASE_PATH = process.env.APP_BASE_PATH || '/';
// 确保以 / 开头，以 / 结尾
if (!APP_BASE_PATH.startsWith('/')) APP_BASE_PATH = '/' + APP_BASE_PATH;
if (!APP_BASE_PATH.endsWith('/')) APP_BASE_PATH = APP_BASE_PATH + '/';
// 将多个连续斜杠替换为单个
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

// 主启动函数
async function start() {
  try {
    // 1. 注册插件
    // @fastify/cors — 允许跨域
    await fastify.register(require('@fastify/cors'), {
      origin: true,
      credentials: true
    });

    // @fastify/cookie — Cookie 支持
    await fastify.register(require('@fastify/cookie'));

    // @fastify/multipart — 文件上传支持
    await fastify.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 100 * 1024 * 1024  // 100MB
      }
    });

    // @fastify/static — 静态文件服务（指向 static/ 目录）
    await fastify.register(require('@fastify/static'), {
      root: STATIC_ROOT,
      prefix: APP_BASE_PATH,
      wildcard: true,
      index: false
    });

    // 2. 注册自定义中间件
    // 错误处理
    await fastify.register(require('./middleware/error'));
    // 认证（注册 authenticate、createSession 等装饰器）
    await fastify.register(require('./middleware/auth'));
    // 管理员权限（注册 requireAdmin 装饰器）
    await fastify.register(require('./middleware/admin'));

    // 3. 注册 API 路由
    const API_PREFIX = (APP_BASE_PATH + 'api/v1').replace(/\/+/g, '/');
    await fastify.register(require('./routes/init'), { prefix: `${API_PREFIX}/init` });
    await fastify.register(require('./routes/auth'), { prefix: `${API_PREFIX}/auth` });
    await fastify.register(require('./routes/skills'), { prefix: `${API_PREFIX}/skills` });
    await fastify.register(require('./routes/publish'), { prefix: `${API_PREFIX}/skills` });
    await fastify.register(require('./routes/collaborators'), { prefix: `${API_PREFIX}/skills` });
    await fastify.register(require('./routes/users'), { prefix: `${API_PREFIX}/users` });

    // 4. 页面路由 fallback（SPA 风格路由支持）
    fastify.setNotFoundHandler(async (request, reply) => {
      const requestPath = request.url.split('?')[0];

      // API 路由返回 JSON 404
      if (requestPath.startsWith(API_PREFIX)) {
        return reply.code(404).send({ detail: 'Not found' });
      }

      // 已知静态资源缺失时直接返回 404，别把 HTML 假装成 JS/CSS
      if (
        requestPath.startsWith(`${APP_BASE_PATH}assets/`) ||
        requestPath === `${APP_BASE_PATH}favicon.ico`
      ) {
        return reply.code(404).send({ detail: 'Not found' });
      }

      // 所有非 API 请求回退到入口 HTML，由前端 Vue Router 处理
      return reply.type('text/html; charset=utf-8').send(renderSpaHtml());
    });

    // 5. 确保数据库已初始化
    require('./database');

    // 6. 启动服务
    const PORT = process.env.PORT || 8000;
    const HOST = process.env.HOST || '0.0.0.0';
    
    // 初始化 Cappy 水豚（必须在 listen 之前注册装饰器）
    const cappy = new CappyMascot(PORT);
    fastify.decorate('cappy', cappy);

    // 优雅解耦：通过 Fastify 的全局生命周期钩子来驱动 Cappy 动画，完全不污染业务路由
    fastify.addHook('onResponse', (request, reply, done) => {
      // 只有成功请求才触发，不理会报错
      if (reply.statusCode >= 200 && reply.statusCode < 300) {
        const method = request.method;
        const url = request.url.split('?')[0];

        if (method === 'POST' && url === `${API_PREFIX}/users`) {
          cappy.action('新用户被添加了。又多了一个打工人，系统依旧稳定。');
        } else if (method === 'POST' && url === `${API_PREFIX}/skills/publish`) {
          cappy.action('有新的 Skill/版本 发布了。希望它的代码没有过度设计。');
        } else if (method === 'GET' && url.match(new RegExp(`^${API_PREFIX}/skills/[^/]+/versions/[^/]+/download/?$`))) {
          cappy.action('有人拉取了 Skill。代码开始流通，Cappy 觉得很赞。');
        }
      }
      done();
    });

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`\n📦 Skill Base Engine Initialized.\n`);
    
    // 启动 Cappy 守护进程
    cappy.start();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
