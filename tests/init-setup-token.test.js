const { test } = require('node:test');
const assert = require('node:assert/strict');
const { securityFixture } = require('./helpers/security-fixture');

test('setup requires the configured token and accepts it only until initialization succeeds', async (t) => {
  const { app, post, token } = await securityFixture(t);
  const user = { username: 'local-admin', password: 'local-test-password' };
  assert.equal((await post('/init/setup', user)).statusCode, 403);
  assert.equal((await post('/init/setup', { ...user, setup_token: 'incorrect' })).statusCode, 403);
  assert.equal((await app.inject('/api/v1/init/status')).json().initialized, false);
  assert.equal((await post('/init/setup', { ...user, setup_token: token })).statusCode, 200);
  const replay = await post('/init/setup', { ...user, username: 'another-admin', setup_token: token });
  assert.equal(replay.statusCode, 400);
  assert.equal((await app.inject('/api/v1/init/status')).json().initialized, true);
});
