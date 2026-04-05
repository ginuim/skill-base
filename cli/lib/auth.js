import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './config.js';

export function loadCredentials() {
  const { credentialsPath } = getConfig();
  
  try {
    const content = fs.readFileSync(credentialsPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // Missing file -> null
    return null;
  }
}

export function saveCredentials({ token, username }) {
  const { credentialsDir, credentialsPath } = getConfig();
  
  // Ensure config dir exists
  fs.mkdirSync(credentialsDir, { recursive: true });
  
  // Write credentials JSON
  fs.writeFileSync(credentialsPath, JSON.stringify({ token, username }, null, 2));
}

export function removeCredentials() {
  const { credentialsPath } = getConfig();
  
  try {
    fs.unlinkSync(credentialsPath);
  } catch (err) {
    // Ignore missing file
  }
}
