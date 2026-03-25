const db = require('../database');

/**
 * 检查用户是否有 Skill 的指定权限
 * @param {object} user - request.user 对象
 * @param {string} skillId - Skill ID
 * @param {string} requiredRole - 'owner' | 'collaborator' | 'any'
 * @returns {boolean}
 */
function hasSkillPermission(user, skillId, requiredRole = 'any') {
  // 管理员拥有所有权限
  if (user.role === 'admin') return true;
  
  const collaborator = db.prepare(
    'SELECT role FROM skill_collaborators WHERE skill_id = ? AND user_id = ?'
  ).get(skillId, user.id);
  
  if (!collaborator) return false;
  if (requiredRole === 'any') return true;
  if (requiredRole === 'owner') return collaborator.role === 'owner';
  if (requiredRole === 'collaborator') return true; // owner 也有 collaborator 权限
  return false;
}

/**
 * 检查用户是否可以发布 Skill
 */
function canPublishSkill(user, skillId) {
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId);
  if (!skill) return true;  // 新 Skill，任何登录用户都可创建
  return hasSkillPermission(user, skillId, 'any');
}

/**
 * 检查用户是否可以管理协作者/删除 Skill
 */
function canManageSkill(user, skillId) {
  return hasSkillPermission(user, skillId, 'owner');
}

module.exports = {
  hasSkillPermission,
  canPublishSkill,
  canManageSkill
};
