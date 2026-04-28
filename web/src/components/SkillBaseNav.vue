<template>
  <nav class="navbar sticky top-0 z-50 bg-base-950/80 backdrop-blur-md border-b border-base-800">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="sb-nav-main">
        <router-link to="/" class="sb-nav-brand text-lg tracking-tight select-none cursor-pointer">
          <Package class="sb-nav-brand-icon" :size="22" :stroke-width="2" aria-hidden="true" />
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
            <span class="sb-nav-link-icon" aria-hidden="true">
              <component :is="navIconMap[item.icon]" class="sb-nav-lucide" :size="15" :stroke-width="2" />
            </span>
            <span>{{ item.label }}</span>
          </router-link>
        </div>
      </div>

      <div class="sb-nav-controls">
        <button type="button" class="sb-nav-toggle" :aria-expanded="isMobileMenuOpen" aria-label="Toggle navigation" @click="toggleMobileMenu">
          <Menu :size="18" :stroke-width="2" aria-hidden="true" />
        </button>

        <div class="navbar-user">
          <button
            type="button"
            class="lang-switcher-trigger navbar-surface-btn sb-theme-toggle"
            :aria-label="themeToggleAria"
            @click.stop="toggleColorMode"
          >
            <Moon v-if="resolved === 'dark'" :size="16" :stroke-width="2.2" aria-hidden="true" />
            <Sun v-else :size="16" :stroke-width="2.2" aria-hidden="true" />
          </button>

          <div class="lang-switcher" :class="{ active: showLangMenu }">
            <button type="button" class="lang-switcher-trigger navbar-surface-btn" @click.stop="toggleLangMenu">
              <Globe :size="14" :stroke-width="2.2" aria-hidden="true" />
              <span>{{ currentLang === 'zh' ? '中文' : 'English' }}</span>
              <ChevronDown class="lang-chevron" :size="12" :stroke-width="2.5" aria-hidden="true" />
            </button>
            <div class="lang-switcher-menu">
              <button class="lang-switcher-option" :class="{ active: currentLang === 'zh' }" @click="setLang('zh')">中文</button>
              <button class="lang-switcher-option" :class="{ active: currentLang === 'en' }" @click="setLang('en')">English</button>
            </div>
          </div>

          <div v-if="authStore.isLoggedIn" class="navbar-user-dropdown" :class="{ active: showUserMenu }">
            <button type="button" class="navbar-user-btn navbar-surface-btn" @click.stop="toggleUserMenu">
              <span class="username">{{ authStore.displayName }}</span>
              <ChevronDown :size="16" :stroke-width="2" aria-hidden="true" />
            </button>
            <div class="navbar-user-menu">
              <router-link to="/settings" class="navbar-user-menu-item" @click="showUserMenu = false">
                <Settings :size="16" :stroke-width="2" aria-hidden="true" />
                {{ t('nav.settings') }}
              </router-link>
              <router-link v-if="authStore.isAdmin" to="/admin/users" class="navbar-user-menu-item" @click="showUserMenu = false">
                <Users :size="16" :stroke-width="2" aria-hidden="true" />
                {{ t('nav.admin') }}
              </router-link>
              <div class="navbar-user-menu-divider"></div>
              <button class="navbar-user-menu-item navbar-user-logout" @click="logout">
                <LogOut :size="16" :stroke-width="2" aria-hidden="true" />
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
            <span class="sb-nav-link-icon" aria-hidden="true">
              <component :is="navIconMap[item.icon]" class="sb-nav-lucide" :size="15" :stroke-width="2" />
            </span>
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
import {
  Home,
  Upload,
  LayoutGrid,
  Package,
  Menu,
  Moon,
  Sun,
  Globe,
  ChevronDown,
  Settings,
  Users,
  LogOut,
} from 'lucide-vue-next'

type NavMenuIconName = 'home' | 'publish' | 'layout'

const navIconMap = {
  home: Home,
  publish: Upload,
  layout: LayoutGrid
} as const

interface NavItem {
  href: string
  label: string
  i18n?: string
  icon?: NavMenuIconName
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
const currentLang = computed(() => i18nLang.value)

const { resolved, setPreference } = useTheme()
const { t } = useI18n()

const themeToggleAria = computed(() =>
  resolved.value === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')
)

const navItems = computed(() => {
  const items = (!props.items || !Array.isArray(props.items) || props.items.length === 0)
    ? [
        { href: '/', label: 'Home', i18n: 'nav.home' },
        { href: '/publish', label: 'Publish', i18n: 'nav.publish' }
      ]
    : props.items
  
  return items.map(item => ({
    ...item,
    label: item.i18n ? t(item.i18n as any) : item.label,
    icon: item.icon ?? inferNavIcon(item.href)
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

function inferNavIcon(href: string): NavMenuIconName {
  const p = normalizePath(href)
  if (p === '/') return 'home'
  if (p === '/publish') return 'publish'
  return 'layout'
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

function toggleColorMode() {
  setPreference(resolved.value === 'dark' ? 'light' : 'dark')
  showLangMenu.value = false
  showUserMenu.value = false
}

function toggleLangMenu() {
  showLangMenu.value = !showLangMenu.value
  if (showLangMenu.value) {
    showUserMenu.value = false
  }
}

function toggleUserMenu() {
  showUserMenu.value = !showUserMenu.value
  if (showUserMenu.value) {
    showLangMenu.value = false
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
  /* filter: drop-shadow(0 0 8px rgba(var(--color-neon-rgb), 0.45)); */
}

.sb-nav-brand-icon {
  color: var(--color-neon-400);
  /* filter: drop-shadow(0 0 8px rgba(var(--color-neon-rgb), 0.45)); */
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

.sb-nav-link-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: inherit;
  opacity: 0.88;
}

.sb-nav-lucide {
  display: block;
  flex-shrink: 0;
}

.sb-nav-link.is-active .sb-nav-link-icon {
  opacity: 1;
  color: var(--color-neon-400);
}

.sb-nav-mobile-link .sb-nav-link-icon {
  opacity: 0.88;
}

.sb-nav-mobile-link.is-active .sb-nav-link-icon {
  opacity: 1;
  color: var(--color-neon-400);
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

.sb-theme-toggle {
  padding: 6px 8px;
}

.sb-theme-toggle svg {
  display: block;
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
