const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// 密码哈希（10 rounds）
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// 验证密码
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// 生成 PAT Token，格式：sk-base-{uuid去掉横线}
function generatePAT() {
  return 'sk-base-' + uuidv4().replace(/-/g, '');
}

// 生成 CLI 验证码，格式：XXXX-XXXX（大写字母+数字）
function generateCliCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除易混淆字符
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// 生成 Session ID
function generateSessionId() {
  return uuidv4();
}

module.exports = { hashPassword, verifyPassword, generatePAT, generateCliCode, generateSessionId };
