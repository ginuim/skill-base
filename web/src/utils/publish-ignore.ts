import ignore from 'ignore'

export type PublishIgnoreOptions = {
  gitignore?: string
  useGitignore?: boolean
  skillbaseignore?: string
  custom?: string[]
}

/** Only the selected Skill root's .gitignore is used. Paths are relative to that root. */
export function createPublishIgnore(options: PublishIgnoreOptions = {}) {
  const rules = ignore()
  if (options.useGitignore !== false && options.gitignore) rules.add(options.gitignore)
  if (options.skillbaseignore) rules.add(options.skillbaseignore)
  if (options.custom?.length) rules.add(options.custom)
  return (entryPath: string, isDirectory = false): boolean => {
    const path = entryPath.replace(/\\/g, '/').replace(/^\/+/, '')
    const parts = path.split('/')
    return parts.some((part) => part === '.git' || part === '__MACOSX' || part.toLowerCase() === '.ds_store')
      || path === '.gitignore'
      || rules.ignores(path + (isDirectory ? '/' : ''))
  }
}
