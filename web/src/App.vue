<template>
  <div id="app" class="min-h-screen">
    <!-- Show navbar on all pages except landing and login -->
    <AppNavbar v-if="showNavbar" />
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from '@/components/AppNavbar.vue'

const route = useRoute()

const showNavbar = computed(() => {
  // Don't show navbar on landing, login, and setup pages
  const noNavbarRoutes = ['landing', 'login', 'setup']
  return !noNavbarRoutes.includes(route.name as string)
})
</script>

<style>
/* Global styles are in main.css */
</style>
