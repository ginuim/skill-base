const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseWebhookUrlField,
  isSafeWebhookTarget,
  canViewSkillWebhook
} = require('../src/utils/skill-webhook');

test('parseWebhookUrlField accepts http(s) and rejects invalid protocol', () => {
  assert.deepEqual(parseWebhookUrlField('https://example.com/hook'), {
    ok: true,
    value: 'https://example.com/hook',
    omit: false
  });
  assert.equal(parseWebhookUrlField('ftp://example.com').ok, false);
});

test('isSafeWebhookTarget allows localhost but rejects private and metadata addresses', () => {
  assert.equal(isSafeWebhookTarget('http://localhost:8787/hook'), true);
  assert.equal(isSafeWebhookTarget('http://127.0.0.1:8787/hook'), true);
  assert.equal(isSafeWebhookTarget('http://[::1]:8787/hook'), true);

  assert.equal(isSafeWebhookTarget('http://192.168.1.8/hook'), false);
  assert.equal(isSafeWebhookTarget('http://10.0.0.8/hook'), false);
  assert.equal(isSafeWebhookTarget('http://172.16.0.8/hook'), false);
  assert.equal(isSafeWebhookTarget('http://169.254.169.254/latest/meta-data'), false);
  assert.equal(isSafeWebhookTarget('http://0.0.0.0:8000/hook'), false);
});

test('canViewSkillWebhook is limited to owner or admin', () => {
  assert.equal(canViewSkillWebhook({ id: 1, role: 'developer' }, 'owner'), true);
  assert.equal(canViewSkillWebhook({ id: 2, role: 'developer' }, 'collaborator'), false);
  assert.equal(canViewSkillWebhook({ id: 3, role: 'admin' }, 'user'), true);
  assert.equal(canViewSkillWebhook(null, 'user'), false);
});
