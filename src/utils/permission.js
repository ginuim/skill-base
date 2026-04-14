const db = require('../database');

/**
 * Check if user has specified permission for a Skill
 * @param {object} user - request.user object
 * @param {string} skillId - Skill ID
 * @param {string} requiredRole - 'owner' | 'collaborator' | 'any'
 * @returns {boolean}
 */
function hasSkillPermission(user, skillId, requiredRole = 'any') {
  // Admin has all permissions
  if (user.role === 'admin') return true;
  
  const collaborator = db.prepare(
    'SELECT role FROM skill_collaborators WHERE skill_id = ? AND user_id = ?'
  ).get(skillId, user.id);
  
  if (!collaborator) return false;
  if (requiredRole === 'any') return true;
  if (requiredRole === 'owner') return collaborator.role === 'owner';
  if (requiredRole === 'collaborator') return true; // owner also has collaborator permission
  return false;
}

/**
 * Check if user can publish Skill
 */
function canPublishSkill(user, skillId) {
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId);
  if (!skill) return true;  // New Skill, any logged-in user can create
  return hasSkillPermission(user, skillId, 'any');
}

/**
 * Check if user can manage collaborators / delete Skill
 */
function canManageSkill(user, skillId) {
  return hasSkillPermission(user, skillId, 'owner');
}

function isSuperAdmin(user) {
  return !!user && user.role === 'admin' && Number(user.is_super_admin || 0) === 1;
}

module.exports = {
  hasSkillPermission,
  canPublishSkill,
  canManageSkill,
  isSuperAdmin
};
