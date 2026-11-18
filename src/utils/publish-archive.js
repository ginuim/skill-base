const AdmZip = require('adm-zip');
const { inflateRawSync } = require('node:zlib');
const { isJunkZipPath } = require('./zip-sanitize');

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 256 * 1024 * 1024;

function isValidSkillId(id) {
  return typeof id === 'string' && /^[a-z0-9_-]{1,200}$/i.test(id)
    && !/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i.test(id);
}

function validatePublishArchive(buffer, { maxUnpackedBytes = MAX_UNPACKED_BYTES, rootOnly = false } = {}) {
  try {
    const entries = new AdmZip(buffer).getEntries();
    if (entries.length > 10000) return 'ZIP contains too many entries.';
    let total = 0;
    const paths = new Set();
    const files = [];
    for (const entry of entries) {
      const name = entry.entryName.replace(/\/$/, '');
      const key = name.toLowerCase();
      if (name.split('/').some((part) => !part || /[. ]$|[\\:<>"|?*\x00-\x1f]/.test(part)
        || /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(part))
        || paths.has(key) || ((entry.attr >>> 16) & 0o170000) === 0o120000
        || entry.header.encrypted || ![0, 8].includes(entry.header.method)) {
        return 'ZIP contains an unsupported or unsafe entry.';
      }
      paths.add(key);
      total += entry.header.size;
      if (total > maxUnpackedBytes) return 'ZIP exceeds the uncompressed size limit.';
      // AdmZip does not cap inflation when the declared size is zero.
      if (entry.header.size === 0 && entry.header.method === 8
        && inflateRawSync(entry.getCompressedData(), { maxOutputLength: 1 }).length !== 0) {
        return 'Invalid ZIP entry size.';
      }
      if (!entry.isDirectory && !isJunkZipPath(name)) files.push(entry);
    }

    const markdown = files.find((entry) => {
      const name = entry.entryName;
      if (name === 'SKILL.md') return true;
      if (rootOnly || !/^[^/]+\/SKILL\.md$/.test(name)) return false;
      const prefix = name.slice(0, -'SKILL.md'.length);
      return files.every((file) => file.entryName.startsWith(prefix));
    });
    if (!markdown || markdown.header.size === 0 || !markdown.getData().toString('utf8').trim()) {
      return 'The ZIP must contain a non-empty SKILL.md at its root.';
    }
    return null;
  } catch {
    return 'Invalid ZIP archive.';
  }
}

module.exports = { isValidSkillId, validatePublishArchive, MAX_UPLOAD_BYTES, MAX_UNPACKED_BYTES };
