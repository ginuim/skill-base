import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveImplicitSelectedInstalls } from '../../cli/lib/commands/update.js';

test('resolveImplicitSelectedInstalls returns single install for plain directory installs', () => {
  const installs = [
    {
      installPath: '/private/tmp/skill-base-cli',
      version: 'v20260402.140737',
      installedAt: '2026-04-05T16:15:41.014Z',
      ide: '',
      isGlobal: false
    }
  ];

  assert.deepEqual(resolveImplicitSelectedInstalls(installs, {}), installs);
});

test('resolveImplicitSelectedInstalls returns explicit directory target without prompting', () => {
  const installs = [
    {
      installPath: '/private/tmp/skill-base-cli',
      version: '',
      installedAt: '',
      ide: '',
      isGlobal: false
    }
  ];

  assert.deepEqual(resolveImplicitSelectedInstalls(installs, { dir: '/private/tmp' }), installs);
});

test('resolveImplicitSelectedInstalls requires prompt when multiple installs exist', () => {
  const installs = [
    {
      installPath: '/private/tmp/skill-base-cli',
      version: 'v1',
      installedAt: '',
      ide: '',
      isGlobal: false
    },
    {
      installPath: '/tmp/.cursor/skills/skill-base-cli',
      version: 'v1',
      installedAt: '',
      ide: 'cursor',
      isGlobal: false
    }
  ];

  assert.equal(resolveImplicitSelectedInstalls(installs, {}), null);
});
