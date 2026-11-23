import fs from 'node:fs';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import yauzl from 'yauzl';

export function assertSkillInstallId(id) {
  if (typeof id !== 'string' || !/^[a-z0-9_-]{1,200}$/i.test(id)
    || /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(id)) {
    throw new Error('Invalid skill ID for installation');
  }
}

const MiB = 1024 * 1024;
export const SKILL_ZIP_LIMIT = 100 * MiB;
export const COLLECTION_ZIP_LIMIT = 256 * MiB;

export async function readZipResponse(response, limit) {
  if (Number(response.headers.get('content-length')) > limit) {
    await response.body?.cancel();
    throw new Error('ZIP exceeds the download size limit');
  }
  if (!response.body) throw new Error('Missing ZIP response body');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel();
        throw new Error('ZIP exceeds the download size limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = Buffer.concat(chunks, bytes);
  const digest = response.headers.get('content-digest');
  if (digest && digest !== `sha-256=:${createHash('sha256').update(buffer).digest('base64')}:`) {
    throw new Error('ZIP failed the SHA-256 integrity check');
  }
  return buffer;
}

export function isSafeArchivePath(name) {
  return !name.split('/').some((part) => !part || /[. ]$|[\\:<>"|?*\x00-\x1f]/.test(part)
    || /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(part));
}

export async function withExtractedZip(buffer, maxBytes, useFiles) {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skb-zip-'));
  let zip;
  try {
    zip = await yauzl.fromBufferPromise(buffer, { strictFileNames: true });
    if (zip.entryCount > 10000) throw new Error('ZIP contains too many entries');
    const entries = new Set();
    let total = 0;
    for await (const entry of zip.eachEntry()) {
      const name = entry.fileName.replace(/\/$/, '');
      const key = name.toLowerCase();
      const mode = entry.externalFileAttributes >>> 16;
      const type = mode & 0o170000;
      const directory = entry.fileName.endsWith('/') || type === 0o040000;
      if (!isSafeArchivePath(name) || entries.has(key) || ![0, 0o040000, 0o100000].includes(type)) {
        throw new Error('ZIP contains an unsafe path, duplicate entry or unsupported file type');
      }
      entries.add(key);
      total += entry.uncompressedSize;
      if (total > maxBytes) throw new Error('ZIP exceeds the uncompressed size limit');
      if (name.split('/').includes('__MACOSX')) continue;

      const destination = path.join(outDir, name);
      if (directory) {
        fs.mkdirSync(destination, { recursive: true });
      } else {
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        const source = await zip.openReadStreamPromise(entry);
        await pipeline(source, fs.createWriteStream(destination, { flags: 'wx', mode: (mode & 0o755) || 0o644 }));
      }
    }

    return await useFiles(outDir);
  } finally {
    zip?.close();
    fs.rmSync(outDir, { recursive: true, force: true });
  }
}

export function findSkillFolder(outDir) {
  if (hasSkillMarkdown(outDir)) return outDir;
  const children = fs.readdirSync(outDir, { withFileTypes: true });
  if (children.length === 1 && children[0].isDirectory()) {
    const nested = path.join(outDir, children[0].name);
    if (hasSkillMarkdown(nested)) return nested;
  }
  throw new Error('ZIP must contain a non-empty SKILL.md at the root of one skill');
}

export function hasSkillMarkdown(dir) {
  const stat = fs.lstatSync(path.join(dir, 'SKILL.md'), { throwIfNoEntry: false });
  return Boolean(stat?.isFile() && stat.size > 0);
}

// Stage verified files on the destination filesystem before swapping directories.
export function installArchiveDirectories(targetDir, sources) {
  for (const [id] of sources) assertSkillInstallId(id);
  fs.mkdirSync(targetDir, { recursive: true });
  const stage = fs.mkdtempSync(path.join(targetDir, '.skb-install-'));
  const applied = [];
  let preserveBackup = false;
  try {
    for (const [index, [, source]] of sources.entries()) {
      fs.cpSync(source, path.join(stage, `new-${index}`), { recursive: true });
    }
    for (const [index, [id]] of sources.entries()) {
      const target = path.join(targetDir, id);
      const replacement = path.join(stage, `new-${index}`);
      const backup = path.join(stage, `old-${index}`);
      const existed = Boolean(fs.lstatSync(target, { throwIfNoEntry: false }));
      if (existed) fs.renameSync(target, backup);
      applied.push({ target, replacement, backup: existed ? backup : null, installed: false });
      fs.renameSync(replacement, target);
      applied.at(-1).installed = true;
    }
  } catch (error) {
    for (const entry of applied.reverse()) {
      try {
        if (entry.installed) fs.renameSync(entry.target, entry.replacement);
        if (entry.backup) fs.renameSync(entry.backup, entry.target);
      } catch {
        preserveBackup = true;
      }
    }
    if (preserveBackup) throw new Error(`Unable to restore all previous files. Backups are in ${stage}`, { cause: error });
    throw error;
  } finally {
    if (!preserveBackup) fs.rmSync(stage, { recursive: true, force: true });
  }
}
