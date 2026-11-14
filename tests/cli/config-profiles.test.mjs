import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSkb, runSkbCapture } from './helpers.mjs';

/**
 * 每个用例使用独立的临时 HOME，避免污染真实 ~/.skill-base
 * 并显式清掉 SKB_PROFILE / SKB_BASE_URL，让用例不依赖开发机环境。
 */
function mkHome(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-profiles-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  return home;
}

function env(home, extra = {}) {
  const base = { ...process.env };
  delete base.SKB_PROFILE;
  delete base.SKB_BASE_URL;
  base.HOME = home;
  if (process.platform === 'win32') base.USERPROFILE = home;
  // 固定英文，便于断言文案
  base.LANG = 'en_US.UTF-8';
  base.LC_ALL = 'en_US.UTF-8';
  return { ...base, ...extra };
}

const configDir = (home) => path.join(home, '.skill-base');
const configPath = (home) => path.join(configDir(home), 'config.json');
const credsPath = (home) => path.join(configDir(home), 'credentials.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function runJson(home, args, extraEnv = {}) {
  const out = runSkb(args, env(home, extraEnv));
  return JSON.parse(out);
}

function capture(home, args, extraEnv = {}) {
  return runSkbCapture(args, env(home, extraEnv));
}

test('config list on a fresh HOME reports no profiles', (t) => {
  const home = mkHome(t);
  const text = runSkb(['config', 'list'], env(home));
  assert.match(text, /No profiles yet/);

  const json = runJson(home, ['config', 'list', '--json']);
  assert.deepEqual(json.profiles, []);
  assert.equal(json.currentProfile, null);
  assert.equal(json.activeProfile, 'default');
});

test('config add normalizes the URL and activates the first profile', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com/'], env(home));

  const saved = readJson(configPath(home));
  assert.equal(saved.profiles.qa.baseUrl, 'https://qa.example.com');
  assert.equal(saved.currentProfile, 'qa');
  // 顶层 baseUrl 与当前 profile 同步，保证老版本 CLI 仍指向正确服务器
  assert.equal(saved.baseUrl, 'https://qa.example.com');

  const json = runJson(home, ['config', 'list', '--json']);
  assert.equal(json.profiles.length, 1);
  assert.equal(json.currentProfile, 'qa');
  assert.equal(json.activeProfile, 'qa');
  assert.equal(json.profiles[0].current, true);
  assert.equal(json.profiles[0].active, true);
  assert.equal(json.profiles[0].loggedIn, false);
});

test('config add --use switches away from the existing profile', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'prod', '-s', 'https://prod.example.com'], env(home));
  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com', '--use'], env(home));

  const saved = readJson(configPath(home));
  assert.equal(saved.currentProfile, 'qa');
  assert.equal(saved.baseUrl, 'https://qa.example.com');
  assert.deepEqual(Object.keys(saved.profiles).sort(), ['prod', 'qa']);
});

test('config add rejects duplicate names, bad names and bad URLs', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com'], env(home));

  const dup = capture(home, ['config', 'add', 'qa', '-s', 'https://other.example.com']);
  assert.notEqual(dup.code, 0);
  assert.match(dup.stderr, /already exists/);

  for (const bad of ['bad name', 'qa/env', 'qa@prod']) {
    const res = capture(home, ['config', 'add', bad, '-s', 'https://x.example.com']);
    assert.notEqual(res.code, 0, `expected failure for ${bad}`);
    assert.match(res.stderr, /may only contain letters/);
  }

  for (const badUrl of ['not-a-url', 'ftp://example.com']) {
    const res = capture(home, ['config', 'add', 'staging', '-s', badUrl]);
    assert.notEqual(res.code, 0, `expected failure for ${badUrl}`);
    assert.match(res.stderr, /Invalid server URL/);
  }

  const missingServer = capture(home, ['config', 'add', 'staging']);
  assert.notEqual(missingServer.code, 0);

  // 失败的调用不应留下任何配置
  assert.deepEqual(Object.keys(readJson(configPath(home)).profiles), ['qa']);
});

