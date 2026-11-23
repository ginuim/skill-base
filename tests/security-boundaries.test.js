const { test } = require('node:test');
const assert = require('node:assert/strict');
const { securityFixture } = require('./helpers/security-fixture');

test('browser writes require trusted origins and CLI codes can be redeemed only once', async (t) => {
  const { post, token } = await securityFixture(t);
  const user = { username: 'local-admin', password: 'local-test-password' };
  await post('/init/setup', { ...user, setup_token: token });
  const login = await post('/auth/login', user, {
    host: 'skill-base.example', origin: 'https://skill-base.example', 'sec-fetch-site': 'same-origin'
  });
  assert.equal(login.statusCode, 200);
  const header = login.headers['set-cookie'];
  for (const attr of [/HttpOnly/, /SameSite=Lax/, /Max-Age=\d+/, /Secure/]) assert.match(header, attr);
  const cookie = header.split(';')[0];
  const foreign = await post('/auth/cli-code/generate', {}, { host: 'skill-base.example', origin: 'https://other.example', cookie });
  assert.equal(foreign.statusCode, 403);
  assert.equal(foreign.headers['access-control-allow-origin'], undefined);
  const trusted = await post('/auth/cli-code/generate', {}, { host: 'skill-base.example', origin: 'https://trusted.example', cookie });
  assert.equal(trusted.statusCode, 200);
  assert.equal(trusted.headers['access-control-allow-origin'], 'https://trusted.example');
  const { code } = trusted.json();
  const replies = await Promise.all([post('/auth/cli-code/verify', { code }), post('/auth/cli-code/verify', { code })]);
  assert.deepEqual(replies.map(({ statusCode }) => statusCode).sort(), [200, 401]);
});
