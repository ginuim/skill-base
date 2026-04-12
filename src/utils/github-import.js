const AdmZip = require('adm-zip');
const {
  slugRepoNameForSkillId,
  folderBasenameHintForGithubImport,
  resolveSkillIdCore,
  parseSkillMd,
  displayNameAndDescriptionFromParsed
} = require('./skill-md');
const SkillModel = require('../models/skill');
const { canPublishSkill } = require('./permission');

const GITHUB_API = 'https://api.github.com';

const MAX_ZIP_BYTES =
  (Number(process.env.SKILL_BASE_GITHUB_IMPORT_MAX_ZIP_MB) || 50) * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_ENTRY_UNCOMPRESSED = 10 * 1024 * 1024;

const CONNECTIVITY_TIMEOUT_MS =
  Number(process.env.SKILL_BASE_GITHUB_CONNECTIVITY_TIMEOUT_MS) || 8000;

class GitHubImportError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function githubHeaders() {
  const h = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'skill-base-github-import'
  };
  const token = process.env.GITHUB_TOKEN || process.env.SKILL_BASE_GITHUB_TOKEN;
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

/**
 * @param {string} source URL or owner/repo
 * @returns {{ owner: string, repo: string, ref?: string, subpath?: string }}
 */
function parseGithubSource(source) {
  const s = String(source || '').trim();
  if (!s) {
    throw new GitHubImportError('invalid_source', 'source is required');
  }

  const bare = /^([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/;
  const mBare = s.match(bare);
  if (mBare) {
    return { owner: mBare[1], repo: mBare[2] };
  }

  let u;
  try {
    u = new URL(s);
  } catch {
    throw new GitHubImportError('invalid_source', 'Invalid GitHub URL or owner/repo');
  }

  const host = u.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') {
    throw new GitHubImportError('invalid_source', 'Only github.com URLs are allowed');
  }

  const parts = u.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  if (parts.length < 2) {
    throw new GitHubImportError('invalid_source', 'URL must include owner and repository');
  }

  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/, '');

  if (!/^[A-Za-z0-9._-]+$/.test(owner) || !/^[A-Za-z0-9._-]+$/.test(repo)) {
    throw new GitHubImportError('invalid_source', 'Invalid owner or repository name');
  }

  let ref;
  let subpath;
  if (parts[2] === 'tree' && parts.length >= 4) {
    ref = parts[3];
    subpath = parts.slice(4).join('/') || undefined;
  } else if (parts[2] === 'blob' && parts.length >= 5) {
    ref = parts[3];
    const rest = parts.slice(4).join('/');
    const lower = rest.toLowerCase();
    if (lower.endsWith('skill.md')) {
      const slash = rest.lastIndexOf('/');
      subpath = slash >= 0 ? rest.slice(0, slash) : undefined;
    } else {
      subpath = rest || undefined;
    }
  }

  return { owner, repo, ref, subpath };
}

function normalizeSubpath(subpath) {
  if (subpath == null || String(subpath).trim() === '') return '';
  const s = String(subpath).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  if (s.includes('..') || s.startsWith('/')) {
    throw new GitHubImportError('invalid_subpath', 'Invalid subpath');
  }
  return s;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: githubHeaders(),
    redirect: 'follow',
    signal: AbortSignal.timeout(60_000)
  });
  if (res.status === 404) {
    throw new GitHubImportError('repo_not_found', 'Repository or ref not found', 404);
  }
  if (!res.ok) {
    throw new GitHubImportError('github_api_error', `GitHub API error: ${res.status}`, 502);
  }
  return res.json();
}

