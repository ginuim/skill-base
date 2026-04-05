// Fastify error handler plugin
async function errorHandler(fastify, options) {
  fastify.setErrorHandler(function (error, request, reply) {
    const statusCode = error.statusCode || 500;
    
    // Log error
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

  // Note: 404 handling is unified in setNotFoundHandler in index.js
  // Includes logic for returning JSON 404 for API routes and corresponding HTML for page routes
}

module.exports = errorHandler;
