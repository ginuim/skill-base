const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../database');
const modelCache = require('./model-cache');
const { getDataDir, ensureSkillDir } = require('./zip');

const ALLOWED_MIME_TYPES = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

function maxSizeBytes() {
  const mb = Number(process.env.SKILL_BASE_SCREENSHOT_MAX_MB);
  return (Number.isFinite(mb) && mb > 0 ? Math.min(mb, 100) : 5) * 1024 * 1024;
}

function maxCount() {
  const n = Number(process.env.SKILL_BASE_SCREENSHOT_MAX_COUNT);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 50) : 10;
}

function getScreenshotsDir(skillId) {
  return path.join(ensureSkillDir(skillId), 'screenshots');
}

function parseScreenshots(raw) {
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter((item) => item && typeof item.id === 'string' && typeof item.filename === 'string');
  } catch {
    return [];
  }
}

function listScreenshots(skill) {
  return parseScreenshots(skill && skill.screenshots);
}

function formatScreenshots(skill) {
  return listScreenshots(skill).map((shot) => ({
    id: shot.id,
    url: `skills/${skill.id}/screenshots/${shot.id}/file`,
    created_at: shot.created_at || null
  }));
}

function saveScreenshotsColumn(skillId, screenshots) {
  db.prepare('UPDATE skills SET screenshots = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(JSON.stringify(screenshots), skillId);
  modelCache.invalidateSkill(skillId);
}

// Persist an uploaded image buffer; returns the screenshot record or {error}
function addScreenshot(skillId, mimeType, buffer) {
  const ext = ALLOWED_MIME_TYPES[mimeType];
  if (!ext) {
    return { error: 'invalid_type', detail: 'Only PNG/JPEG/WebP/GIF images are allowed' };
  }
  if (!buffer || buffer.length === 0) {
    return { error: 'empty_file', detail: 'Screenshot file is empty' };
  }
  if (buffer.length > maxSizeBytes()) {
    return { error: 'file_too_large', detail: `Screenshot exceeds the ${Math.round(maxSizeBytes() / 1024 / 1024)}MB limit` };
  }

  const skill = db.prepare('SELECT screenshots FROM skills WHERE id = ?').get(skillId);
  if (!skill) return { error: 'not_found', detail: 'Skill not found' };

  const screenshots = parseScreenshots(skill.screenshots);
  if (screenshots.length >= maxCount()) {
    return { error: 'too_many', detail: `A skill can have at most ${maxCount()} screenshots` };
  }

  const id = crypto.randomUUID();
  const filename = `${id}${ext}`;
  const dir = getScreenshotsDir(skillId);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), buffer);

  const record = { id, filename, mime: mimeType, created_at: new Date().toISOString() };
  screenshots.push(record);
  saveScreenshotsColumn(skillId, screenshots);
  return { screenshot: record };
}

function findScreenshot(screenshots, shotId) {
  return screenshots.find((shot) => shot.id === shotId);
}

function resolveScreenshotFile(skillId, shot) {
  // filename is generated server-side (uuid + whitelist ext); never trust user input here
  const filePath = path.join(getDataDir(), 'skills', skillId, 'screenshots', shot.filename);
  return fs.existsSync(filePath) ? filePath : null;
}

function removeScreenshot(skillId, shotId) {
  const skill = db.prepare('SELECT screenshots FROM skills WHERE id = ?').get(skillId);
  if (!skill) return { error: 'not_found', detail: 'Skill not found' };

  const screenshots = parseScreenshots(skill.screenshots);
  const shot = findScreenshot(screenshots, shotId);
  if (!shot) return { error: 'not_found', detail: 'Screenshot not found' };

  saveScreenshotsColumn(skillId, screenshots.filter((s) => s.id !== shotId));

  const filePath = resolveScreenshotFile(skillId, shot);
  if (filePath) {
    try { fs.unlinkSync(filePath); } catch { /* file already gone */ }
  }
  return { ok: true };
}

// Reorder by id list; ids not in the list keep their relative order at the end
function reorderScreenshots(skillId, orderedIds) {
  const skill = db.prepare('SELECT screenshots FROM skills WHERE id = ?').get(skillId);
  if (!skill) return { error: 'not_found', detail: 'Skill not found' };

  const screenshots = parseScreenshots(skill.screenshots);
  const byId = new Map(screenshots.map((s) => [s.id, s]));
  const seen = new Set();
  const next = [];
  for (const id of orderedIds) {
    if (seen.has(id)) continue;
    const shot = byId.get(id);
    if (!shot) return { error: 'unknown_id', detail: `Unknown screenshot id: ${id}` };
    seen.add(id);
    next.push(shot);
  }
  for (const shot of screenshots) {
    if (!seen.has(shot.id)) next.push(shot);
  }
  saveScreenshotsColumn(skillId, next);
  return { screenshots: next };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  maxSizeBytes,
  maxCount,
  listScreenshots,
  formatScreenshots,
  addScreenshot,
  findScreenshot,
  resolveScreenshotFile,
  removeScreenshot,
  reorderScreenshots
};
