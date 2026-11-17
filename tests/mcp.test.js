const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const AdmZip = require('adm-zip');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');
const { buildTestApp } = require('./helpers/build-app');

test('remote MCP uses Skill Base permissions and resolves files at Head', async t => {
  const app = await buildTestApp();
  t.after(() => app.cleanup());

  app.db.prepare("INSERT INTO users (id, username, password_hash) VALUES (1, 'owner', 'hash')").run();
  app.db.prepare("INSERT INTO personal_access_tokens (user_id, token) VALUES (1, 'test-pat')").run();
  app.db.prepare(`
    INSERT INTO skills (id, name, owner_id, latest_version, visibility)
    VALUES ('public-skill', 'Public', 1, 'v1', 'public'),
           ('private-skill', 'Private', 1, 'v1', 'private')
  `).run();

  app.db.prepare(`
    INSERT INTO skill_collaborators (skill_id, user_id, role, created_by)
    VALUES ('private-skill', 1, 'owner', 1)
  `).run();

  const zipPath = path.join(app.fixture.dataDir, 'skills', 'private-skill', 'v1.zip');
  const zip = new AdmZip();
  zip.addFile('SKILL.md', Buffer.from('# Private skill'));
  zip.writeZip(zipPath);
  app.db.prepare(`
    INSERT INTO skill_versions (skill_id, version, zip_path, uploader_id, changelog)
    VALUES ('private-skill', 'v1', ?, 1, 'Head notes'),
           ('private-skill', 'v2', ?, 1, 'Newer upload')
  `).run(zipPath, zipPath);

  const url = new URL('/mcp', await app.listen({ host: '127.0.0.1', port: 0 }));
  async function connect(token) {
    const client = new Client({ name: 'test', version: '1.0.0' });
    const headers = token ? { authorization: 'Bearer ' + token } : {};
    await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers } }));
    t.after(() => client.close());
    return client;
  }

  const anonymous = await connect();
  const { tools } = await anonymous.listTools();
  assert.equal(tools.length, 6);
  assert.equal(tools.find(tool => tool.name === 'publish_skill').annotations.idempotentHint, false);
  const visible = await anonymous.callTool({ name: 'search_skills', arguments: {} });
  assert.deepEqual(visible.structuredContent.skills.map(skill => skill.id), ['public-skill']);

  const file = { name: 'read_skill_file', arguments: { skill_id: 'private-skill' } };
  assert.equal((await anonymous.callTool(file)).isError, true);
  const favorite = {
    name: 'set_skill_favorite', arguments: { skill_id: 'public-skill', favorited: true }
  };
  assert.equal((await anonymous.callTool(favorite)).isError, true);

  const owner = await connect('test-pat');
  const ownerFile = await owner.callTool(file);  assert.equal(ownerFile.structuredContent?.text, '# Private skill', JSON.stringify(ownerFile));
  const versions = await owner.callTool({
    name: 'get_skill_versions', arguments: { skill_id: 'private-skill', installed_version: 'v2' }
  });
  assert.equal(versions.structuredContent.head_version.version, 'v1');
  assert.equal(versions.structuredContent.matches_head, false);
  assert.equal((await owner.callTool(favorite)).structuredContent.favorited, true);

  const publish = {
    name: 'publish_skill',
    arguments: {
      skill_id: 'published-skill',
      name: 'Published skill',
      visibility: 'private',
      zip_base64: zip.toBuffer().toString('base64'),
      confirmed: true
    }
  };
  assert.equal((await anonymous.callTool(publish)).isError, true);
  assert.equal((await owner.callTool({
    ...publish, arguments: { ...publish.arguments, confirmed: false }
  })).isError, true);
  assert.equal((await owner.callTool({
    ...publish, arguments: { ...publish.arguments, zip_base64: 'dGVzdA==' }
  })).isError, true);

  app.db.prepare("INSERT INTO users (id, username, password_hash) VALUES (2, 'other', 'hash')").run();
  app.db.prepare("INSERT INTO personal_access_tokens (user_id, token) VALUES (2, 'other-pat')").run();
  const other = await connect('other-pat');
  assert.equal((await other.callTool({
    ...publish, arguments: { ...publish.arguments, skill_id: 'private-skill' }
  })).isError, true);

  const published = await owner.callTool(publish);
  assert.equal(published.structuredContent?.ok, true, JSON.stringify(published));
  const content = await owner.callTool({ name: 'read_skill_file', arguments: { skill_id: 'published-skill' } });
  assert.equal(content.structuredContent.version, published.structuredContent.version);
  assert.equal((await anonymous.callTool({
    name: 'read_skill_file', arguments: { skill_id: 'published-skill' }
  })).isError, true);

  const updated = await owner.callTool({
    ...publish,
    arguments: { ...publish.arguments, skill_id: 'private-skill', visibility: 'public', changelog: 'MCP update' }
  });
  assert.equal(updated.structuredContent?.ok, true, JSON.stringify(updated));
  const newHead = await owner.callTool({
    name: 'get_skill_versions', arguments: { skill_id: 'private-skill' }
  });
  assert.equal(newHead.structuredContent.head_version.version, updated.structuredContent.version);
  assert.equal(newHead.structuredContent.head_version.changelog, 'MCP update');
  assert.equal((await anonymous.callTool(file)).isError, true);

  const badToken = await app.inject({
    method: 'POST', url: '/mcp', headers: { authorization: 'Bearer invalid' }
  });
  assert.equal(badToken.statusCode, 401);
  const origin = await app.inject({
    method: 'POST', url: '/mcp', headers: { origin: 'https://other.example' }
  });
  assert.equal(origin.statusCode, 403);
});
