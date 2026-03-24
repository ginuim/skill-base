const path = require('path');
const fastify = require('fastify')({
  logger: true,
  // 设置 body 大小限制为 100MB（支持大 zip 上传）
  bodyLimit: 100 * 1024 * 1024
});

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
      root: path.join(__dirname, '../static'),
      prefix: '/'
    });

    // 2. 注册自定义中间件
    // 错误处理
    await fastify.register(require('./middleware/error'));
    // 认证（注册 authenticate、createSession 等装饰器）
    await fastify.register(require('./middleware/auth'));

    // 3. 注册 API 路由（前缀 /api/v1）
    await fastify.register(require('./routes/auth'), { prefix: '/api/v1/auth' });
    await fastify.register(require('./routes/skills'), { prefix: '/api/v1/skills' });
    await fastify.register(require('./routes/publish'), { prefix: '/api/v1/skills' });

    // 4. 确保数据库已初始化
    require('./database');

    // 5. 启动服务
    const PORT = process.env.PORT || 8000;
    const HOST = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port: PORT, host: HOST });
    console.log(`Skill Base server running at http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
