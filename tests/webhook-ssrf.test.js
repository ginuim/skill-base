const { test } = require('node:test');
const assert = require('node:assert/strict');
const dns = require('node:dns');
const http = require('node:http');
const { EventEmitter, once } = require('node:events');
const { notifySkillWebhook } = require('../src/utils/skill-webhook');

test('webhook connections use only the validated DNS answer set', async (t) => {
  const servers = new Map([
    ['intranet.corp', [{ address: '10.0.0.5', family: 4 }]],
    ['10.0.0.5.nip.io', [{ address: '10.0.0.5', family: 4 }]],
    ['dual.example.test', [{ address: '93.184.215.14', family: 4 }, { address: 'fd00::5', family: 6 }]],
    ['public.example.test', [{ address: '93.184.215.14', family: 4 }]]
  ]);
  const lookups = t.mock.method(dns, 'lookup', (name, options, callback) => {
    assert.equal(options.all, true);
    callback(null, servers.get(name));
  });
  const requests = new EventEmitter();
  t.mock.method(http, 'request', (url, options) => {
    const request = new EventEmitter();
    request.end = () => {
      const { hostname } = new URL(url);
      options.lookup(hostname, { all: true }, (error, addresses) => {
        requests.emit('resolved', { error, addresses, hostname });
      });
    };
    return request;
  });
  for (const hostname of servers.keys()) {
    const resolved = once(requests, 'resolved');
    notifySkillWebhook({ id: 'demo', webhook_url: `http://${hostname}/hook` }, 'skill.updated', {}, null);
    const [result] = await resolved;
    assert.equal(result.hostname, hostname);
    if (hostname === 'public.example.test') {
      assert.equal(result.error, null);
      assert.deepEqual(result.addresses, servers.get(hostname));
    } else {
      assert.match(result.error.message, /blocked address/);
      assert.equal(result.addresses, undefined);
    }
  }
  assert.equal(lookups.mock.callCount(), servers.size);
});
