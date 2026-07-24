const DESC_MAX = 500

export type SkillMdTemplateInput = {
  name: string
  description: string
  bodyPlaceholder: string
}

/** Build a minimal single-file SKILL.md with YAML frontmatter. */
export function buildSkillMdTemplate(input: SkillMdTemplateInput): string {
  const name = (input.name || 'my-skill').trim() || 'my-skill'
  let description = (input.description || '').trim()
  if (description.length > DESC_MAX) description = description.slice(0, DESC_MAX)
  const body = (input.bodyPlaceholder || '').trim() || 'Write instructions here.'
  return [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    '---',
    '',
    `# ${name}`,
    '',
    body,
    '',
  ].join('\n')
}

/**
 * Prefer slug from parsed name; keep previousId when slug empty
 * so mid-edit frontmatter does not wipe the field.
 */
export function skillIdFromParsedName(parsedName: string, previousId: string): string {
  const raw = (parsedName || '').trim()
  if (!raw) return previousId
  const slug = slugifySkillId(raw)
  return slug || previousId
}

export function slugifySkillId(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim().replace(/\.zip$/i, '')
  s = s.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9\-]+/g, '')
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!s || !/^[a-z0-9\-_]+$/.test(s)) return ''
  return s
}
