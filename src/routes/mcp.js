const AdmZip = require('adm-zip');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { WebStandardStreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js');
const { z } = require('zod');
const { version } = require('../../package.json');
const { publishSkillFromZip } = require('../utils/publish-skill');

const reference = z.string().min(1).max(200).refine(value =>
  value !== '.' && value !== '..' && !/[\/\\\u0000-\u001f]/.test(value)
);
const maxFileBytes = 256 * 1024;
const maxPublishZipBytes = 2 * 1024 * 1024;
const maxPublishBase64Length = 4 * Math.ceil(maxPublishZipBytes / 3);
const publishId = reference.refine(value => /^[a-z0-9][a-z0-9_-]*$/i.test(value));

function decodePublishZip(base64) {
  const zipBuffer = Buffer.from(base64, 'base64');
  if (zipBuffer.length > maxPublishZipBytes || zipBuffer.toString('base64') !== base64) {
    throw new Error('Provide a base64-encoded ZIP up to 2 MiB.');
  }

  let entries;
  try {
    entries = new AdmZip(zipBuffer).getEntries();
  } catch {
    throw new Error('Invalid ZIP archive.');
  }
  if (!entries.some(entry => entry.entryName === 'SKILL.md' && !entry.isDirectory && entry.header.size > 0)) {
    throw new Error('The ZIP must contain a non-empty SKILL.md at its root.');
  }
  const unpackedBytes = entries.reduce((total, entry) => total + entry.header.size, 0);
  if (unpackedBytes > 16 * 1024 * 1024) {
    throw new Error('The ZIP contents must be up to 16 MiB uncompressed.');
  }
  return zipBuffer;
}

function skillSummary({ id, name, description, latest_version, updated_at, is_favorited, tags }) {
  return { id, name, description, head: latest_version, updated_at, is_favorited, tags };
}

async function mcpRoutes(fastify, { apiPrefix, endpoint }) {
  fastify.route({
    method: ['GET', 'DELETE'],
    url: endpoint,
    handler: async (_request, reply) => reply.header('Allow', 'POST').code(405).send({
      jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Method not allowed' }
    })
  });

  fastify.post(endpoint, {
    bodyLimit: maxPublishBase64Length + 64 * 1024,
    onRequest: async (request, reply) => {
      if (request.headers.origin) {
        return reply.code(403).send({ detail: 'Browser origins are not supported on this endpoint' });
      }
      reply.header('Cache-Control', 'no-store');
      if (request.headers.authorization !== undefined) {
        // MCP uses PATs, independent of any web session cookie.
        const identity = { headers: request.headers };
        await fastify.authenticate(identity, reply);
        request.user = identity.user;
      }
    },
    handler: async (request, reply) => {
      const authorization = request.headers.authorization;
      const headers = authorization ? { authorization } : {};
      const server = new McpServer({ name: 'skill-base', version });
      const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });

      async function api(path, method = 'GET') {
        const result = await fastify.inject({ method, url: apiPrefix + path, headers });
        if (result.statusCode >= 400) {
          const reason = {
            401: 'A valid Skill Base PAT is required.',
            403: 'Permission denied.',
            404: 'The requested item was not found.'
          }[result.statusCode];
          throw new Error(reason || 'The Skill Base request failed.');
        }
        return result;
      }

      function register(name, description, inputSchema, run, { readOnly = true, idempotent = true, destructive = false } = {}) {
        server.registerTool(name, {
          description, inputSchema,
          annotations: {
            readOnlyHint: readOnly,
            destructiveHint: destructive,
            idempotentHint: idempotent,
            openWorldHint: false
          }
        }, async args => {
          try {
            const data = await run(args);
            return {
              content: [{ type: 'text', text: JSON.stringify(data) }],
              structuredContent: data
            };
          } catch (error) {
            return { isError: true, content: [{ type: 'text', text: error.message }] };
          }
        });
      }

      register('search_skills', 'Search visible skills by keyword, or list them when omitted.', {
        query: z.string().max(200).optional(),
        offset: z.number().int().nonnegative().optional()
      }, async ({ query = '', offset = 0 }) => {
        const { skills, total } = (await api('/skills?' + new URLSearchParams({ q: query }))).json();
        return { total, offset, skills: skills.slice(offset, offset + 25).map(skillSummary) };
      });

      register('list_collections', 'List collections, or list visible skills in one collection.', {
        collection: reference.optional(),
        offset: z.number().int().nonnegative().optional()
      }, async ({ collection, offset = 0 }) => {
        if (!collection) {
          const { collections } = (await api('/collections')).json();
          return { total: collections.length, offset, collections: collections.slice(offset, offset + 25) };
        }
        const result = (await api('/collections/' + encodeURIComponent(collection))).json();
        return {
          collection: result.collection, total: result.total, offset,
          skills: result.skills.slice(offset, offset + 25).map(skillSummary)
        };
      });

      register('get_skill_versions', 'Show the current Head and version history. Supply an installed version to compare with Head.', {
        skill_id: reference,
        installed_version: reference.optional(),
        offset: z.number().int().nonnegative().optional()
      }, async ({ skill_id, installed_version, offset = 0 }) => {
        const path = '/skills/' + encodeURIComponent(skill_id);
        const skill = skillSummary((await api(path)).json());
        const { versions } = (await api(path + '/versions')).json();
        const summary = ({ version, changelog, description, created_at }) =>
          ({ version, changelog, description, created_at });
        const head = versions.find(item => item.version === skill.head);
        return {
          skill,
          head_version: head ? summary(head) : null,
          installed_version,
          matches_head: installed_version && head ? installed_version === head.version : null,
          total: versions.length,
          offset,
          versions: versions.slice(offset, offset + 25).map(summary)
        };
      });

      register('read_skill_file', 'Read a UTF-8 file from a skill version. Defaults to SKILL.md at Head.', {
        skill_id: reference,
        version: reference.optional(),
        path: z.string().min(1).max(512).optional()
      }, async ({ skill_id, version, path = 'SKILL.md' }) => {
        const base = '/skills/' + encodeURIComponent(skill_id);
        if (!version) version = (await api(base)).json().latest_version;
        if (!version || version === 'latest') throw new Error('Specify an exact version or omit it to read Head.');
        if (path.split('/').some(part => !part || part === '.' || part === '..') || /[\\\u0000]/.test(path)) {
          throw new Error('Use a relative file path inside the skill archive.');
        }
        const zip = new AdmZip((await api(base + '/versions/' + encodeURIComponent(version) + '/view')).rawPayload);
        const entry = zip.getEntry(path);
        if (!entry || entry.isDirectory) throw new Error('File not found in the skill archive.');
        if (entry.header.size > maxFileBytes) throw new Error('File exceeds the 256 KiB limit.');
        const data = entry.getData();
        if (data.length > maxFileBytes || data.includes(0)) throw new Error('File must be UTF-8 text up to 256 KiB.');
        let text;
        try {
          text = new TextDecoder('utf-8', { fatal: true }).decode(data);
        } catch {
          throw new Error('File must be UTF-8 text.');
        }
        return { skill_id, version, path, text };
      });

      register('set_skill_favorite', 'Favorite or unfavorite a visible skill for the authenticated user.', {
        skill_id: reference,
        favorited: z.boolean()
      }, async ({ skill_id, favorited }) => {
        if (!authorization) throw new Error('A valid Skill Base PAT is required.');
        const path = '/skills/' + encodeURIComponent(skill_id) + '/favorite';
        return (await api(path, favorited ? 'POST' : 'DELETE')).json();
      }, { readOnly: false });

      register('publish_skill',
        'Publish a new skill or a new version that becomes Head. Show the user the target instance, skill ID, visibility and files before requesting approval. Call only after approval.', {
          skill_id: publishId,
          name: z.string().trim().min(1).max(200).optional(),
          description: z.string().max(4000).optional(),
          changelog: z.string().max(12000).optional(),
          visibility: z.enum(['public', 'private']).describe('Required for new skills. Existing skills retain their visibility.'),
          zip_base64: z.string().min(1).max(maxPublishBase64Length).describe('Base64 ZIP up to 2 MiB with SKILL.md at its root.'),
          confirmed: z.literal(true).describe('Set only after the user approves this publication.')
        }, async ({ skill_id, name, description, changelog, visibility, zip_base64 }) => {
          if (!request.user) throw new Error('A valid Skill Base PAT is required.');
          const result = publishSkillFromZip({
            user: request.user,
            skillId: skill_id,
            name,
            description,
            changelog,
            visibility,
            zipBuffer: decodePublishZip(zip_base64)
          });
          if (!result.ok) throw new Error(result.body.detail);
          return result;
        }, { readOnly: false, idempotent: false, destructive: true });

      try {
        await server.connect(transport);
        const response = await transport.handleRequest(new Request('http://localhost/mcp', {
          method: request.method,
          headers: request.headers
        }), { parsedBody: request.body });
        for (const [key, value] of response.headers) reply.header(key, value);
        return reply.code(response.status).send(response.body ? await response.text() : undefined);
      } finally {
        await server.close();
      }
    }
  });
}

module.exports = mcpRoutes;
