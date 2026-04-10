import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getSupportedIdeIds,
  resolveInstallDir,
  findProjectRoot,
  detectInsideIdeDir,
  IDE_CONFIGS
} from '../../cli/lib/ide.js';

test('getSupportedIdeIds lists known id including cursor', () => {
  const ids = getSupportedIdeIds();
  assert.ok(ids.includes('cursor'));
  assert.ok(ids.includes('claude-code'));
  assert.equal(ids.length, Object.keys(IDE_CONFIGS).length);
});

test('resolveInstallDir throws for unknown ide', () => {
  assert.throws(() => resolveInstallDir('nope', 's', false, os.tmpdir()), (err) => {
    assert.ok(
      err.message.includes('Unsupported') || err.message.includes('不支持'),
      err.message
    );
    return true;
  });
});

test('resolveInstallDir project mode joins project root and projectPath', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-ide-'));
  try {
    fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
    const dir = resolveInstallDir('cursor', 'my-skill', false, tmp);
    assert.equal(dir, path.join(tmp, '.cursor', 'skills'));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('findProjectRoot finds directory with package.json', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-root-'));
  try {
    const nested = path.join(tmp, 'a', 'b');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
    assert.equal(findProjectRoot(nested), tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('detectInsideIdeDir detects cursor skills path', () => {
  const p = path.join(os.homedir(), 'x', '.cursor', 'skills', 'foo');
  const hit = detectInsideIdeDir(p);
  assert.ok(hit);
  assert.equal(hit.id, 'cursor');
});
