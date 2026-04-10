import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runNodeEvalModule } from './helpers.mjs';

test('pickMessage uses en when LANG is English', () => {
  const out = runNodeEvalModule(
    `import { pickMessage } from './cli/lib/i18n.js';
console.log(pickMessage({ zh: 'ZH', en: 'EN' }));`,
    { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }
  );
  assert.equal(out, 'EN');
});

test('pickMessage uses zh when LANG is Chinese', () => {
  const out = runNodeEvalModule(
    `import { pickMessage } from './cli/lib/i18n.js';
console.log(pickMessage({ zh: 'ZH', en: 'EN' }));`,
    { LANG: 'zh_CN.UTF-8', LC_ALL: 'zh_CN.UTF-8' }
  );
  assert.equal(out, 'ZH');
});

test('formatDisplayTime unknown time label', () => {
  const out = runNodeEvalModule(
    `import { formatDisplayTime } from './cli/lib/i18n.js';
console.log(formatDisplayTime(''));`,
    { LANG: 'en_US.UTF-8', LC_ALL: 'en_US.UTF-8' }
  );
  assert.equal(out, 'Unknown time');
});
