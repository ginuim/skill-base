function configureBrowserSecurity(fastify, origins = process.env.CORS_ORIGINS || '') {
  const trustedOrigins = new Set(origins.split(',').map((origin) => origin.trim()).filter(Boolean));
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  fastify.addHook('onRequest', async (request, reply) => {
    if (safeMethods.has(request.method)) return;
    const { origin, referer, host } = request.headers;
    // Native clients may omit browser headers. Browsers cannot forge these headers.
    if (origin === undefined && referer === undefined && request.headers['sec-fetch-site'] === undefined) return;
    let source;
    try {
      source = new URL(origin ?? referer);
    } catch {
      return reply.code(403).send({ detail: 'Untrusted request origin' });
    }
    const fetchSite = request.headers['sec-fetch-site'];
    // Same-origin browser metadata also works when HTTPS terminates at a reverse proxy.
    const sameOrigin = source.host === host && ['http:', 'https:'].includes(source.protocol)
      && (fetchSite === 'same-origin' || (fetchSite === undefined && source.protocol === `${request.protocol}:`));
    if (!sameOrigin && !trustedOrigins.has(source.origin)) {
      return reply.code(403).send({ detail: 'Untrusted request origin' });
    }
  });

  return fastify.register(require('@fastify/cors'), {
    origin: trustedOrigins.size ? [...trustedOrigins] : false,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE']
  });
}

module.exports = { configureBrowserSecurity };
