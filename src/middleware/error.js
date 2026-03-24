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

  // 404 处理
  fastify.setNotFoundHandler(function (request, reply) {
    reply.code(404).send({ detail: 'Not found' });
  });
}

module.exports = errorHandler;
