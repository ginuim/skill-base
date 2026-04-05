const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Password hash (10 rounds)
function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Verify password
function verifyPassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

// Generate PAT Token, format: sk-base-{uuid without dashes}
function generatePAT() {
  return 'sk-base-' + uuidv4().replace(/-/g, '');
}

// Generate CLI verification code, format: XXXX-XXXX (uppercase letters + numbers)
function generateCliCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing characters
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate Session ID
function generateSessionId() {
  return uuidv4();
}

module.exports = { hashPassword, verifyPassword, generatePAT, generateCliCode, generateSessionId };
