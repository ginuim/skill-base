<template>
  <nav class="navbar fixed top-0 left-0 right-0 z-50">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <router-link to="/" class="flex items-center gap-2 text-white font-bold text-lg">
          <span class="text-neon-400">$</span> Skill Base
        </router-link>

        <!-- Nav Links -->
        <div class="hidden md:flex items-center gap-1">
          <router-link
            v-for="item in navItems"
            :key="item.path"
            :to="item.path"
            class="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            :class="$route.path === item.path ? 'text-neon-400 bg-neon-400/10' : 'text-base-400 hover:text-white hover:bg-white/5'"
          >
            <span v-if="$route.path === item.path" class="mr-1">./</span>
            {{ item.name }}
          </router-link>
        </div>

        <!-- User Menu -->
        <div class="flex items-center gap-4">
          <!-- Language Toggle -->
          <button
            @click="toggleLang"
            class="px-3 py-1.5 rounded-lg text-xs font-mono border border-base-800 text-base-400 hover:text-white hover:border-base-700 transition-colors"
          >
            {{ currentLang === 'zh' ? 'EN' : '中文' }}
          </button>

          <!-- User Dropdown -->
          <div class="relative" v-if="authStore.isLoggedIn">
            <button
              @click="showUserMenu = !showUserMenu"
              class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-base-200 hover:text-white hover:bg-white/5 transition-colors"
            >
              <span class="w-6 h-6 rounded-full bg-neon-400/20 flex items-center justify-center text-neon-400 text-xs font-bold">
                {{ authStore.displayName.charAt(0).toUpperCase() }}
              </span>
              <span class="hidden sm:block">{{ authStore.displayName }}</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>

            <!-- Dropdown Menu -->
            <Transition name="fade">
              <div
                v-if="showUserMenu"
                class="absolute right-0 mt-2 w-48 rounded-lg card py-1 z-50"
              >
                <router-link
                  to="/settings"
                  class="block px-4 py-2 text-sm text-base-200 hover:text-white hover:bg-white/5"
                  @click="showUserMenu = false"
                >
                  账户设置
                </router-link>
                <router-link
                  v-if="authStore.isAdmin"
                  to="/admin/users"
                  class="block px-4 py-2 text-sm text-base-200 hover:text-white hover:bg-white/5"
                  @click="showUserMenu = false"
                >
                  用户管理
                </router-link>
                <router-link
                  v-if="authStore.isSuperAdmin"
                  to="/admin/tags"
                  class="block px-4 py-2 text-sm text-base-200 hover:text-white hover:bg-white/5"
                  @click="showUserMenu = false"
                >
                  {{ t('nav.tagAdmin') }}
                </router-link>
                <div class="border-t border-base-800 my-1"></div>
                <button
                  @click="logout"
                  class="block w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/10"
                >
                  退出登录
                </button>
              </div>
            </Transition>
          </div>

          <!-- Login Button -->
          <router-link
            v-else
            to="/login"
            class="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
          >
            登录
          </router-link>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const showUserMenu = ref(false)
const currentLang = ref('zh')

const navItems = [
  { name: 'Home', path: '/' },
  { name: 'Publish', path: '/publish' },
]

function toggleLang() {
  currentLang.value = currentLang.value === 'zh' ? 'en' : 'zh'
}

async function logout() {
  await authStore.logout()
  showUserMenu.value = false
  router.push('/login')
}

// Close dropdown when clicking outside
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.relative')) {
    showUserMenu.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