test('config use switches profile and rejects unknown names by listing options', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'prod', '-s', 'https://prod.example.com'], env(home));
  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com'], env(home));
  runSkb(['config', 'use', 'prod'], env(home));
  assert.equal(readJson(configPath(home)).currentProfile, 'prod');

  const missing = capture(home, ['config', 'use', 'nope']);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /Profile not found: nope/);
  assert.match(missing.stderr, /prod, qa/);
  assert.equal(readJson(configPath(home)).currentProfile, 'prod');
});

test('profiles isolate credentials: logout only clears the active profile', (t) => {
  const home = mkHome(t);
  writeJson(configPath(home), {
    profiles: {
      prod: { baseUrl: 'https://prod.example.com' },
      qa: { baseUrl: 'https://qa.example.com' }
    },
    currentProfile: 'qa',
    baseUrl: 'https://qa.example.com'
  });
  writeJson(credsPath(home), {
    profiles: {
      prod: { token: 'prod-token-1234', username: 'alice' },
      qa: { token: 'qa-token-1234', username: 'bob' }
    }
  });

  const before = runJson(home, ['config', 'list', '--json']);
  assert.deepEqual(
    before.profiles.map((p) => [p.name, p.username, p.loggedIn]),
    [['prod', 'alice', true], ['qa', 'bob', true]]
  );

  runSkb(['logout'], env(home));

  const creds = readJson(credsPath(home));
  assert.equal(creds.profiles.qa, undefined, 'active profile token should be cleared');
  assert.equal(creds.profiles.prod.token, 'prod-token-1234', 'other profiles must keep their token');
});

test('saved credentials are written with mode 600', { skip: process.platform === 'win32' }, (t) => {
  const home = mkHome(t);
  writeJson(configPath(home), {
    profiles: { qa: { baseUrl: 'https://qa.example.com' } },
    currentProfile: 'qa'
  });
  writeJson(credsPath(home), {
    profiles: {
      qa: { token: 'qa-token-1234', username: 'bob' },
      prod: { token: 'prod-token-1234', username: 'alice' }
    }
  });
  fs.chmodSync(credsPath(home), 0o644);

  runSkb(['logout'], env(home));

  const mode = fs.statSync(credsPath(home)).mode & 0o777;
  assert.equal(mode.toString(8), '600');
});

test('legacy config and credentials are read as the "default" profile', (t) => {
  const home = mkHome(t);
  writeJson(configPath(home), { baseUrl: 'https://legacy.example.com' });
  writeJson(credsPath(home), { token: 'legacy-token-1234', username: 'alice' });

  const json = runJson(home, ['config', 'list', '--json']);
  assert.equal(json.profiles.length, 1);
  assert.equal(json.profiles[0].name, 'default');
  assert.equal(json.profiles[0].baseUrl, 'https://legacy.example.com');
  assert.equal(json.profiles[0].username, 'alice');
  assert.equal(json.profiles[0].loggedIn, true);

  const show = runJson(home, ['config', 'show', '--json']);
  assert.equal(show.name, 'default');
  assert.equal(show.effectiveBaseUrl, 'https://legacy.example.com');
  assert.equal(show.current, true);
  assert.equal(show.loggedIn, true);

  // 只读操作不应重写文件，老用户不会被迁移走
  assert.deepEqual(readJson(credsPath(home)), { token: 'legacy-token-1234', username: 'alice' });
});

test('config add on a legacy config keeps legacy tokens working', (t) => {
  const home = mkHome(t);
  writeJson(configPath(home), { baseUrl: 'https://legacy.example.com' });
  writeJson(credsPath(home), { token: 'legacy-token-1234', username: 'alice' });

  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com', '--use'], env(home));

  const saved = readJson(configPath(home));
  assert.deepEqual(Object.keys(saved.profiles).sort(), ['default', 'qa']);
  assert.equal(saved.currentProfile, 'qa');
  assert.equal(saved.baseUrl, 'https://qa.example.com');

  // 旧格式凭据仍按 default profile 读取，未登录 qa 仍能看到 default 的登录态
  const list = runJson(home, ['config', 'list', '--json']);
  const byName = Object.fromEntries(list.profiles.map((p) => [p.name, p]));
  assert.equal(byName.default.loggedIn, true);
  assert.equal(byName.qa.loggedIn, false);
});

