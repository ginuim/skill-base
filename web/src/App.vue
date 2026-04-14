<template>
  <div id="app" class="min-h-screen flex flex-col bg-base-950 text-fg">
    <!-- Show navbar on all pages except landing, login, and setup -->
    <SkillBaseNav v-if="showNavbar" :current-path="currentPath" />
    <main class="flex-1 min-h-0">
      <router-view />
    </main>
    <footer
      v-if="showNavbar"
      class="shrink-0 border-t border-base-800/80 py-4"
    >
      <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] font-mono text-base-400"
        >
          <p class="m-0">&copy; {{ copyrightYear }} Skill Base</p>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href="https://skillbase.reaidea.com"
              target="_blank"
              rel="noopener noreferrer"
              class="text-base-400 hover:text-fg transition-colors"
            >skillbase.reaidea.com</a>
            <span class="text-base-700 hidden sm:inline" aria-hidden="true">·</span>
            <a
              href="https://github.com/ginuim/skill-base"
              target="_blank"
              rel="noopener noreferrer"
              class="text-base-400 hover:text-fg transition-colors"
            >GitHub</a>
          </div>
        </div>
      </div>
    </footer>
    <!-- Global Toast notification -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SkillBaseNav from '@/components/SkillBaseNav.vue'
import Toast from '@/components/Toast.vue'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const toastRef = ref(null)
const { setToastRef } = useToast()

onMounted(() => {
  if (toastRef.value) {
    setToastRef(toastRef.value as any)
  }
})

const showNavbar = computed(() => {
  // Don't show navbar on landing, login, and setup pages
  const noNavbarRoutes = ['landing', 'login', 'setup']
  return !noNavbarRoutes.includes(route.name as string)
})

const currentPath = computed(() => {
  return route.path
})

const copyrightYear = new Date().getFullYear()
</script>

<style>
/* Global styles are in main.css */
</style>
