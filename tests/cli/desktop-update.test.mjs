import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { registerDesktopHandlers } from '../../cli/lib/desktop-handlers.mjs';

function createUpdateHandler({ installs, implicit = null } = {}) {
  const downloads = [];
  const remembered = [];
  const cli = {
    buildTargetInstalls: () => installs,
    resolveImplicitSelectedInstalls: () => implicit,
    downloadAndExtract: async (skillId, version, targetDir) => {
      downloads.push({ skillId, version, targetDir });
      return { skillId, version, targetDir };
    },
    rememberSkillInstall: (record) => {
      remembered.push(record);
    }
  };
  const deps = {
    pickDirectory: async () => null,
    revealPath: async () => ({ ok: true }),
    openExternal: async () => {},
    getProjectRoot: () => process.cwd(),
    setProjectRoot: () => {}
  };
  const { handlers } = registerDesktopHandlers(cli, '', deps);
  return { update: handlers['skills:update'], downloads, remembered };
}

test('desktop skills:update still asks for paths when multiple installs are ambiguous', async () => {
  const installs = [
    { installPath: '/tmp/one/demo-skill', version: 'v1', ide: 'cursor', isGlobal: false },
    { installPath: '/tmp/two/demo-skill', version: 'v1', ide: 'codex', isGlobal: false }
  ];
  const { update, downloads } = createUpdateHandler({ installs });

  const result = await update({ skillId: 'demo-skill', version: 'v2' });

  assert.equal(result.ok, false);
  assert.equal(result.code, 'PICK_PATHS');
  assert.deepEqual(result.installs, installs);
  assert.deepEqual(downloads, []);
});

test('desktop skills:update updates every recorded install when all is true', async () => {
  const installs = [
    { installPath: '/tmp/one/demo-skill', version: 'v1', ide: 'cursor', isGlobal: false },
    { installPath: '/tmp/two/demo-skill', version: 'v1', ide: 'codex', isGlobal: false }
  ];
  const { update, downloads, remembered } = createUpdateHandler({ installs });

  const result = await update({ skillId: 'demo-skill', version: 'v2', all: true });

  assert.equal(result.ok, true);
  assert.deepEqual(
    downloads.map((item) => item.targetDir),
    installs.map((item) => path.dirname(item.installPath))
  );
  assert.deepEqual(
    result.updated.map((item) => item.installPath),
    installs.map((item) => item.installPath)
  );
  assert.deepEqual(
    remembered.map((item) => item.installPath),
    installs.map((item) => item.installPath)
  );
});

test('desktop skills:update updates only selected install paths when provided', async () => {
  const installs = [
    { installPath: '/tmp/one/demo-skill', version: 'v1', ide: 'cursor', isGlobal: false },
    { installPath: '/tmp/two/demo-skill', version: 'v1', ide: 'codex', isGlobal: false }
  ];
  const { update, downloads, remembered } = createUpdateHandler({ installs });

  const result = await update({
    skillId: 'demo-skill',
    version: 'v2',
    installPaths: [installs[1].installPath]
  });

  assert.equal(result.ok, true);
  assert.deepEqual(downloads, [
    { skillId: 'demo-skill', version: 'v2', targetDir: path.dirname(installs[1].installPath) }
  ]);
  assert.deepEqual(remembered.map((item) => item.installPath), [installs[1].installPath]);
});
