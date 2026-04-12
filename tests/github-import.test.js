const test = require('node:test');
const assert = require('node:assert/strict');
const AdmZip = require('adm-zip');
const {
  parseGithubSource,
  suggestedImportSkillId,
  extractSkillFilesFromZipball,
  buildPublishZipBuffer,
  checkGithubConnectivity
} = require('../src/utils/github-import');
const {
  resolveSkillIdCore,
  slugRepoNameForSkillId,
  folderBasenameHintForGithubImport,
  parseSkillMd
} = require('../src/utils/skill-md');

test('parseGithubSource accepts owner/repo', () => {
  assert.deepEqual(parseGithubSource('foo/bar'), { owner: 'foo', repo: 'bar' });
});

test('parseGithubSource accepts https github URL', () => {
  const r = parseGithubSource('https://github.com/acme/My-Repo');
  assert.equal(r.owner, 'acme');
  assert.equal(r.repo, 'My-Repo');
});

test('parseGithubSource parses tree URL', () => {
  const r = parseGithubSource('https://github.com/acme/r/tree/main/packages/s');
  assert.equal(r.owner, 'acme');
  assert.equal(r.repo, 'r');
  assert.equal(r.ref, 'main');
  assert.equal(r.subpath, 'packages/s');
});

test('suggestedImportSkillId is gh-owner-repo slug', () => {
  assert.equal(suggestedImportSkillId('MyOrg', 'cool.skill'), 'gh-myorg-cool-skill');
});

test('slugRepoNameForSkillId lowercases and replaces invalid chars', () => {
  assert.equal(slugRepoNameForSkillId('A.B_C'), 'a-b_c');
});

test('resolveSkillIdCore uses frontmatter when repo slug invalid', () => {
  const md = '---\nname: my-skill\n---\n# Title\n\ndesc';
  const parsed = parseSkillMd(md);
  const r = resolveSkillIdCore('!!!', parsed.fm?.name);
  assert.equal(r.ok, true);
  assert.equal(r.id, 'my-skill');
});

test('folderBasenameHintForGithubImport uses last subpath segment', () => {
  assert.equal(folderBasenameHintForGithubImport('superpowers', 'skills/brainstorming'), 'brainstorming');
});

test('folderBasenameHintForGithubImport falls back to repo when no subpath', () => {
  assert.equal(folderBasenameHintForGithubImport('superpowers', ''), 'superpowers');
});

test('monorepo subpath + matching frontmatter resolves default id', () => {
  const md = '---\nname: brainstorming\n---\n# Brainstorming\n\ndesc';
  const hint = folderBasenameHintForGithubImport('superpowers', 'skills/brainstorming');
  const parsed = parseSkillMd(md);
  const r = resolveSkillIdCore(hint, parsed.fm?.name);
  assert.equal(r.ok, true);
  assert.equal(r.id, 'brainstorming');
});

test('extractSkillFilesFromZipball reads single root folder', () => {
  const z = new AdmZip();
  z.addFile('repo-abc123/SKILL.md', Buffer.from('# X\n\ny'));
  z.addFile('repo-abc123/nested/a.txt', Buffer.from('z'));
  const { files, skillMdContent } = extractSkillFilesFromZipball(z.toBuffer(), '');
  assert.equal(files.length, 2);
  assert.ok(skillMdContent.includes('# X'));
  const rels = files.map((f) => f.rel).sort();
  assert.deepEqual(rels, ['SKILL.md', 'nested/a.txt']);
});

test('extractSkillFilesFromZipball respects subpath', () => {
  const z = new AdmZip();
  z.addFile('root-xyz/pkg/skill/SKILL.md', Buffer.from('# P'));
  z.addFile('root-xyz/pkg/skill/readme.txt', Buffer.from('r'));
  const { files } = extractSkillFilesFromZipball(z.toBuffer(), 'pkg/skill');
  assert.equal(files.length, 2);
  assert.ok(files.some((f) => f.rel === 'SKILL.md'));
});

test('checkGithubConnectivity reports reachable when fetch succeeds', async (t) => {
  const orig = global.fetch;
  t.after(() => {
    global.fetch = orig;
  });
  global.fetch = async () => ({ ok: true, status: 200 });
  const r = await checkGithubConnectivity();
  assert.equal(r.reachable, true);
  assert.ok(typeof r.latency_ms === 'number');
  assert.ok(r.checked_at);
});

test('checkGithubConnectivity reports unreachable on fetch failure', async (t) => {
  const orig = global.fetch;
  t.after(() => {
    global.fetch = orig;
  });
  global.fetch = async () => {
    throw new Error('ECONNREFUSED');
  };
  const r = await checkGithubConnectivity();
  assert.equal(r.reachable, false);
  assert.ok(r.error);
});

test('buildPublishZipBuffer prefixes target skill id', () => {
  const z = new AdmZip();
  z.addFile('tid/SKILL.md', Buffer.from('# Hi'));
  const buf = z.toBuffer();
  const { files } = extractSkillFilesFromZipball(buf, '');
  const out = buildPublishZipBuffer(files, 'new-id');
  const z2 = new AdmZip(out);
  const names = z2.getEntries().filter((e) => !e.isDirectory).map((e) => e.entryName);
  assert.ok(names.includes('new-id/SKILL.md'));
});
