/**
 * Paths excluded from Skill packages on publish (upload / drop / zip).
 * Keep in sync with src/utils/zip-sanitize.js → isJunkZipPath.
 */
const IGNORED_SEGMENTS = new Set(['__MACOSX', '.git'])
const IGNORED_BASENAMES = new Set(['.gitignore', '.ds_store'])

export function isPublishIgnoredPath(entryPath: string): boolean {
  const normalized = String(entryPath || '').replace(/\\/g, '/')
  const segments = normalized.split('/').filter(Boolean)
  for (const seg of segments) {
    if (IGNORED_SEGMENTS.has(seg)) return true
  }
  const base = segments[segments.length - 1]
  if (!base) return false
  return IGNORED_BASENAMES.has(base.toLowerCase())
}
