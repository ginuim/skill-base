<template>
  <nav class="navbar sticky top-0 z-50 bg-base-950/80 backdrop-blur-md border-b border-base-800">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="sb-nav-main">
        <router-link to="/" class="sb-nav-brand text-lg tracking-tight select-none cursor-pointer">
          <svg class="sb-nav-brand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span class="sb-nav-brand-skill font-mono text-neon-400 font-bold">Skill</span>
          <span class="text-fg-strong font-bold">Base</span>
        </router-link>

        <div class="sb-nav-links">
          <router-link
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="sb-nav-link"
            :class="{ 'is-active': isActiveItem(item.href) }"
          >
            <span class="sb-nav-link-prefix">{{ isActiveItem(item.href) ? './' : '' }}</span>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </div>

      <div class="sb-nav-controls">
        <button type="button" class="sb-nav-toggle" :aria-expanded="isMobileMenuOpen" aria-label="Toggle navigation" @click="toggleMobileMenu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="4" y1="7" x2="20" y2="7"></line>
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="17" x2="20" y2="17"></line>
          </svg>
        </button>

        <div class="navbar-user">
          <div class="lang-switcher" :class="{ active: showThemeMenu }">
            <button type="button" class="lang-switcher-trigger navbar-surface-btn" @click.stop="toggleThemeMenu">
              <svg v-if="resolved === 'dark'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
              </svg>
              <span>{{ themeTriggerLabel }}</span>
              <svg class="lang-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="lang-switcher-menu min-w-[148px]">
              <button type="button" class="lang-switcher-option" :class="{ active: preference === 'light' }" @click="setThemePref('light')">{{ t('theme.light') }}</button>
              <button type="button" class="lang-switcher-option" :class="{ active: preference === 'dark' }" @click="setThemePref('dark')">{{ t('theme.dark') }}</button>
              <button type="button" class="lang-switcher-option" :class="{ active: preference === 'system' }" @click="setThemePref('system')">{{ t('theme.system') }}</button>
            </div>
          </div>

          <div class="lang-switcher" :class="{ active: showLangMenu }">
            <button type="button" class="lang-switcher-trigger navbar-surface-btn" @click.stop="toggleLangMenu">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span>{{ currentLang === 'zh' ? '中文' : 'English' }}</span>
              <svg class="lang-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="lang-switcher-menu">
              <button class="lang-switcher-option" :class="{ active: currentLang === 'zh' }" @click="setLang('zh')">中文</button>
              <button class="lang-switcher-option" :class="{ active: currentLang === 'en' }" @click="setLang('en')">English</button>
            </div>
          </div>

          <div v-if="authStore.isLoggedIn" class="navbar-user-dropdown" :class="{ active: showUserMenu }">
            <button type="button" class="navbar-user-btn navbar-surface-btn" @click.stop="toggleUserMenu">
              <span class="username">{{ authStore.displayName }}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <div class="navbar-user-menu">
              <router-link to="/settings" class="navbar-user-menu-item" @click="showUserMenu = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                {{ t('nav.settings') }}
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/users" class="navbar-user-menu-item" @click="showUserMenu = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {{ t('nav.admin') }}
              </router-link>
              <div class="navbar-user-menu-divider"></div>
              <button class="navbar-user-menu-item navbar-user-logout" @click="logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {{ t('nav.logout') }}
              </button>
            </div>
          </div>

          <router-link v-else to="/login" class="btn btn-primary btn-sm">{{ t('nav.login') }}</router-link>
        </div>
      </div>
    </div>

    <div class="sb-nav-mobile" :hidden="!isMobileMenuOpen">
      <div class="sb-nav-mobile-panel">
        <div class="sb-nav-mobile-links">
          <router-link
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="sb-nav-mobile-link"
            :class="{ 'is-active': isActiveItem(item.href) }"
            @click="closeMobileMenu"
          >
            <span class="sb-nav-mobile-marker">{{ isActiveItem(item.href) ? './' : '--' }}</span>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useTheme } from '@/composables/useTheme'
import type { ThemePreference } from '@/theme'

interface NavItem {
  href: string
  label: string
  i18n?: string
}

const props = withDefaults(defineProps<{
  items?: NavItem[]
  currentPath?: string
}>(), {
  items: () => [
    { href: '/', label: 'Home', i18n: 'nav.home' },
    { href: '/publish', label: 'Publish', i18n: 'nav.publish' }
  ],
  currentPath: '/'
})

const router = useRouter()
const authStore = useAuthStore()
const { currentLang: i18nLang, setLang: setI18nLang } = useI18n()

