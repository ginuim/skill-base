import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveSkillId } from '../../cli/lib/commands/publish.js';

test('resolveSkillId uses folder name when valid', () => {
  assert.equal(resolveSkillId('my-skill', null), 'my-skill');
  assert.equal(resolveSkillId('my_skill', ''), 'my_skill');
});

test('resolveSkillId uses frontmatter when folder invalid', () => {
  assert.equal(resolveSkillId('bad name!', 'valid-id'), 'valid-id');
});

test('resolveSkillId prefers folder when only folder valid', () => {
  assert.equal(resolveSkillId('ok-id', '!!!'), 'ok-id');
});

test('resolveSkillId throws when both set and mismatch', () => {
  assert.throws(() => resolveSkillId('a', 'b'), (err) => {
    assert.ok(err instanceof Error);
    assert.ok(
      err.message.includes('不一致') || err.message.includes('mismatch'),
      err.message
    );
    return true;
  });
});

test('resolveSkillId throws when neither is valid id', () => {
  assert.throws(() => resolveSkillId('bad!', 'also bad'), (err) => {
    assert.ok(err instanceof Error);
    assert.ok(
      err.message.includes('无效') || err.message.includes('Invalid'),
      err.message
    );
    return true;
  });
});
