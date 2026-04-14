import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  THEME_STORAGE_KEY,
  type ThemePreference,
  readStoredPreference,
  resolveTheme,
  applyResolvedTheme
} from '@/theme'

export function useTheme() {
  const preference = ref<ThemePreference>(readStoredPreference())
  const resolved = computed(() => resolveTheme(preference.value))

  watch(
    preference,
    (p) => {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, p)
      } catch {
        /* ignore */
      }
      applyResolvedTheme(resolveTheme(p))
    },
    { immediate: true }
  )

  let mq: MediaQueryList | null = null
  function onSystemChange() {
    if (preference.value === 'system') {
      applyResolvedTheme(resolveTheme('system'))
    }
  }

  onMounted(() => {
    mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', onSystemChange)
  })

  onUnmounted(() => {
    mq?.removeEventListener('change', onSystemChange)
  })

  function setPreference(p: ThemePreference) {
    preference.value = p
  }

  return { preference, resolved, setPreference }
}
