// Fastify 错误处理插件
async function errorHandler(fastify, options) {
  fastify.setErrorHandler(function (error, request, reply) {
    const statusCode = error.statusCode || 500;
    
    // 记录错误日志
    if (statusCode >= 500) {
      request.log.error(error);
    } else {
      request.log.warn(error.message);
    }

    reply.code(statusCode).send({
      detail: error.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {})
    });
  });

  // 注意: 404 处理统一在 index.js 中的 setNotFoundHandler 设置
  // 包含 API 路由返回 JSON 404 和页面路由返回对应 HTML 的逻辑
}

module.exports = errorHandler;
