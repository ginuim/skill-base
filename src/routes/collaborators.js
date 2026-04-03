const db = require('../database');
const { canManageSkill } = require('../utils/permission');
const UserModel = require('../models/user');
const { invalidateSkill } = require('../utils/model-cache');

async function collaboratorsRoutes(fastify, options) {

  // GET /:skill_id/collaborators - 获取协作者列表（公开）
  fastify.get('/:skill_id/collaborators', async (request, reply) => {
    const { skill_id } = request.params;
    
    // 检查 Skill 是否存在
    const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skill_id);
    if (!skill) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'Skill not found' });
    }
    
    const collaborators = db.prepare(`
      SELECT sc.id, sc.role, sc.created_at,
             u.id as user_id, u.username, u.name, u.status,
             cb.id as created_by_id, cb.username as created_by_username
      FROM skill_collaborators sc
      JOIN users u ON sc.user_id = u.id
      LEFT JOIN users cb ON sc.created_by = cb.id
      WHERE sc.skill_id = ?
      ORDER BY CASE sc.role WHEN 'owner' THEN 0 ELSE 1 END, sc.created_at ASC
    `).all(skill_id);
    
    const result = collaborators.map(c => {
      const item = {
        id: c.id,
        user: { id: c.user_id, username: c.username, name: c.name, status: c.status },
        role: c.role,
        created_at: c.created_at
      };
      if (c.created_by_id) {
        item.created_by = { id: c.created_by_id, username: c.created_by_username };
      }
      return item;
    });
    
    return reply.send({ skill_id, collaborators: result });
  });

  // POST /:skill_id/collaborators - 添加协作者（owner/admin）
  fastify.post('/:skill_id/collaborators', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { user_id, username } = request.body || {};
    
    // 检查 Skill 是否存在
    const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skill_id);
    if (!skill) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'Skill not found' });
    }
    
    // 权限检查
    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }
    
    // 查找目标用户
    let targetUser;
    if (user_id) {
      targetUser = UserModel.findById(parseInt(user_id));
    } else if (username) {
      targetUser = UserModel.findByUsername(username.trim());
    }
    
    if (!targetUser) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'User not found' });
    }
    
    // 检查是否已是协作者
    const existing = db.prepare(
      'SELECT id FROM skill_collaborators WHERE skill_id = ? AND user_id = ?'
    ).get(skill_id, targetUser.id);
    
    if (existing) {
      return reply.code(400).send({ ok: false, error: 'already_collaborator', detail: 'User is already a collaborator' });
    }
    
    // 添加协作者
    const result = db.prepare(
      'INSERT INTO skill_collaborators (skill_id, user_id, role, created_by) VALUES (?, ?, ?, ?)'
    ).run(skill_id, targetUser.id, 'collaborator', request.user.id);
    invalidateSkill(skill_id);
    
    return reply.code(201).send({
      ok: true,
      collaborator: {
        id: result.lastInsertRowid,
        user: { id: targetUser.id, username: targetUser.username },
        role: 'collaborator',
        created_at: new Date().toISOString()
      }
    });
  });

  // DELETE /:skill_id/collaborators/:user_id - 移除协作者（owner/admin）
  fastify.delete('/:skill_id/collaborators/:user_id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id, user_id } = request.params;
    
    // 检查 Skill 是否存在
    const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skill_id);
    if (!skill) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'Skill not found' });
    }
    
    // 权限检查
    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }
    
    // 检查协作者记录
    const collaborator = db.prepare(
      'SELECT id, role FROM skill_collaborators WHERE skill_id = ? AND user_id = ?'
    ).get(skill_id, parseInt(user_id));
    
    if (!collaborator) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'Collaborator not found' });
    }
    
    // 不能移除所有者
    if (collaborator.role === 'owner') {
      return reply.code(400).send({ ok: false, error: 'cannot_remove_owner', detail: 'Cannot remove the owner' });
    }
    
    db.prepare('DELETE FROM skill_collaborators WHERE skill_id = ? AND user_id = ?')
      .run(skill_id, parseInt(user_id));
    invalidateSkill(skill_id);
    
    return reply.send({ ok: true, message: 'Collaborator removed' });
  });

  // POST /:skill_id/transfer-ownership - 转移所有权（owner/admin，事务）
  fastify.post('/:skill_id/transfer-ownership', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { new_owner_id } = request.body || {};
    
    if (!new_owner_id) {
      return reply.code(400).send({ ok: false, error: 'invalid_params', detail: 'New owner must be specified' });
    }
    
    // 检查 Skill 并获取当前所有者
    const skill = db.prepare('SELECT id, owner_id FROM skills WHERE id = ?').get(skill_id);
    if (!skill) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'Skill not found' });
    }
    
    // 权限检查
    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }
    
    const newOwnerId = parseInt(new_owner_id);
    
    if (skill.owner_id === newOwnerId) {
      return reply.code(400).send({ ok: false, error: 'same_owner', detail: 'New owner is the same as current owner' });
    }
    
    // 检查新所有者是否存在
    const newOwner = UserModel.findById(newOwnerId);
    if (!newOwner) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'User not found' });
    }
    
    // 事务操作
    const transferTx = db.transaction(() => {
      // 1. 更新 skills 表 owner_id
      db.prepare('UPDATE skills SET owner_id = ?, updated_at = datetime("now") WHERE id = ?')
        .run(newOwnerId, skill_id);
      
      // 2. 原所有者降级为 collaborator
      db.prepare('UPDATE skill_collaborators SET role = "collaborator" WHERE skill_id = ? AND user_id = ?')
        .run(skill_id, skill.owner_id);
      
      // 3. 新所有者升级为 owner（如不存在则新增）
      const existing = db.prepare(
        'SELECT id FROM skill_collaborators WHERE skill_id = ? AND user_id = ?'
      ).get(skill_id, newOwnerId);
      
      if (existing) {
        db.prepare('UPDATE skill_collaborators SET role = "owner" WHERE skill_id = ? AND user_id = ?')
          .run(skill_id, newOwnerId);
      } else {
        db.prepare('INSERT INTO skill_collaborators (skill_id, user_id, role, created_by) VALUES (?, ?, "owner", ?)')
          .run(skill_id, newOwnerId, request.user.id);
      }
    });
    
    transferTx();
    invalidateSkill(skill_id);
    
    return reply.send({
      ok: true,
      message: 'Ownership transferred',
      new_owner: { id: newOwner.id, username: newOwner.username }
    });
  });

  // DELETE /:skill_id - 删除 Skill（owner/admin，需 confirm 参数，事务）
  fastify.delete('/:skill_id', {
    preHandler: [fastify.authenticate]
  }, async (request, reply) => {
    const { skill_id } = request.params;
    const { confirm } = request.query;
    
    // 确认参数校验
    if (confirm !== skill_id) {
      return reply.code(400).send({
        ok: false,
        error: 'confirm_required',
        detail: 'Confirm parameter is required and must equal the Skill ID'
      });
    }
    
    // 检查 Skill 是否存在
    const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skill_id);
    if (!skill) {
      return reply.code(404).send({ ok: false, error: 'not_found', detail: 'Skill not found' });
    }
    
    // 权限检查
    if (!canManageSkill(request.user, skill_id)) {
      return reply.code(403).send({ ok: false, error: 'forbidden', detail: 'Owner or admin permission required' });
    }
    
    // 获取版本数量（用于响应）
    const versionsCount = db.prepare('SELECT COUNT(*) as count FROM skill_versions WHERE skill_id = ?')
      .get(skill_id).count;
    
    // 事务删除
    const deleteSkillTx = db.transaction(() => {
      db.prepare('DELETE FROM skill_versions WHERE skill_id = ?').run(skill_id);
      db.prepare('DELETE FROM skill_collaborators WHERE skill_id = ?').run(skill_id);
      db.prepare('DELETE FROM skills WHERE id = ?').run(skill_id);
    });
    
    deleteSkillTx();
    invalidateSkill(skill_id);
    
    // 删除文件系统中的文件
    const fs = require('fs');
    const path = require('path');
    const { getDataDir } = require('../utils/zip');
    const skillDir = path.join(getDataDir(), skill_id);
    if (fs.existsSync(skillDir)) {
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
    
    return reply.send({
      ok: true,
      message: 'Skill deleted',
      deleted: { skill_id, versions_count: versionsCount }
    });
  });
}

module.exports = collaboratorsRoutes;
