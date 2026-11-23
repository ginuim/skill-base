const { test } = require('node:test');
const assert = require('node:assert/strict');
const { securityFixture } = require('./helpers/security-fixture');

test('parallel setup requests create exactly one super administrator', async (t) => {
  const { app, post, token } = await securityFixture(t);
  const setup = (username) => post('/init/setup', { username, password: 'local-test-password', setup_token: token });
  const replies = await Promise.all([setup('first-admin'), setup('second-admin')]);
  assert.deepEqual(replies.map(({ statusCode }) => statusCode).sort(), [200, 400]);
  assert.deepEqual(app.db.prepare("SELECT role, is_super_admin FROM users").all(), [
    { role: 'admin', is_super_admin: 1 }
  ]);
});
