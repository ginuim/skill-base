import fs from 'node:fs';
import path from 'node:path';
import {
  assertSkillInstallId, COLLECTION_ZIP_LIMIT, hasSkillMarkdown, installArchiveDirectories,
  readZipResponse, withExtractedZip
} from './install-archive.mjs';
import { createClient } from './api.js';

export async function downloadCollectionZip(collectionId) {
  const client = createClient();
  const response = await client.download(`/collections/${encodeURIComponent(collectionId)}/download`);
  return readZipResponse(response, COLLECTION_ZIP_LIMIT);
}

export async function extractCollectionZip(buffer, targetDir, skillIds) {
  for (const id of skillIds) assertSkillInstallId(id);
  const expected = new Set(skillIds);
  if (new Set(skillIds.map((id) => id.toLowerCase())).size !== skillIds.length) {
    throw new Error('Collection has conflicting skill IDs');
  }
  await withExtractedZip(buffer, 512 * 1024 * 1024, (outDir) => {
    const folders = fs.readdirSync(outDir, { withFileTypes: true });
    if (folders.length !== expected.size || folders.some((entry) => !entry.isDirectory()
      || !expected.has(entry.name) || !hasSkillMarkdown(path.join(outDir, entry.name)))) {
      throw new Error('Collection ZIP does not match the advertised skills');
    }
    installArchiveDirectories(path.resolve(targetDir), folders.map(({ name }) => [name, path.join(outDir, name)]));
  });
}

export async function fetchCollectionDetail(collectionId) {
  const client = createClient();
  return client.get(`/collections/${encodeURIComponent(collectionId)}`);
}
