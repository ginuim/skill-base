import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { registerDesktopHandlers } from '../../cli/lib/desktop-handlers.mjs';

function createInstallHandler(cliOverrides = {}) {
  const cli = {
    detectInsideIdeDir: () => null,
    isSafeSkillInstallPath: (skillId, installPath) => path.basename(path.resolve(installPath)) === skillId,
    rememberSkillInstall: () => {},
    downloadAndExtract: async () => ({ skillId: 'demo-skill', version: 'v1', targetDir: '/tmp' }),
    ...cliOverrides
  };
  const deps = {
    pickDirectory: async () => null,
    revealPath: async () => ({ ok: true }),
    openExternal: async () => {},
    getProjectRoot: () => process.cwd(),
    setProjectRoot: () => {}
  };
  const { handlers } = registerDesktopHandlers(cli, '', deps);
  return handlers['skills:install'];
}

test('desktop skills:install removes partial skill directory after extract failure', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-desktop-install-'));
  const targetDir = path.join(root, 'skills');
  const installPath = path.join(targetDir, 'demo-skill');
  const install = createInstallHandler({
    downloadAndExtract: async () => {
      fs.mkdirSync(installPath, { recursive: true });
      fs.writeFileSync(path.join(installPath, 'partial.txt'), 'partial', 'utf8');
      throw new Error('extract failed');
    }
  });

  await assert.rejects(
    () =>
      install({
        skillId: 'demo-skill',
        version: 'v1',
        targets: [{ customDir: targetDir }]
      }),
    /extract failed/
  );
  assert.equal(fs.existsSync(installPath), false);

  fs.rmSync(root, { recursive: true, force: true });
});

test('desktop skills:install rejects unwritable target before download', async (t) => {
  if (typeof process.getuid === 'function' && process.getuid() === 0) {
    t.skip('root can bypass directory write permissions');
    return;
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-desktop-install-perm-'));
  const lockedDir = path.join(root, 'locked');
  const targetDir = path.join(lockedDir, 'skills');
  let downloaded = false;

  try {
    fs.mkdirSync(lockedDir, { recursive: true });
    fs.chmodSync(lockedDir, 0o500);
    const install = createInstallHandler({
      downloadAndExtract: async () => {
        downloaded = true;
        return { skillId: 'demo-skill', version: 'v1', targetDir };
      }
    });

    await assert.rejects(
      () =>
        install({
          skillId: 'demo-skill',
          version: 'v1',
          targets: [{ customDir: targetDir }]
        }),
      /没有权限写入安装目录/
    );
    assert.equal(downloaded, false);
  } finally {
    fs.chmodSync(lockedDir, 0o700);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('desktop project targets keep existing Universal directory first', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-desktop-project-targets-'));
  try {
    fs.mkdirSync(path.join(root, '.agents/skills'), { recursive: true });
    fs.mkdirSync(path.join(root, '.cursor/skills'), { recursive: true });
    const cli = {
      findProjectRoot: () => root,
      IDE_CONFIGS: {
        cursor: {
          id: 'cursor',
          name: 'Cursor',
          projectPath: '.cursor/skills',
          globalPath: '.cursor/skills',
          supportsGlobal: true
        },
        universal: {
          id: 'universal',
          name: 'Universal (.agents)',
          projectPath: '.agents/skills',
          globalPath: '.config/agents/skills',
          supportsGlobal: true
        }
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

    const targets = await handlers['config:getProjectTargets'](root);

    assert.equal(targets[0].ide, 'universal');
    assert.equal(targets[0].exists, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
