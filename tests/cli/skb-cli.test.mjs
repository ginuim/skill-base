import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runSkb, runSkbCapture } from './helpers.mjs';

test('skb --help exits 0 and prints usage', () => {
  const out = runSkb(['--help']);
  assert.ok(out.includes('Usage: skb') || out.includes('用法'), 'expected Usage line');
  assert.ok(out.includes('init') && out.includes('login'), 'expected subcommands');
  assert.ok(out.includes('ui'), 'expected ui subcommand');
  assert.ok(out.includes('whoami'), 'expected whoami subcommand');
});

test('skb -h same as --help', () => {
  const a = runSkb(['--help']);
  const b = runSkb(['-h']);
  assert.equal(a, b);
});

test('skb --version prints 1.0.0', () => {
  const out = runSkb(['--version']).trim();
  assert.match(out, /1\.0\.0/);
});

test('skb with unknown command exits non-zero', () => {
  const { code, stderr, stdout } = runSkbCapture(['not-a-real-command-xyz']);
  assert.notEqual(code, 0);
  assert.ok(stderr.length > 0 || stdout.length > 0, 'expected error output');
});

test('skb --help respects LANG=en for root description', () => {
  const out = runSkb(['--help'], {
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8'
  });
  assert.ok(out.includes('command-line management tool'));
});

test('skb --help respects LANG=zh for root description', () => {
  const out = runSkb(['--help'], {
    LANG: 'zh_CN.UTF-8',
    LC_ALL: 'zh_CN.UTF-8'
  });
  assert.ok(out.includes('命令行管理工具'));
});

test('skb whoami with empty HOME exits non-zero and --json reports no_token', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-whoami-'));
  const env = { ...process.env, HOME: home };
  if (process.platform === 'win32') {
    env.USERPROFILE = home;
  }
  const a = runSkbCapture(['whoami'], env);
  assert.notEqual(a.code, 0, 'expected failure without credentials');
  const b = runSkbCapture(['whoami', '--json'], env);
  assert.notEqual(b.code, 0);
  const j = JSON.parse(b.stdout.trim());
  assert.equal(j.ok, false);
  assert.equal(j.reason, 'no_token');
});
