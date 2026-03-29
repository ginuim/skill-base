<template>
  <nav class="navbar sticky top-0 z-50 bg-base-950/80 backdrop-blur-md border-b border-base-800">
    <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="sb-nav-main">
        <a href="/" class="sb-nav-brand text-lg tracking-tight select-none cursor-pointer">
          <svg class="sb-nav-brand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span class="font-mono text-neon-400 font-bold drop-shadow-[0_0_8px_rgba(0,255,163,0.4)]">Skill</span>
          <span class="text-white font-bold">Base</span>
        </a>

        <div class="sb-nav-links">
          <a
            v-for="item in navItems"
            :key="item.href"
            :href="item.href"
            class="sb-nav-link"
            :class="{ 'is-active': isActiveItem(item.href) }"
          >
            <span class="sb-nav-link-prefix">{{ isActiveItem(item.href) ? './' : '' }}</span>
            <span>{{ item.label }}</span>
          </a>
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
              <a href="/settings" class="navbar-user-menu-item" @click="showUserMenu = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                账户设置
              </a>
              <router-link v-if="authStore.isAdmin" to="/admin/users" class="navbar-user-menu-item" @click="showUserMenu = false">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                用户管理
              </router-link>
              <div class="navbar-user-menu-divider"></div>
              <button class="navbar-user-menu-item navbar-user-logout" @click="logout">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                退出登录
              </button>
            </div>
          </div>

          <router-link v-else to="/login" class="btn btn-primary btn-sm">登录</router-link>
        </div>
      </div>
    </div>

    <div class="sb-nav-mobile" :hidden="!isMobileMenuOpen">
      <div class="sb-nav-mobile-panel">
        <div class="sb-nav-mobile-links">
          <a
            v-for="item in navItems"
            :key="item.href"
            :href="item.href"
            class="sb-nav-mobile-link"
            :class="{ 'is-active': isActiveItem(item.href) }"
            @click="closeMobileMenu"
          >
            <span class="sb-nav-mobile-marker">{{ isActiveItem(item.href) ? './' : '--' }}</span>
            <span>{{ item.label }}</span>
          </a>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

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

const isMobileMenuOpen = ref(false)
const showUserMenu = ref(false)
const showLangMenu = ref(false)
const currentLang = ref('en')

const navItems = computed(() => {
  if (!props.items || !Array.isArray(props.items) || props.items.length === 0) {
    return [
      { href: '/', label: 'Home', i18n: 'nav.home' },
      { href: '/publish', label: 'Publish', i18n: 'nav.publish' }
    ]
  }
  return props.items
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
  currentLang.value = lang
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

.sb-nav-brand-icon {
  color: #00FFA3;
  filter: drop-shadow(0 0 8px rgba(0, 255, 163, 0.4));
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
  color: #a1a1aa;
  font-size: 0.875rem;
  padding: 0.35rem 0.6rem;
  border-radius: 0.5rem;
}

.sb-nav-link:hover,
.sb-nav-link:focus-visible {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.03);
  outline: none;
}

.sb-nav-link.is-active {
  color: #ffffff;
  background: linear-gradient(180deg, rgba(0, 255, 163, 0.08), rgba(255, 255, 255, 0.02));
  box-shadow: inset 0 0 0 1px rgba(0, 255, 163, 0.12);
}

.sb-nav-link-prefix {
  min-width: 1.5rem;
  color: #00FFA3;
}

.sb-nav-mobile-marker {
  min-width: 1.5rem;
  color: #00FFA3;
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
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  background: rgba(19, 20, 26, 0.84);
  color: #e4e4e7;
  transition: all 0.2s ease;
}

.sb-nav-toggle:hover,
.sb-nav-toggle:focus-visible {
  border-color: #00E592;
  color: #00FFA3;
  outline: none;
  box-shadow: 0 0 0 1px rgba(0, 255, 163, 0.2);
}

.sb-nav-mobile {
  display: none;
  padding: 0 1rem 1rem;
}

.sb-nav-mobile-panel {
  border: 1px solid rgba(39, 39, 42, 0.9);
  border-radius: 1rem;
  background: linear-gradient(180deg, rgba(19, 20, 26, 0.98), rgba(9, 9, 11, 0.98));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
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
  color: #a1a1aa;
  padding: 0.875rem 0.9rem;
  border-radius: 0.75rem;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.sb-nav-mobile-link:hover,
.sb-nav-mobile-link:focus-visible {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.04);
  outline: none;
}

.sb-nav-mobile-link.is-active {
  color: #ffffff;
  background: rgba(0, 255, 163, 0.08);
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
  border: 1px solid #27272a;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #a1a1aa;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  white-space: nowrap;
  line-height: 1;
  text-decoration: none;
}

.lang-switcher-trigger:hover {
  border-color: #00e592;
  color: #00ffa3;
  background-color: rgba(0, 255, 163, 0.1);
}

.lang-switcher.active .lang-switcher-trigger {
  border-color: #00e592;
  color: #00ffa3;
  background-color: rgba(0, 255, 163, 0.08);
}

.lang-switcher.active .lang-switcher-trigger:hover {
  background-color: rgba(0, 255, 163, 0.1);
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
  background: #13141a;
  border: 1px solid #27272a;
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
  color: #a1a1aa;
  transition: background-color 0.2s ease, color 0.2s ease;
  text-align: left;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}

.lang-switcher-option:hover {
  background-color: rgba(0, 255, 163, 0.12);
  color: #00FFA3;
}

.lang-switcher-option.active {
  color: #00FFA3;
  font-weight: 600;
  background-color: rgba(0, 255, 163, 0.05);
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
  border: 1px solid #27272a;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
  color: #a1a1aa;
  font-size: 0.875rem;
  text-decoration: none;
  font-family: 'JetBrains Mono', monospace;
}

.navbar-user-btn:hover {
  border-color: #00e592;
  color: #00ffa3;
  background-color: rgba(0, 255, 163, 0.1);
}

.navbar-user-dropdown.active .navbar-user-btn {
  border-color: #00e592;
  color: #00ffa3;
  background-color: rgba(0, 255, 163, 0.08);
}

.navbar-user-dropdown.active .navbar-user-btn:hover {
  background-color: rgba(0, 255, 163, 0.1);
}

.navbar-user-menu {
  display: none;
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 200px;
  background: #13141a;
  border: 1px solid #27272a;
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
  color: #e4e4e7;
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
  background-color: rgba(0, 255, 163, 0.12);
  color: #00FFA3;
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
  background: #27272a;
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
  border: 1px solid #00E592;
  color: #00FFA3;
  box-shadow: 0 0 15px rgba(0, 255, 163, 0.1);
}

.btn-primary:hover {
  background-color: rgba(0, 255, 163, 0.1);
  box-shadow: 0 0 20px rgba(0, 255, 163, 0.2);
  color: #ffffff;
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
