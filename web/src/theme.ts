/** 与 index.html 内联脚本保持同步（避免首屏闪烁） */
export const THEME_STORAGE_KEY = 'skill-base-theme'

export type ThemePreference = 'light' | 'dark' | 'system'

export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return systemPrefersDark() ? 'dark' : 'light'
  return pref
}

export function applyResolvedTheme(resolved: 'light' | 'dark'): void {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

export function readStoredPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    /* ignore */
  }
  return 'dark'
}

export function initTheme(): void {
  applyResolvedTheme(resolveTheme(readStoredPreference()))
}
