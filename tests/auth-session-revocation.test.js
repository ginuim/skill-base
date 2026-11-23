const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword } = require('../src/utils/crypto');
const { securityFixture } = require('./helpers/security-fixture');

for (const store of ['memory', 'sqlite']) {
  test(`password change rotates the current browser session and revokes old credentials (${store})`, async (t) => {
    const { app, post, token } = await securityFixture(t, store);
    const user = { username: 'local-admin', password: 'local-test-password' };
    const { userId } = (await post('/init/setup', { ...user, setup_token: token })).json();
    const login = await post('/auth/login', user);
    const oldCookie = login.headers['set-cookie'].split(';')[0];
    const otherCookie = 'session_id=' + app.createSession(userId);
    const code = (await post('/auth/cli-code/generate', {}, { cookie: oldCookie })).json().code;
    const pat = (await post('/auth/cli-code/verify', { code })).json().token;
    const unusedCode = (await post('/auth/cli-code/generate', {}, { cookie: oldCookie })).json().code;

    const changed = await post('/auth/me/change-password', {
      old_password: user.password, new_password: 'replacement-test-password'
    }, { cookie: oldCookie });
    assert.equal(changed.statusCode, 200);
    const newCookie = changed.headers['set-cookie'].split(';')[0];
    assert.notEqual(newCookie, oldCookie);
    for (const headers of [{ cookie: oldCookie }, { cookie: otherCookie }, { authorization: 'Bearer ' + pat }]) {
      assert.equal((await app.inject({ url: '/api/v1/auth/me', headers })).statusCode, 401);
    }
    assert.equal((await post('/auth/cli-code/verify', { code: unusedCode })).statusCode, 401);
    assert.equal((await app.inject({ url: '/api/v1/auth/me', headers: { cookie: newCookie } })).statusCode, 200);
  });
}

test('ordinary admins cannot reset super admins and a reset preserves the acting admin session', async (t) => {
  const { app, post, token } = await securityFixture(t);
  const password = 'local-test-password';
  const { userId } = (await post('/init/setup', { username: 'super-admin', password, setup_token: token })).json();
  const { lastInsertRowid: adminId } = app.db.prepare(
    "INSERT INTO users (username, password_hash, role, is_super_admin) VALUES ('other-admin', ?, 'admin', 0)"
  ).run(hashPassword(password));
  const superCookie = 'session_id=' + app.createSession(userId);
  const adminCookie = 'session_id=' + app.createSession(adminId);
  const reset = (id, cookie) => post(`/users/${id}/reset-password`, { new_password: 'replacement-test-password' }, { cookie });
  assert.equal((await reset(userId, adminCookie)).statusCode, 403);
  assert.equal((await reset(adminId, superCookie)).statusCode, 200);
  const me = (cookie) => app.inject({ url: '/api/v1/auth/me', headers: { cookie } });
  assert.equal((await me(adminCookie)).statusCode, 401);
  assert.equal((await me(superCookie)).statusCode, 200);
});
