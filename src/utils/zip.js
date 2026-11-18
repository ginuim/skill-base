const path = require('path');
const fs = require('fs');
const { isValidSkillId } = require('./publish-archive');

// Get zip storage directory
function getDataDir() {
  return process.env.DATA_DIR || path.join(__dirname, '../../data');
}

// Ensure skill storage directory exists
function ensureSkillDir(skillId) {
  if (!isValidSkillId(skillId)) throw new Error('Invalid skill ID');
  const dir = path.join(getDataDir(), 'skills', skillId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// Generate timestamp version number vYYYYMMDD.HHMMSS
function generateVersionNumber() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// Get full path of zip file
function getZipPath(skillId, version) {
  return path.join(getDataDir(), 'skills', skillId, `${version}.zip`);
}

// Resolve actual file path from zip_path in database, compatible with historical relative path format
function resolveZipPath(zipPath, skillId, version) {
  if (!isValidSkillId(skillId) || !/^[a-z0-9][a-z0-9._-]{0,199}$/i.test(version)) return null;
  const dataDir = path.resolve(getDataDir());
  const candidates = [zipPath && path.resolve(dataDir, zipPath), getZipPath(skillId, version)];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const file = fs.realpathSync(candidate);
      const relative = path.relative(fs.realpathSync(dataDir), file);
      if (relative && relative !== '..' && !relative.startsWith(`..${path.sep}`)
        && !path.isAbsolute(relative) && fs.statSync(file).isFile()) return file;
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    }
  }
  return null;
}

// Get relative path of zip file (stored in database)
function getZipRelativePath(skillId, version) {
  return `skills/${skillId}/${version}.zip`;
}

module.exports = { getDataDir, ensureSkillDir, generateVersionNumber, getZipPath, resolveZipPath, getZipRelativePath };
