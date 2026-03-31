<template>
  <div id="app" class="min-h-screen">
    <!-- Show navbar on all pages except landing, login, and setup -->
    <SkillBaseNav v-if="showNavbar" :current-path="currentPath" />
    <router-view />
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
</script>

<style>
/* Global styles are in main.css */
</style>
