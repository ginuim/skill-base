import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { saveConfig } from '../../cli/lib/config.js';
import { listInstalledSkills } from '../../cli/lib/installs.js';

function withTempHome(fn) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-installed-sort-home-'));
  const oldHome = process.env.HOME;
  const oldUserProfile = process.env.USERPROFILE;
  process.env.HOME = home;
  process.env.USERPROFILE = home;
  try {
    return fn(home);
  } finally {
    if (oldHome === undefined) delete process.env.HOME;
    else process.env.HOME = oldHome;
    if (oldUserProfile === undefined) delete process.env.USERPROFILE;
    else process.env.USERPROFILE = oldUserProfile;
    fs.rmSync(home, { recursive: true, force: true });
  }
}

test('listInstalledSkills sorts skills by latest install time descending', () => {
  withTempHome(() => {
    saveConfig({
      installs: {
        older: [
          {
            installPath: '/tmp/older',
            version: 'v1',
            installedAt: '2026-01-01T00:00:00.000Z'
          }
        ],
        newer: [
          {
            installPath: '/tmp/newer',
            version: 'v1',
            installedAt: '2026-01-03T00:00:00.000Z'
          }
        ],
        middle: [
          {
            installPath: '/tmp/middle-old',
            version: 'v1',
            installedAt: '2026-01-02T00:00:00.000Z'
          },
          {
            installPath: '/tmp/middle-new',
            version: 'v2',
            installedAt: '2026-01-04T00:00:00.000Z'
          }
        ]
      }
    });

    assert.deepEqual(
      listInstalledSkills().map((item) => item.skillId),
      ['middle', 'newer', 'older']
    );
  });
});