test('config show masks the token and never prints it in --json', (t) => {
  const home = mkHome(t);
  writeJson(configPath(home), {
    profiles: { qa: { baseUrl: 'https://qa.example.com' } },
    currentProfile: 'qa'
  });
  writeJson(credsPath(home), {
    profiles: { qa: { token: 'qa-secret-token-1234', username: 'bob' } }
  });

  const token = 'qa-secret-token-1234';
  const text = runSkb(['config', 'show'], env(home));
  assert.ok(!text.includes(token), 'raw token must not be printed');
  // 只保留前 4 位与后 4 位
  assert.match(text, new RegExp(`${token.slice(0, 4)}…${token.slice(-4)}`));
  assert.match(text, /bob/);

  const json = runJson(home, ['config', 'show', '--json']);
  assert.equal(json.name, 'qa');
  assert.equal(json.username, 'bob');
  assert.equal(json.loggedIn, true);
  assert.equal('token' in json, false);
});

test('config set --rename moves the profile and its credentials', (t) => {
  const home = mkHome(t);
  writeJson(configPath(home), {
    profiles: { qa: { baseUrl: 'https://qa.example.com' } },
    currentProfile: 'qa',
    baseUrl: 'https://qa.example.com'
  });
  writeJson(credsPath(home), {
    profiles: { qa: { token: 'qa-token-1234', username: 'bob' } }
  });

  runSkb(['config', 'set', 'qa', '--rename', 'staging'], env(home));

  const saved = readJson(configPath(home));
  assert.deepEqual(Object.keys(saved.profiles), ['staging']);
  assert.equal(saved.profiles.staging.baseUrl, 'https://qa.example.com');
  assert.equal(saved.currentProfile, 'staging');
  assert.equal(saved.baseUrl, 'https://qa.example.com');

  const creds = readJson(credsPath(home));
  assert.deepEqual(Object.keys(creds.profiles), ['staging']);
  assert.equal(creds.profiles.staging.token, 'qa-token-1234');
});

test('config set updates the URL and rejects no-op or duplicate renames', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'prod', '-s', 'https://prod.example.com'], env(home));
  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com'], env(home));

  runSkb(['config', 'set', 'qa', '-s', 'https://qa2.example.com/'], env(home));
  const saved = readJson(configPath(home));
  assert.equal(saved.profiles.qa.baseUrl, 'https://qa2.example.com');

  const nothing = capture(home, ['config', 'set', 'qa']);
  assert.equal(nothing.code, 1);
  assert.match(nothing.stderr, /Nothing to change/);

  const dup = capture(home, ['config', 'set', 'qa', '--rename', 'prod']);
  assert.equal(dup.code, 1);
  assert.match(dup.stderr, /already exists/);

  const missing = capture(home, ['config', 'set', 'nope', '-s', 'https://x.example.com']);
  assert.equal(missing.code, 1);
  assert.match(missing.stderr, /Profile not found/);
});

test('config remove drops the profile and its credentials', (t) => {
  const home = mkHome(t);
  writeJson(configPath(home), {
    profiles: {
      prod: { baseUrl: 'https://prod.example.com' },
      qa: { baseUrl: 'https://qa.example.com' }
    },
    currentProfile: 'qa',
    baseUrl: 'https://qa.example.com'
  });
  writeJson(credsPath(home), {
    profiles: {
      prod: { token: 'prod-token-1234', username: 'alice' },
      qa: { token: 'qa-token-1234', username: 'bob' }
    }
  });

  runSkb(['config', 'remove', 'qa', '-y'], env(home));

  const saved = readJson(configPath(home));
  assert.deepEqual(Object.keys(saved.profiles), ['prod']);
  assert.equal(saved.currentProfile, 'prod');
  assert.equal(saved.baseUrl, 'https://prod.example.com');

  const creds = readJson(credsPath(home));
  assert.deepEqual(Object.keys(creds.profiles), ['prod']);

  const again = capture(home, ['config', 'remove', 'qa', '-y']);
  assert.equal(again.code, 1);
  assert.match(again.stderr, /Profile not found/);
});

