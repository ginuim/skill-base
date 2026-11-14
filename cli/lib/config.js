import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';
export const DEFAULT_PROFILE = 'default';

function getConfigDir() {
  return path.join(os.homedir(), '.skill-base');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

export function normalizeBaseUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/**
 * Load saved config from ~/.skill-base/config.json
 */
export function loadSavedConfig() {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    // Ignore parse errors
  }
  return {};
}

function writeConfig(config) {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Save config to ~/.skill-base/config.json
 */
export function saveConfig(config) {
  const existing = loadSavedConfig();
  writeConfig({ ...existing, ...config });
}

/**
 * Profiles view of the saved config.
 * Legacy configs (top-level baseUrl only) are exposed as a single "default" profile.
 */
export function loadProfiles() {
  const saved = loadSavedConfig();
  let profiles = saved.profiles && typeof saved.profiles === 'object' ? { ...saved.profiles } : null;
  let currentProfile = saved.currentProfile;

  if (!profiles || Object.keys(profiles).length === 0) {
    profiles = saved.baseUrl ? { [DEFAULT_PROFILE]: { baseUrl: saved.baseUrl } } : {};
    currentProfile = saved.baseUrl ? DEFAULT_PROFILE : undefined;
  }
  if (currentProfile && !profiles[currentProfile]) {
    currentProfile = Object.keys(profiles)[0];
  }

  return { profiles, currentProfile };
}

/**
 * Persist profiles; keeps legacy top-level baseUrl in sync with the current profile
 * so older CLI versions still point at the active server.
 */
export function saveProfiles({ profiles, currentProfile }) {
  const existing = loadSavedConfig();
  const next = { ...existing, profiles, currentProfile };
  const current = currentProfile ? profiles[currentProfile] : null;
  if (current?.baseUrl) {
    next.baseUrl = current.baseUrl;
  } else {
    delete next.baseUrl;
  }
  if (!currentProfile) delete next.currentProfile;
  writeConfig(next);
}

/**
 * Resolve the active profile name.
 * Priority: --profile / SKB_PROFILE > currentProfile in config > "default"
 */
export function getActiveProfileName() {
  const fromEnv = process.env.SKB_PROFILE && process.env.SKB_PROFILE.trim();
  if (fromEnv) return fromEnv;
  const { currentProfile } = loadProfiles();
  return currentProfile || DEFAULT_PROFILE;
}

export function getConfig() {
  const { profiles } = loadProfiles();
  const profile = getActiveProfileName();
  const profileConfig = profiles[profile];

  // Priority: env var > active profile > default
  let baseUrl = process.env.SKB_BASE_URL || profileConfig?.baseUrl || DEFAULT_BASE_URL;
  baseUrl = normalizeBaseUrl(baseUrl);

  const credentialsDir = getConfigDir();

  return {
    profile,
    profileExists: Boolean(profileConfig),
    baseUrl,
    apiUrl: `${baseUrl}/api/v1`,
    credentialsDir,
    credentialsPath: path.join(credentialsDir, 'credentials.json')
  };
}
