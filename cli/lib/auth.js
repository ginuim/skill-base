import fs from 'node:fs';
import { getConfig, DEFAULT_PROFILE } from './config.js';

/**
 * Read all saved credentials keyed by profile.
 * Legacy format ({ token, username } at top level) maps to the "default" profile.
 */
export function loadAllCredentials() {
  const { credentialsPath } = getConfig();

  let data;
  try {
    data = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  } catch (err) {
    // Missing file -> empty
    return {};
  }

  if (data && typeof data.profiles === 'object' && data.profiles) {
    return { ...data.profiles };
  }
  if (data?.token) {
    return { [DEFAULT_PROFILE]: { token: data.token, username: data.username } };
  }
  return {};
}

function writeAllCredentials(all) {
  const { credentialsDir, credentialsPath } = getConfig();
  fs.mkdirSync(credentialsDir, { recursive: true });
  fs.writeFileSync(credentialsPath, JSON.stringify({ profiles: all }, null, 2), { mode: 0o600 });
  try { fs.chmodSync(credentialsPath, 0o600); } catch { /* best effort */ }
}

export function loadCredentials(profile = getConfig().profile) {
  return loadAllCredentials()[profile] || null;
}

export function saveCredentials({ token, username }, profile = getConfig().profile) {
  const all = loadAllCredentials();
  all[profile] = { token, username };
  writeAllCredentials(all);
}

export function removeCredentials(profile = getConfig().profile) {
  const all = loadAllCredentials();
  if (!(profile in all)) return;
  delete all[profile];
  writeAllCredentials(all);
}

export function renameCredentials(from, to) {
  const all = loadAllCredentials();
  if (!(from in all)) return;
  all[to] = all[from];
  delete all[from];
  writeAllCredentials(all);
}
