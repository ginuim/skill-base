const fs = require('fs');
const AdmZip = require('adm-zip');
const VersionModel = require('../models/version');
const SkillModel = require('../models/skill');
const { resolveZipPath } = require('./zip');
const { isJunkZipPath } = require('./zip-sanitize');
const { MAX_UPLOAD_BYTES, validatePublishArchive } = require('./publish-archive');

function buildCollectionFileName(collection) {
  const slug = String(collection?.slug || '').trim().toLowerCase();
  if (slug) {
    return `${slug}.zip`;
  }
  return `collection-${collection.id}.zip`;
}

function resolveExistingZipPath(skillId, versionRecord) {
  return resolveZipPath(versionRecord.zip_path, skillId, versionRecord.version);
}

function addSkillZipToBundle(outZip, skillId, zipFilePath, budget) {
  if (fs.statSync(zipFilePath).size > MAX_UPLOAD_BYTES) return false;
  const buffer = fs.readFileSync(zipFilePath);
  if (validatePublishArchive(buffer)) return false;
  const files = new AdmZip(buffer).getEntries().filter((e) => !e.isDirectory && !isJunkZipPath(e.entryName));
  const markdown = files.find((entry) => entry.entryName === 'SKILL.md')
    || files.find((entry) => /^[^/]+\/SKILL\.md$/.test(entry.entryName));
  const prefixLength = markdown.entryName.length - 'SKILL.md'.length;
  budget.bytes += files.reduce((total, entry) => total + entry.header.size, 0);
  budget.files += files.length;
  if (budget.bytes > 256 * 1024 * 1024 || budget.files > 10000) {
    const error = new Error('Collection ZIP exceeds the total size or file count limit');
    error.statusCode = 413;
    throw error;
  }
  for (const entry of files) {
    outZip.addFile(`${skillId}/${entry.entryName.slice(prefixLength)}`, entry.getData());
  }
  return true;
}

/**
 * Build a collection zip buffer from visible skills (must have latest_version + zip on disk).
 * Zip root contains one folder per skill: skill-id/SKILL.md ...
 * @param {{ id: number, name: string }} collection
 * @param {Array<{ id: string, latest_version?: string }>} skills
 * @returns {{ buffer: Buffer, fileName: string, packagedSkills: Array<{ skillId: string, version: string }> }}
 */
function buildCollectionZipBuffer(collection, skills) {
  const outZip = new AdmZip();
  const packagedSkills = [];
  const budget = { bytes: 0, files: 0 };

  for (const skill of skills) {
    const skillId = skill.id;
    const version = skill.latest_version;
    if (!version) continue;

    const versionRecord = VersionModel.getLatest(skillId);
    if (!versionRecord || versionRecord.version !== version) {
      const exact = VersionModel.findByVersion(skillId, version);
      if (!exact) continue;
      const zipPath = resolveExistingZipPath(skillId, exact);
      if (!zipPath) continue;
      if (!addSkillZipToBundle(outZip, skillId, zipPath, budget)) continue;
      packagedSkills.push({ skillId, version });
      continue;
    }

    const zipPath = resolveExistingZipPath(skillId, versionRecord);
    if (!zipPath) continue;

    if (!addSkillZipToBundle(outZip, skillId, zipPath, budget)) continue;
    packagedSkills.push({ skillId, version });
  }

  const fileName = buildCollectionFileName(collection);
  return { buffer: outZip.toBuffer(), fileName, packagedSkills };
}

function incrementDownloadCounts(packagedSkills) {
  for (const { skillId, version } of packagedSkills) {
    SkillModel.incrementDownloadCount(skillId);
    VersionModel.incrementDownloadCount(skillId, version);
  }
}

module.exports = {
  buildCollectionZipBuffer,
  buildCollectionFileName,
  incrementDownloadCounts
};
