import fs from 'node:fs';
import path from 'node:path';
import { getConfig, loadSavedConfig, saveConfig } from './config.js';

function loadRegistry() {
  const saved = loadSavedConfig();
  if (!saved.installs || typeof saved.installs !== 'object' || Array.isArray(saved.installs)) {
    return {};
  }
  return saved.installs;
}

function saveRegistry(installs) {
  saveConfig({ installs });
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== 'object' || !entry.installPath) {
    return null;
  }

  return {
    installPath: path.resolve(entry.installPath),
    version: entry.version || '',
    installedAt: entry.installedAt || '',
    ide: entry.ide || '',
    ...(entry.baseUrl ? { baseUrl: entry.baseUrl } : {}),
    isGlobal: Boolean(entry.isGlobal),
  };
}

export function listSkillInstalls(skillId) {
  const installs = loadRegistry();
  const records = Array.isArray(installs[skillId]) ? installs[skillId] : [];

  return records
    .map(normalizeEntry)
    .filter(Boolean)
    .sort((a, b) => a.installPath.localeCompare(b.installPath));
}

export function listInstalledSkills() {
  const installs = loadRegistry();
  const result = [];

  for (const [skillId, records] of Object.entries(installs)) {
    const normalizedRecords = Array.isArray(records)
      ? records.map(normalizeEntry).filter(Boolean)
      : [];

    if (normalizedRecords.length === 0) {
      continue;
    }

    const latestInstalledAt = normalizedRecords
      .map((record) => record.installedAt || '')
      .sort()
      .at(-1) || '';

    result.push({
      skillId,
      installCount: normalizedRecords.length,
      latestInstalledAt,
      installs: normalizedRecords.sort((a, b) => a.installPath.localeCompare(b.installPath)),
    });
  }

  return result.sort((a, b) => {
    const at = a.latestInstalledAt || '';
    const bt = b.latestInstalledAt || '';
    if (at !== bt) return bt.localeCompare(at);
    return a.skillId.localeCompare(b.skillId);
  });
}

export function rememberSkillInstall({ skillId, installPath, version, ide, isGlobal, baseUrl = getConfig().baseUrl }) {
  const installs = loadRegistry();
  const records = Array.isArray(installs[skillId]) ? installs[skillId] : [];
  const normalizedPath = path.resolve(installPath);
  const nextRecord = {
    installPath: normalizedPath,
    version: version || '',
    installedAt: new Date().toISOString(),
    baseUrl,
    ide: ide || '',
    isGlobal: Boolean(isGlobal),
  };

  const nextRecords = records
    .map(normalizeEntry)
    .filter(Boolean)
    .filter((record) => record.installPath !== normalizedPath);

  nextRecords.push(nextRecord);
  installs[skillId] = nextRecords.sort((a, b) => a.installPath.localeCompare(b.installPath));
  saveRegistry(installs);
}

export function pruneMissingSkillInstalls(skillId) {
  const installs = loadRegistry();
  const records = Array.isArray(installs[skillId]) ? installs[skillId] : [];
  const normalizedRecords = records.map(normalizeEntry).filter(Boolean);
  const existingRecords = normalizedRecords.filter((record) => fs.existsSync(record.installPath));

  if (existingRecords.length !== normalizedRecords.length) {
    if (existingRecords.length > 0) {
      installs[skillId] = existingRecords;
    } else {
      delete installs[skillId];
    }
    saveRegistry(installs);
  }

  return existingRecords.sort((a, b) => a.installPath.localeCompare(b.installPath));
}

export function pruneAllMissingInstalls() {
  const installs = loadRegistry();
  const nextInstalls = {};

  for (const [skillId, records] of Object.entries(installs)) {
    const existingRecords = (Array.isArray(records) ? records : [])
      .map(normalizeEntry)
      .filter(Boolean)
      .filter((record) => fs.existsSync(record.installPath))
      .sort((a, b) => a.installPath.localeCompare(b.installPath));

    if (existingRecords.length > 0) {
      nextInstalls[skillId] = existingRecords;
    }
  }

  saveRegistry(nextInstalls);
  return listInstalledSkills();
}

export function removeSkillInstall(skillId, installPath) {
  const installs = loadRegistry();
  const normalizedPath = path.resolve(installPath);
  const records = Array.isArray(installs[skillId]) ? installs[skillId] : [];
  const nextRecords = records
    .map(normalizeEntry)
    .filter(Boolean)
    .filter((record) => record.installPath !== normalizedPath);

  if (nextRecords.length > 0) {
    installs[skillId] = nextRecords;
  } else {
    delete installs[skillId];
  }

  saveRegistry(installs);
}

export function clearSkillInstalls(skillId) {
  const installs = loadRegistry();
  delete installs[skillId];
  saveRegistry(installs);
}

export function isSafeSkillInstallPath(skillId, installPath) {
  const normalizedSkillId = String(skillId || '').trim();
  if (!normalizedSkillId || !installPath) return false;
  return path.basename(path.resolve(installPath)) === normalizedSkillId;
}

export function deleteSkillInstallDirs(skillId, installPaths) {
  const normalizedSkillId = String(skillId || '').trim();
  if (!normalizedSkillId) throw new Error('skillId required');
  if (!Array.isArray(installPaths) || installPaths.length === 0) {
    throw new Error('installPaths required');
  }

  const requestedPaths = [...new Set(installPaths.map((p) => path.resolve(p)))];
  const requested = new Set(requestedPaths);
  const records = listSkillInstalls(normalizedSkillId);
  const matched = new Set();
  const deleted = [];
  const skipped = [];

  for (const record of records) {
    if (!requested.has(record.installPath)) continue;
    matched.add(record.installPath);

    if (!isSafeSkillInstallPath(normalizedSkillId, record.installPath)) {
      skipped.push({ ...record, reason: 'unsafe_path' });
      continue;
    }

    try {
      let existed = false;
      if (fs.existsSync(record.installPath)) {
        existed = true;
        const stat = fs.lstatSync(record.installPath);
        if (!stat.isDirectory()) {
          skipped.push({ ...record, reason: 'not_directory' });
          continue;
        }
        fs.rmSync(record.installPath, { recursive: true, force: true });
      }
      removeSkillInstall(normalizedSkillId, record.installPath);
      deleted.push({ ...record, existed });
    } catch (err) {
      skipped.push({ ...record, reason: err?.message || String(err) });
    }
  }

  for (const installPath of requestedPaths) {
    if (!matched.has(installPath)) {
      skipped.push({ installPath, version: '', installedAt: '', ide: '', isGlobal: false, reason: 'not_recorded' });
    }
  }

  return { deleted, skipped };
}
