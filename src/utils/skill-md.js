/**
 * SKILL.md parsing — mirror of cli/lib/skill-md.js for the published CLI package.
 */
const { parse: parseYaml } = require('yaml');

const SKILL_ID_RE = /^[\w-]+$/;

/**
 * @param {string} repoName raw GitHub repo name
 * @returns {string} slug matching SKILL_ID_RE when possible
 */
function slugRepoNameForSkillId(repoName) {
  const s = String(repoName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s && SKILL_ID_RE.test(s) ? s : 'skill';
}

/**
 * GitHub zip 导入：无子路径时用仓库名 slug；有子路径时用子路径最后一级目录名（与本地 publish 的「文件夹名」一致）。
 * @param {string} repoName
 * @param {string} subpathNormalized normalizeSubpath 的结果，可为 ''
 */
function folderBasenameHintForGithubImport(repoName, subpathNormalized) {
  const sp = String(subpathNormalized || '').trim();
  if (sp) {
    const parts = sp.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) return slugRepoNameForSkillId(last);
  }
  return slugRepoNameForSkillId(repoName);
}

/**
 * @returns {{ ok: true, id: string } | { ok: false, reason: 'mismatch'|'invalid', folder: string, fm: string }}
 */
function resolveSkillIdCore(folderBasename, frontmatterName) {
  const f = String(folderBasename ?? '').trim();
  const m =
    frontmatterName === undefined || frontmatterName === null
      ? ''
      : String(frontmatterName).trim();

  const fOk = SKILL_ID_RE.test(f);
  const mOk = m.length > 0 && SKILL_ID_RE.test(m);

  if (fOk && mOk) {
    if (f === m) return { ok: true, id: f };
    return { ok: false, reason: 'mismatch', folder: f, fm: m };
  }
  if (fOk) return { ok: true, id: f };
  if (mOk) return { ok: true, id: m };
  return { ok: false, reason: 'invalid', folder: f, fm: m || '' };
}

function splitFrontmatter(content) {
  const s = content.replace(/^\uFEFF/, '');
  if (!s.startsWith('---')) return { fmYaml: null, body: s };
  const lines = s.split(/\r?\n/);
  if (lines[0].trim() !== '---') return { fmYaml: null, body: s };
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (end === -1) return { fmYaml: null, body: s };
  const fmYaml = lines.slice(1, end).join('\n');
  const body = lines.slice(end + 1).join('\n');
  return { fmYaml, body };
}

function parseBodyHeading(body) {
  const lines = body.split(/\r?\n/);
  let name = null;
  let description = null;
  let foundTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!foundTitle && trimmed.startsWith('# ')) {
      name = trimmed.slice(2).trim();
      foundTitle = true;
      continue;
    }

    if (foundTitle && trimmed && !trimmed.startsWith('#')) {
      description = trimmed.slice(0, 200);
      break;
    }
  }

  return { name, description };
}

function parseSkillMd(content) {
  const { fmYaml, body } = splitFrontmatter(content);
  let fm = null;
  if (fmYaml !== null && fmYaml.trim() !== '') {
    try {
      fm = parseYaml(fmYaml);
      if (fm === null || typeof fm !== 'object') fm = {};
    } catch {
      fm = null;
    }
  }

  const heading = parseBodyHeading(body);
  let descriptionFromFm = '';
  if (fm && fm.description !== undefined && fm.description !== null) {
    descriptionFromFm = String(fm.description).trim();
  }

  return {
    fm,
    headingTitle: heading.name,
    headingDescription: heading.description,
    descriptionFromFm
  };
}

function displayNameAndDescriptionFromParsed(parsed, fallbackId) {
  const name = parsed.headingTitle || fallbackId;
  const description =
    (parsed.descriptionFromFm ? parsed.descriptionFromFm : '') ||
    parsed.headingDescription ||
    '';
  return { name, description };
}

module.exports = {
  SKILL_ID_RE,
  slugRepoNameForSkillId,
  folderBasenameHintForGithubImport,
  resolveSkillIdCore,
  parseSkillMd,
  displayNameAndDescriptionFromParsed
};
