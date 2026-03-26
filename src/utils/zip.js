const path = require('path');
const fs = require('fs');

// 获取 zip 存储目录
function getDataDir() {
  return process.env.DATA_DIR || path.join(__dirname, '../../data');
}

// 确保 skill 的存储目录存在
function ensureSkillDir(skillId) {
  const dir = path.join(getDataDir(), 'skills', skillId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 生成时间戳版本号 vYYYYMMDD.HHMMSS
function generateVersionNumber() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `v${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

// 获取 zip 文件的完整路径
function getZipPath(skillId, version) {
  return path.join(getDataDir(), 'skills', skillId, `${version}.zip`);
}

// 获取 zip 文件相对路径（存入数据库）
function getZipRelativePath(skillId, version) {
  return `skills/${skillId}/${version}.zip`;
}

module.exports = { getDataDir, ensureSkillDir, generateVersionNumber, getZipPath, getZipRelativePath };