const isMobileMenuOpen = ref(false)
const showUserMenu = ref(false)
const showLangMenu = ref(false)
const showThemeMenu = ref(false)
const currentLang = computed(() => i18nLang.value)

const { preference, resolved, setPreference } = useTheme()
const { t } = useI18n()

const themeTriggerLabel = computed(() => {
  if (preference.value === 'system') return t('theme.systemShort')
  return resolved.value === 'dark' ? t('theme.darkShort') : t('theme.lightShort')
})

const navItems = computed(() => {
  const items = (!props.items || !Array.isArray(props.items) || props.items.length === 0)
    ? [
        { href: '/', label: 'Home', i18n: 'nav.home' },
        { href: '/publish', label: 'Publish', i18n: 'nav.publish' }
      ]
    : props.items
  
  return items.map(item => ({
    ...item,
    label: item.i18n ? t(item.i18n as any) : item.label
  }))
})

function normalizePath(path: string): string {
  if (!path) return '/'
  const [cleanPath] = path.split(/[?#]/)
  const normalized = (cleanPath || '')
    .replace(/\/index\.html$/, '/')
    .replace(/\/+$/, '')
  return normalized || '/'
}

function isActiveItem(href: string): boolean {
  return normalizePath(href) === normalizePath(props.currentPath)
}

function toggleMobileMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function toggleThemeMenu() {
  showThemeMenu.value = !showThemeMenu.value
  if (showThemeMenu.value) {
    showLangMenu.value = false
    showUserMenu.value = false
  }
}

function setThemePref(p: ThemePreference) {
  setPreference(p)
  showThemeMenu.value = false
}

function toggleLangMenu() {
  showLangMenu.value = !showLangMenu.value
  if (showLangMenu.value) {
    showUserMenu.value = false
    showThemeMenu.value = false
  }
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) {
    showLangMenu.value = false
    showThemeMenu.value = false
  }
}

function setLang(lang: 'zh' | 'en') {
  setI18nLang(lang)
  showLangMenu.value = false
}

async function logout() {
  await authStore.logout()
  showUserMenu.value = false
  closeMobileMenu()
  router.push('/login')
}

function handleClickOutside() {
  showUserMenu.value = false
  showLangMenu.value = false
  showThemeMenu.value = false
}

function handleResize() {
  if (window.innerWidth >= 768) {
    isMobileMenuOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('resize', handleResize)
  await authStore.fetchUser()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.navbar {
  display: block;
}

.navbar .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 4rem;
}

.sb-nav-main {
  display: flex;
  align-items: center;
  gap: 2rem;
  min-width: 0;
}

.sb-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  text-decoration: none;
  white-space: nowrap;
}

.sb-nav-brand-skill {
  filter: drop-shadow(0 0 8px rgba(var(--color-neon-rgb), 0.45));
}

.sb-nav-brand-icon {
  color: var(--color-neon-400);
  filter: drop-shadow(0 0 8px rgba(var(--color-neon-rgb), 0.45));
  flex-shrink: 0;
}

.sb-nav-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sb-nav-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
  color: var(--color-base-400);
  font-size: 0.875rem;
  padding: 0.35rem 0.6rem;
  border-radius: 0.5rem;
}

.sb-nav-link:hover,
.sb-nav-link:focus-visible {
  color: var(--color-fg-strong);
  background: color-mix(in srgb, var(--color-fg-strong) 4%, transparent);
  outline: none;
}

.sb-nav-link.is-active {
  color: var(--color-fg-strong);
  background: linear-gradient(180deg, rgba(var(--color-neon-rgb), 0.1), color-mix(in srgb, var(--color-fg-strong) 2%, transparent));
  box-shadow: inset 0 0 0 1px rgba(var(--color-neon-rgb), 0.18);
}

.sb-nav-link-prefix {
  min-width: 1.5rem;
  color: var(--color-neon-400);
}

.sb-nav-mobile-marker {
  min-width: 1.5rem;
  color: var(--color-neon-400);
}

.sb-nav-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.sb-nav-toggle {
  display: none;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--color-base-900) 84%, transparent);
  color: var(--color-fg);
  transition: all 0.2s ease;
}

.sb-nav-toggle:hover,
.sb-nav-toggle:focus-visible {
  border-color: var(--color-neon-500);
  color: var(--color-neon-400);
  outline: none;
  box-shadow: 0 0 0 1px rgba(var(--color-neon-rgb), 0.25);
}

.sb-nav-mobile {
  display: none;
  padding: 0 1rem 1rem;
}

