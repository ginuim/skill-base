import os from 'node:os';
import path from 'node:path';

export function getConfig() {
  let baseUrl = process.env.SKB_BASE_URL || 'http://localhost:8000';
  // 去除末尾斜杠
  baseUrl = baseUrl.replace(/\/+$/, '');
  
  const credentialsDir = path.join(os.homedir(), '.skill-base');
  
  return {
    baseUrl,
    apiUrl: `${baseUrl}/api/v1`,
    credentialsDir,
    credentialsPath: path.join(credentialsDir, 'credentials.json')
  };
}
