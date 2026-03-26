import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

function getConfigDir() {
  return path.join(os.homedir(), '.skill-base');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
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

/**
 * Save config to ~/.skill-base/config.json
 */
export function saveConfig(config) {
  const configDir = getConfigDir();
  const configPath = getConfigPath();
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  const existing = loadSavedConfig();
  const merged = { ...existing, ...config };
  fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf-8');
}

export function getConfig() {
  const savedConfig = loadSavedConfig();
  
  // Priority: env var > saved config > default
  let baseUrl = process.env.SKB_BASE_URL || savedConfig.baseUrl || DEFAULT_BASE_URL;
  // Remove trailing slashes
  baseUrl = baseUrl.replace(/\/+$/, '');
  
  const credentialsDir = getConfigDir();
  
  return {
    baseUrl,
    apiUrl: `${baseUrl}/api/v1`,
    credentialsDir,
    credentialsPath: path.join(credentialsDir, 'credentials.json')
  };
}
