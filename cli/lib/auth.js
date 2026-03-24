import fs from 'node:fs';
import path from 'node:path';
import { getConfig } from './config.js';

export function loadCredentials() {
  const { credentialsPath } = getConfig();
  
  try {
    const content = fs.readFileSync(credentialsPath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    // 文件不存在时返回 null
    return null;
  }
}

export function saveCredentials({ token, username }) {
  const { credentialsDir, credentialsPath } = getConfig();
  
  // 创建目录（recursive）
  fs.mkdirSync(credentialsDir, { recursive: true });
  
  // 写入 JSON
  fs.writeFileSync(credentialsPath, JSON.stringify({ token, username }, null, 2));
}

export function removeCredentials() {
  const { credentialsPath } = getConfig();
  
  try {
    fs.unlinkSync(credentialsPath);
  } catch (err) {
    // 不存在时静默忽略
  }
}
