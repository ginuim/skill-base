function normalizeBasePath(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  const withTrailingSlash = withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
  return withTrailingSlash.replace(/\/+/g, '/')
}

function readRuntimeBasePath(): string {
  if (typeof document !== 'undefined' && document.baseURI) {
    return normalizeBasePath(new URL(document.baseURI).pathname)
  }

  return normalizeBasePath(import.meta.env.BASE_URL || '/')
}

export const appBasePath = readRuntimeBasePath()
export const apiBasePath = `${appBasePath === '/' ? '' : appBasePath.slice(0, -1)}/api/v1`

export function withBasePath(path: string): string {
  return new URL(path.replace(/^\//, ''), window.location.origin + appBasePath).pathname
}
