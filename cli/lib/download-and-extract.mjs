import path from 'node:path';
import {
  assertSkillInstallId, findSkillFolder, installArchiveDirectories,
  readZipResponse, SKILL_ZIP_LIMIT, withExtractedZip
} from './install-archive.mjs';
import { createClient } from './api.js';
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
  assertSkillInstallId(skillId);
  const client = createClient();

  const skillInfo = await client.get(`/skills/${encodeURIComponent(skillId)}`);

  const actualVersion = version === 'latest' ? skillInfo.latest_version : version;

  if (!actualVersion) {
    throw new Error(pickFn(M.noVersion, skillId));
  }

  const response = await client.download(
    `/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(actualVersion)}/download`
  );

  const buffer = await readZipResponse(response, SKILL_ZIP_LIMIT);
  await withExtractedZip(buffer, 256 * 1024 * 1024, (outDir) =>
    installArchiveDirectories(path.resolve(targetDir), [[skillId, findSkillFolder(outDir)]]));

  return { skillId, version: actualVersion, targetDir };
}
