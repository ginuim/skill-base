import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { loadDesktopCliStatic } from '../../cli/lib/desktop-cli-static.mjs';
import { registerDesktopHandlers } from '../../cli/lib/desktop-handlers.mjs';

const archiver = createRequire(new URL('../../cli/package.json', import.meta.url))('archiver');

async function zipSkill(version) {
  const zip = archiver('zip');
  zip.append(`# Demo ${version}\n`, { name: 'demo-skill/SKILL.md' });
  const chunks = [];
  const complete = (async () => {
    for await (const chunk of zip) chunks.push(chunk);
    return Buffer.concat(chunks);
  })();
  await zip.finalize();
  return complete;
}

test('linked skill and collection installs share files; updates and deletes leave sibling targets intact', async (t) => {
  const versions = { v1: await zipSkill('v1'), v2: await zipSkill('v2') };
  const skill = { id: 'demo-skill', latest_version: 'v1' };
  const server = http.createServer((request, response) => {
    const match = request.url.match(/\/versions\/(v[12])\/download$/);
    if (match) return response.end(versions[match[1]]);
    if (request.url.endsWith('/collections/demo/download')) return response.end(versions.v1);
    if (request.url.endsWith('/collections/demo')) {
      return response.end(JSON.stringify({ collection: { id: 'demo' }, skills: [skill] }));
    }
    response.end(JSON.stringify(skill));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-link-test-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  t.mock.method(os, 'homedir', () => home);
  const cli = loadDesktopCliStatic();
  cli.saveConfig({ baseUrl: `http://127.0.0.1:${server.address().port}` });
  const { handlers } = registerDesktopHandlers(cli, '', { getProjectRoot: () => home });
  const targets = ['one', 'two'].map((name) => ({ customDir: path.join(home, name) }));
  const paths = targets.map(({ customDir }) => path.join(customDir, skill.id));
  const read = (directory) => fs.readFileSync(path.join(directory, 'SKILL.md'), 'utf8');

  for (const [channel, payload] of [
    ['skills:install', { skillId: skill.id, version: 'v1' }],
    ['collections:install', { collectionRef: 'demo' }]
  ]) {
    const installed = await handlers[channel]({ ...payload, targets, method: 'link', overwrite: true });
    assert.equal(installed.installed.length, 2);
    assert.ok(paths.every((target) => fs.lstatSync(target).isSymbolicLink()));
    assert.equal(fs.realpathSync(paths[0]), fs.realpathSync(paths[1]));
  }

  assert.equal((await handlers['skills:getInstalled']())[0].installs[0].linked, true);
  assert.equal((await handlers['skills:readInstalled']({ skillId: skill.id, installPath: paths[0] })).content, '# Demo v1\n');
  await handlers['skills:update']({ skillId: skill.id, version: 'v2', installPaths: paths });
  assert.equal(fs.realpathSync(paths[0]), fs.realpathSync(paths[1]));
  await cli.downloadAndExtract(skill.id, 'v1', path.dirname(paths[1]));
  assert.equal(read(paths[0]), '# Demo v2\n');
  assert.equal(read(paths[1]), '# Demo v1\n');
  assert.ok(fs.lstatSync(paths[0]).isSymbolicLink());

  await handlers['skills:delete']({ skillId: skill.id, installPaths: [paths[0]] });
  assert.equal(fs.lstatSync(paths[0], { throwIfNoEntry: false }), undefined);
  assert.equal(read(paths[1]), '# Demo v1\n');

  const blocked = path.join(home, 'file');
  fs.writeFileSync(blocked, 'file');
  await assert.rejects(() => handlers['skills:install']({
    skillId: skill.id, version: 'v2', method: 'link', overwrite: true,
    targets: [targets[1], { customDir: blocked }]
  }));
  assert.equal(read(paths[1]), '# Demo v1\n');
});
