const fs = require('fs');
const db = require('../database');
const SkillModel = require('../models/skill');
const VersionModel = require('../models/version');
const { invalidateSkill } = require('./model-cache');
const { ensureSkillDir, generateVersionNumber, getZipPath, getZipRelativePath } = require('./zip');
const { canPublishSkill } = require('./permission');
const { notifySkillWebhook } = require('./skill-webhook');

/**
 * Persist a new skill version from an in-memory zip (same rules as POST /skills/publish).
 * @param {{ user: object, skillId: string, name?: string, description?: string, changelog?: string, visibility?: string, zipBuffer: Buffer }} params
 * @returns {{ ok: true, skill_id: string, version: string, created_at: string } | { ok: false, status: number, body: object }}
 */
function publishSkillFromZip({ user, skillId, name, description, changelog, visibility, zipBuffer }) {
  if (!zipBuffer || !Buffer.isBuffer(zipBuffer)) {
    return { ok: false, status: 400, body: { detail: 'zip_file is required' } };
  }

  const skill_id = String(skillId || '').trim();
  if (!skill_id) {
    return { ok: false, status: 400, body: { detail: 'skill_id is required' } };
  }

  if (visibility !== undefined && visibility !== 'public' && visibility !== 'private') {
    return { ok: false, status: 400, body: { detail: 'visibility must be public or private' } };
  }

  if (!canPublishSkill(user, skill_id)) {
    return {
      ok: false,
      status: 403,
      body: {
        ok: false,
        error: 'skill_conflict',
        detail: 'Skill already exists and you are not a collaborator'
      }
    };
  }

  const skillExists = SkillModel.exists(skill_id);

  if (!skillExists) {
    if (!name || !String(name).trim()) {
      return { ok: false, status: 400, body: { detail: 'name is required for new skill' } };
    }
    const createSkillTx = db.transaction(() => {
      SkillModel.create(skill_id, String(name).trim(), description || '', user.id, visibility || 'public');
      db.prepare(
        'INSERT INTO skill_collaborators (skill_id, user_id, role, created_by) VALUES (?, ?, ?, ?)'
      ).run(skill_id, user.id, 'owner', user.id);
    });
    createSkillTx();
  }

  const version = generateVersionNumber();
  ensureSkillDir(skill_id);
  const zipPath = getZipPath(skill_id, version);
  try {
    fs.writeFileSync(zipPath, zipBuffer, { flag: 'wx' });
  } catch (error) {
    if (error && error.code === 'EEXIST') {
      return {
        ok: false,
        status: 409,
        body: {
          ok: false,
          error: 'version_conflict',
          detail: 'A version with the same timestamp already exists; please retry publish'
        }
      };
    }
    throw error;
  }
  const zipRelativePath = getZipRelativePath(skill_id, version);

  let versionRecord;
  try {
    versionRecord = VersionModel.create(
      skill_id,
      version,
      changelog || '',
      zipRelativePath,
      user.id,
      description || ''
    );
  } catch (error) {
    fs.rmSync(zipPath, { force: true });
    throw error;
  }

  SkillModel.updateLatestVersion(skill_id, version);
  invalidateSkill(skill_id);

  notifySkillWebhook(
    SkillModel.findById(skill_id),
    'skill.updated',
    { kind: 'version_published', version, created_at: versionRecord.created_at },
    user
  );

  return {
    ok: true,
    skill_id,
    version,
    created_at: versionRecord.created_at
  };
}

module.exports = { publishSkillFromZip };
