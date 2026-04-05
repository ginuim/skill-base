const path = require('path');
const fs = require('fs');

// Get zip storage directory
function getDataDir() {
  return process.env.DATA_DIR || path.join(__dirname, '../../data');
}

// Ensure skill storage directory exists
function ensureSkillDir(skillId) {
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
  if (zipPath) {
    if (path.isAbsolute(zipPath)) {
      return zipPath;
    }
    return path.join(getDataDir(), zipPath);
  }
  return getZipPath(skillId, version);
}

// Get relative path of zip file (stored in database)
function getZipRelativePath(skillId, version) {
  return `skills/${skillId}/${version}.zip`;
}

module.exports = { getDataDir, ensureSkillDir, generateVersionNumber, getZipPath, resolveZipPath, getZipRelativePath };