test('removing the last profile clears the active profile and legacy baseUrl', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'only', '-s', 'https://only.example.com'], env(home));
  runSkb(['config', 'remove', 'only', '-y'], env(home));

  const saved = readJson(configPath(home));
  assert.deepEqual(saved.profiles, {});
  assert.equal('currentProfile' in saved, false);
  assert.equal('baseUrl' in saved, false);

  const json = runJson(home, ['config', 'list', '--json']);
  assert.deepEqual(json.profiles, []);
  assert.equal(json.activeProfile, 'default');
});

test('--profile / SKB_PROFILE / currentProfile precedence', (t) => {
  const home = mkHome(t);
  for (const name of ['prod', 'qa', 'test']) {
    runSkb(['config', 'add', name, '-s', `https://${name}.example.com`], env(home));
  }
  runSkb(['config', 'use', 'prod'], env(home));

  const fromConfig = runJson(home, ['config', 'show', '--json']);
  assert.equal(fromConfig.name, 'prod');

  const fromEnv = runJson(home, ['config', 'show', '--json'], { SKB_PROFILE: 'qa' });
  assert.equal(fromEnv.name, 'qa');
  assert.equal(fromEnv.current, false);
  assert.equal(fromEnv.active, true);

  const fromFlag = runJson(home, ['--profile', 'test', 'config', 'show', '--json'], {
    SKB_PROFILE: 'qa'
  });
  assert.equal(fromFlag.name, 'test');
  assert.equal(fromFlag.active, true);

  // 显式选择不改变持久化的 currentProfile
  assert.equal(readJson(configPath(home)).currentProfile, 'prod');
});

test('an explicitly selected profile that does not exist fails fast', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'prod', '-s', 'https://prod.example.com'], env(home));

  const byFlag = capture(home, ['--profile', 'nope', 'whoami', '--json']);
  assert.equal(byFlag.code, 1);
  assert.match(byFlag.stderr, /Profile not found: nope/);
  assert.match(byFlag.stderr, /prod/);

  const byEnv = capture(home, ['whoami', '--json'], { SKB_PROFILE: 'nope' });
  assert.equal(byEnv.code, 1);
  assert.match(byEnv.stderr, /Profile not found: nope/);

  // config/init 允许操作尚不存在的 profile，不做存在性拦截
  const addIt = runSkb(['--profile', 'nope', 'config', 'add', 'nope', '-s', 'https://n.example.com'], env(home));
  assert.match(addIt, /Added profile nope/);
});

test('whoami reports which profile had no token', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'prod', '-s', 'https://prod.example.com'], env(home));
  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com'], env(home));

  const res = capture(home, ['--profile', 'qa', 'whoami', '--json']);
  assert.equal(res.code, 1);
  const json = JSON.parse(res.stdout.trim());
  assert.equal(json.ok, false);
  assert.equal(json.reason, 'no_token');
  assert.equal(json.profile, 'qa');
  assert.equal(json.baseUrl, 'https://qa.example.com');
});

test('config list warns when SKB_BASE_URL overrides the profile server', (t) => {
  const home = mkHome(t);
  runSkb(['config', 'add', 'qa', '-s', 'https://qa.example.com'], env(home));

  const text = runSkb(['config', 'list'], env(home, { SKB_BASE_URL: 'https://env.example.com' }));
  assert.match(text, /SKB_BASE_URL/);
  assert.match(text, /https:\/\/env\.example\.com/);
});

test('config supports i18n output', (t) => {
  const home = mkHome(t);
  const zh = runSkb(['config', 'list'], env(home, { LANG: 'zh_CN.UTF-8', LC_ALL: 'zh_CN.UTF-8' }));
  assert.match(zh, /还没有任何配置/);

  const en = runSkb(['config', 'list'], env(home, { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }));
  assert.match(en, /No profiles yet/);
});