.sb-nav-mobile-panel {
  border: 1px solid var(--color-base-800);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--color-base-900) 98%, transparent);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.14);
  overflow: hidden;
}

.sb-nav-mobile-links {
  display: grid;
  gap: 0;
  padding: 0.5rem;
}

.sb-nav-mobile-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-base-400);
  padding: 0.875rem 0.9rem;
  border-radius: 0.75rem;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.sb-nav-mobile-link:hover,
.sb-nav-mobile-link:focus-visible {
  color: var(--color-fg-strong);
  background: color-mix(in srgb, var(--color-fg-strong) 5%, transparent);
  outline: none;
}

.sb-nav-mobile-link.is-active {
  color: var(--color-fg-strong);
  background: rgba(var(--color-neon-rgb), 0.1);
}

.navbar-user {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}

.lang-switcher {
  position: relative;
  display: inline-flex;
}

.lang-switcher-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid var(--color-base-800);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-base-400);
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  white-space: nowrap;
  line-height: 1;
  text-decoration: none;
}

.lang-switcher-trigger:hover {
  border-color: var(--color-neon-500);
  color: var(--color-neon-400);
  background-color: rgba(var(--color-neon-rgb), 0.12);
}

.lang-switcher.active .lang-switcher-trigger {
  border-color: var(--color-neon-500);
  color: var(--color-neon-400);
  background-color: rgba(var(--color-neon-rgb), 0.1);
}

.lang-switcher.active .lang-switcher-trigger:hover {
  background-color: rgba(var(--color-neon-rgb), 0.12);
}

.lang-chevron {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.lang-switcher.active .lang-chevron {
  transform: rotate(180deg);
}

.lang-switcher-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 108px;
  background: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 200;
  padding: 4px;
}

.lang-switcher.active .lang-switcher-menu {
  display: block;
}

.lang-switcher-option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8125rem;
  color: var(--color-base-400);
  transition: background-color 0.2s ease, color 0.2s ease;
  text-align: left;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}

.lang-switcher-option:hover {
  background-color: rgba(var(--color-neon-rgb), 0.14);
  color: var(--color-neon-400);
}

.lang-switcher-option.active {
  color: var(--color-neon-400);
  font-weight: 600;
  background-color: rgba(var(--color-neon-rgb), 0.08);
}

.navbar-user-dropdown {
  position: relative;
}

.navbar-user-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  background-color: transparent;
  border: 1px solid var(--color-base-800);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  color: var(--color-base-400);
  font-size: 0.875rem;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
}

.navbar-user-btn:hover {
  border-color: var(--color-neon-500);
  color: var(--color-neon-400);
  background-color: rgba(var(--color-neon-rgb), 0.12);
}

.navbar-user-dropdown.active .navbar-user-btn {
  border-color: var(--color-neon-500);
  color: var(--color-neon-400);
  background-color: rgba(var(--color-neon-rgb), 0.1);
}

.navbar-user-dropdown.active .navbar-user-btn:hover {
  background-color: rgba(var(--color-neon-rgb), 0.12);
}

.navbar-user-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 200;
  padding: 4px;
}

.navbar-user-dropdown.active .navbar-user-menu {
  display: block;
}

.navbar-user-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  color: var(--color-fg);
  font-size: 0.875rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  text-decoration: none;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  font-family: 'JetBrains Mono', monospace;
}

.navbar-user-menu-item:hover {
  background-color: rgba(var(--color-neon-rgb), 0.14);
  color: var(--color-neon-400);
}

.navbar-user-logout {
  color: #f87171;
}

.navbar-user-logout:hover {
  background-color: rgba(248, 113, 113, 0.1);
  color: #fca5a5;
}

.navbar-user-menu-divider {
  height: 1px;
  background: var(--color-base-800);
  margin: 4px 0;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 0.5rem;
  text-decoration: none;
  transition: all 0.2s ease;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background-color: transparent;
  border: 1px solid var(--color-neon-500);
  color: var(--color-neon-400);
  box-shadow: 0 0 15px rgba(var(--color-neon-rgb), 0.12);
}

.btn-primary:hover {
  background-color: rgba(var(--color-neon-rgb), 0.12);
  box-shadow: 0 0 20px rgba(var(--color-neon-rgb), 0.22);
  color: var(--color-fg-strong);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

@media (max-width: 767px) {
  .sb-nav-links {
    display: none;
  }

  .sb-nav-toggle,
  .sb-nav-mobile {
    display: flex;
  }

  .navbar-user {
    gap: 0.5rem;
  }
}
</style>
