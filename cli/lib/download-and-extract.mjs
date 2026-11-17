import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import extract from 'extract-zip';
import { createClient } from './api.js';
import { installSkillLinks, readManagedSkillLink } from './linked-skills.mjs';
import { lang } from './i18n.js';

const M = {
  noVersion: {
    zh: (id) => `Skill ${id} 没有可用版本`,
    en: (id) => `Skill ${id} has no available version`
  }
};

function pickFn(obj, arg) {
  const fn = obj[lang] || obj.en;
  return typeof fn === 'function' ? fn(arg) : '';
}

export async function downloadAndExtract(skillId, version, targetDir) {
  const installPath = path.join(targetDir, skillId);
  if (fs.lstatSync(installPath, { throwIfNoEntry: false })?.isSymbolicLink()) {
    const expectedLink = readManagedSkillLink(installPath);
    if (!expectedLink) {
      throw new Error(`Cannot update an unmanaged directory link: ${installPath}`);
    }
    const result = await installSkillLinks([{ installPath, overwrite: true, expectedLink }],
      (store) => downloadAndExtract(skillId, version, store));
    return { ...result, targetDir };
  }
  const client = createClient();

  const skillInfo = await client.get(`/skills/${encodeURIComponent(skillId)}`);

  const actualVersion = version === 'latest' ? skillInfo.latest_version : version;

  if (!actualVersion) {
    throw new Error(pickFn(M.noVersion, skillId));
  }

  const response = await client.download(
    `/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(actualVersion)}/download`
  );

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-download-'));
  try {
    const tmpZip = path.join(tmpDir, 'skill.zip');
    fs.writeFileSync(tmpZip, buffer);
    fs.mkdirSync(targetDir, { recursive: true });
    await extract(tmpZip, { dir: path.resolve(targetDir) });
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return { skillId, version: actualVersion, targetDir };
}
