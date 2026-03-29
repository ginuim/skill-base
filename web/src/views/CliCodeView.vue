<template>
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-2 text-2xl tracking-tight select-none mb-8">
        <span class="text-neon-400 drop-shadow-[0_0_8px_rgba(0,255,163,0.4)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </span>
        <span class="font-semibold text-white">Skill Base</span>
      </div>

      <!-- CLI Code Card -->
      <div class="card p-8">
        <h1 class="text-2xl font-bold text-white text-center mb-2">CLI 授权</h1>
        <p class="text-base-400 text-center mb-8 text-sm">
          {{ fromCli ? '请在终端中输入以下授权码' : '生成 CLI 授权码以在命令行中使用' }}
        </p>

        <!-- Code Display -->
        <div class="bg-base-950 rounded-lg p-6 mb-6 text-center">
          <div v-if="isLoading" class="py-4">
            <div class="spinner mx-auto"></div>
          </div>
          <template v-else>
            <div class="font-mono text-3xl text-neon-400 tracking-wider mb-2">
              {{ cliCode }}
            </div>
            <p class="text-xs text-base-500">授权码有效期 5 分钟</p>
          </template>
        </div>

        <!-- Actions -->
        <div class="space-y-4">
          <button
            @click="copyCode"
            :disabled="!cliCode || isLoading"
            class="w-full btn-primary py-3 rounded-lg font-medium flex items-center justify-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            复制授权码
          </button>

          <button
            @click="generateCode"
            :disabled="isLoading"
            class="w-full btn-secondary py-3 rounded-lg font-medium"
          >
            重新生成
          </button>
        </div>

        <!-- Back Link -->
        <div class="mt-6 text-center">
          <router-link
            :to="fromCli ? '/login?from=cli' : '/'"
            class="text-base-400 hover:text-white text-sm"
          >
            {{ fromCli ? '返回登录' : '返回首页' }}
          </router-link>
        </div>
      </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'
import SkillBaseNav from '@/components/SkillBaseNav.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const cliCode = ref('')
const isLoading = ref(false)
const fromCli = ref(false)

onMounted(async () => {
  fromCli.value = route.query.from === 'cli'

  // Check auth
  const isAuth = await authStore.fetchUser()
  if (!isAuth) {
    router.push('/login')
    return
  }

  generateCode()
})

async function generateCode() {
  isLoading.value = true
  try {
    const response = await apiPost<{ code: string }>('/auth/cli-code')
    cliCode.value = response.code
  } catch (err) {
    alert('生成失败')
  } finally {
    isLoading.value = false
  }
}

function copyCode() {
  if (!cliCode.value) return
  navigator.clipboard.writeText(cliCode.value)
  alert('已复制到剪贴板')
}
</script>