async function resolveRef(owner, repo, ref) {
  if (ref && String(ref).trim()) {
    return String(ref).trim();
  }
  const data = await fetchJson(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  if (!data.default_branch) {
    throw new GitHubImportError('github_api_error', 'Could not resolve default branch', 502);
  }
  return data.default_branch;
}

async function downloadZipball(owner, repo, ref) {
  const url = `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zipball/${encodeURIComponent(ref)}`;
  const res = await fetch(url, {
    headers: githubHeaders(),
    redirect: 'follow',
    signal: AbortSignal.timeout(120_000)
  });
  if (res.status === 404) {
    throw new GitHubImportError('repo_not_found', 'Repository or ref not found', 404);
  }
  if (!res.ok) {
    throw new GitHubImportError('github_fetch_failed', `Failed to download archive: ${res.status}`, 502);
  }
  const cl = res.headers.get('content-length');
  if (cl && Number(cl) > MAX_ZIP_BYTES) {
    throw new GitHubImportError('archive_too_large', 'Archive exceeds size limit', 413);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_ZIP_BYTES) {
    throw new GitHubImportError('archive_too_large', 'Archive exceeds size limit', 413);
  }
  return buf;
}

/**
 * @returns {{ rootPrefix: string, skillPrefix: string }}
 */
function computeZipPrefixes(zip, subpathNormalized) {
  const entries = zip.getEntries();
  const roots = new Set();
  for (const e of entries) {
    const name = e.entryName.replace(/\\/g, '/');
    const i = name.indexOf('/');
    if (i > 0) {
      roots.add(name.slice(0, i + 1));
    }
  }
  if (roots.size !== 1) {
    throw new GitHubImportError('invalid_archive', 'Expected a single top-level folder in GitHub zipball');
  }
  const rootPrefix = [...roots][0];
  const sp = subpathNormalized ? `${subpathNormalized.replace(/\/+$/g, '')}/` : '';
  const skillPrefix = sp ? `${rootPrefix}${sp}` : rootPrefix;

  const skillMdPath = `${skillPrefix}SKILL.md`;
  const hasSkillMd = entries.some((e) => !e.isDirectory && e.entryName.replace(/\\/g, '/') === skillMdPath);
  if (!hasSkillMd) {
    throw new GitHubImportError('no_skill_md', 'SKILL.md not found at the selected path', 400);
  }

  return { rootPrefix, skillPrefix };
}

/**
 * @returns {{ files: { rel: string, content: Buffer }[], skillMdContent: string }}
 */
function extractSkillFilesFromZipball(buffer, subpathNormalized) {
  const zip = new AdmZip(buffer);
  const { skillPrefix } = computeZipPrefixes(zip, subpathNormalized);
  const entries = zip.getEntries();
  const files = [];
  const prefixLen = skillPrefix.length;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const name = entry.entryName.replace(/\\/g, '/');
    if (!name.startsWith(skillPrefix)) continue;

    let rel = name.slice(prefixLen);
    if (rel.includes('..') || rel.startsWith('/')) {
      throw new GitHubImportError('invalid_archive', 'Unsafe path in archive');
    }

    const data = entry.getData();
    if (data.length > MAX_ENTRY_UNCOMPRESSED) {
      throw new GitHubImportError('entry_too_large', 'A file in the archive exceeds size limit', 413);
    }

    files.push({ rel, content: Buffer.from(data) });
    if (files.length > MAX_FILES) {
      throw new GitHubImportError('too_many_files', 'Too many files in skill directory', 413);
    }
  }

  const skillEntry = files.find((f) => f.rel === 'SKILL.md');
  if (!skillEntry) {
    throw new GitHubImportError('no_skill_md', 'SKILL.md not found at the selected path', 400);
  }

  return {
    files,
    skillMdContent: skillEntry.content.toString('utf8')
  };
}

function buildPublishZipBuffer(files, targetSkillId) {
  const id = String(targetSkillId || '').trim();
  if (!/^[\w-]+$/.test(id)) {
    throw new GitHubImportError('invalid_target_id', 'target_skill_id must match /^[\\w-]+$/');
  }
  const out = new AdmZip();
  for (const { rel, content } of files) {
    const dest = `${id}/${rel.replace(/\\/g, '/')}`;
    if (dest.includes('..')) {
      throw new GitHubImportError('invalid_archive', 'Unsafe path in archive');
    }
    out.addFile(dest, content);
  }
  return out.toBuffer();
}

function suggestedImportSkillId(owner, repo) {
  const a = slugRepoNameForSkillId(owner);
  const b = slugRepoNameForSkillId(repo);
  return `gh-${a}-${b}`;
}

