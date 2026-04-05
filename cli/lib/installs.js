import fs from 'node:fs';
import path from 'node:path';
import { loadSavedConfig, saveConfig } from './config.js';

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

export function rememberSkillInstall({ skillId, installPath, version, ide, isGlobal }) {
  const installs = loadRegistry();
  const records = Array.isArray(installs[skillId]) ? installs[skillId] : [];
  const normalizedPath = path.resolve(installPath);
  const nextRecord = {
    installPath: normalizedPath,
    version: version || '',
    installedAt: new Date().toISOString(),
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
