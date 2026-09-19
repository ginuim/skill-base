const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { isAllowedAvatar, normalizeAvatarInput, PRESET_AVATARS } = require('../src/utils/avatars');

test('preset avatars reject path traversal and unknown files', () => {
  assert.equal(isAllowedAvatar('fox.png'), true);
  assert.equal(isAllowedAvatar('../fox.png'), false);
  assert.equal(isAllowedAvatar('/avatars/fox.png'), false);
  assert.equal(isAllowedAvatar('not-a-real.png'), false);
  assert.equal(normalizeAvatarInput(''), null);
  assert.equal(normalizeAvatarInput(null), null);
  assert.equal(normalizeAvatarInput(undefined), undefined);
  assert.equal(normalizeAvatarInput('evil.png'), false);
  assert.equal(normalizeAvatarInput('penguin.png'), 'penguin.png');
  assert.ok(PRESET_AVATARS.length >= 20);
});

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch {
    // Ignore
  }
}

test('updateProfile stores a preset avatar and can clear it', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-base-avatar-'));
  const dbPath = path.join(tempDir, 'skills.db');
  process.env.DATABASE_PATH = dbPath;
  process.env.CACHE_MAX_MB = '8';

  clearModule('../src/utils/lru-cache');
  clearModule('../src/utils/model-cache');
  clearModule('../src/database');
  clearModule('../src/models/user');

  const db = require('../src/database');
  const UserModel = require('../src/models/user');

  const id = db.prepare(`
    INSERT INTO users (username, password_hash, role, name, status, created_at, updated_at)
    VALUES ('alice', 'hash', 'developer', 'Alice', 'active', datetime('now'), datetime('now'))
  `).run().lastInsertRowid;

  UserModel.updateProfile(id, { avatar: 'fox.png' });
  assert.equal(UserModel.findById(id).avatar, 'fox.png');

  UserModel.updateProfile(id, { avatar: null });
  assert.equal(UserModel.findById(id).avatar, null);

  db.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