function resolveDefaultSkillId(repo, skillMdContent, subpathNormalized) {
  const folderHint = folderBasenameHintForGithubImport(repo, subpathNormalized);
  const parsed = parseSkillMd(skillMdContent);
  const core = resolveSkillIdCore(folderHint, parsed.fm?.name);
  if (!core.ok) {
    if (core.reason === 'mismatch') {
      const label = subpathNormalized ? 'subpath basename' : 'repo slug';
      throw new GitHubImportError(
        'skill_id_mismatch',
        `skill_id mismatch: ${label} "${core.folder}" vs frontmatter name "${core.fm}"`
      );
    }
    throw new GitHubImportError(
      'invalid_skill_id',
      'Could not derive skill id from repo name and SKILL.md frontmatter'
    );
  }
  const { name, description } = displayNameAndDescriptionFromParsed(parsed, core.id);
  return {
    default_skill_id: core.id,
    name,
    description,
    parsed
  };
}

async function loadGithubSkillPayload(source, refOpt, subpathOpt) {
  const { owner, repo, ref: refFromUrl, subpath: subFromUrl } = parseGithubSource(source);
  const ref = refOpt && String(refOpt).trim() ? String(refOpt).trim() : refFromUrl;
  const subpathRaw = subpathOpt != null && String(subpathOpt).trim() !== '' ? subpathOpt : subFromUrl;
  const subpathNormalized = normalizeSubpath(subpathRaw);

  const resolvedRef = await resolveRef(owner, repo, ref);
  const zipBuffer = await downloadZipball(owner, repo, resolvedRef);
  const { files, skillMdContent } = extractSkillFilesFromZipball(zipBuffer, subpathNormalized);
  const meta = resolveDefaultSkillId(repo, skillMdContent, subpathNormalized);

  return {
    owner,
    repo,
    ref: resolvedRef,
    subpath: subpathNormalized || undefined,
    files,
    skillMdContent,
    ...meta
  };
}

/**
 * Probe whether this server can reach GitHub (same path as zipball import).
 * @returns {Promise<{ reachable: true, latency_ms: number, checked_at: string, http_status?: number } | { reachable: false, error: string, detail?: string, checked_at: string }>}
 */
async function checkGithubConnectivity() {
  const started = Date.now();
  const checked_at = new Date().toISOString();
  try {
    const res = await fetch(`${GITHUB_API}/`, {
      method: 'HEAD',
      redirect: 'follow',
      headers: githubHeaders(),
      signal: AbortSignal.timeout(CONNECTIVITY_TIMEOUT_MS)
    });
    const latency_ms = Date.now() - started;
    if (res.ok) {
      return { reachable: true, latency_ms, checked_at };
    }
    if (res.status >= 500) {
      return {
        reachable: false,
        error: 'http_error',
        detail: `HTTP ${res.status}`,
        checked_at
      };
    }
    return { reachable: true, latency_ms, http_status: res.status, checked_at };
  } catch (err) {
    const name = err && err.name;
    const isTimeout = name === 'TimeoutError' || name === 'AbortError';
    return {
      reachable: false,
      error: isTimeout ? 'timeout' : 'network_error',
      detail: err && err.message ? err.message : String(err),
      checked_at
    };
  }
}

function previewGithubImport(user, payload) {
  const exists = SkillModel.exists(payload.default_skill_id);
  const canPublish = canPublishSkill(user, payload.default_skill_id);
  const conflict = exists && !canPublish;
  const suggested_skill_id = suggestedImportSkillId(payload.owner, payload.repo);

  return {
    default_skill_id: payload.default_skill_id,
    name: payload.name,
    description: payload.description,
    conflict,
    can_publish: canPublish,
    suggested_skill_id,
    repo: { owner: payload.owner, repo: payload.repo },
    ref: payload.ref,
    subpath: payload.subpath
  };
}

module.exports = {
  GitHubImportError,
  parseGithubSource,
  normalizeSubpath,
  loadGithubSkillPayload,
  previewGithubImport,
  buildPublishZipBuffer,
  suggestedImportSkillId,
  extractSkillFilesFromZipball,
  checkGithubConnectivity,
  MAX_ZIP_BYTES
};
