<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo -->
      <div class="flex items-center justify-center gap-2 text-2xl tracking-tight select-none mb-8">
        <span class="text-neon-400 drop-shadow-[0_0_8px_rgba(0,255,163,0.4)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </span>
        <span class="text-white font-bold font-mono">Skill Base</span>
      </div>

      <!-- 登录卡片 -->
      <div class="bg-base-900 border border-base-800 rounded-xl p-8 shadow-2xl shadow-black/50 relative overflow-hidden">
        <!-- 装饰性代码角标 -->
        <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">AUTH-REQ</div>

        <div class="mb-8">
          <h1 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <span class="text-neon-400 font-mono font-normal opacity-70">></span>
            Sign In
          </h1>
          <p class="text-base-400 text-sm font-mono">
            // 内网 Skill 管理平台 · 需要凭证
          </p>
        </div>

        <!-- 错误信息容器 -->
        <div v-if="authStore.error" class="mb-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono break-words">
          {{ authStore.error }}
        </div>

        <form @submit.prevent="handleLogin" class="space-y-6">
          <!-- Username -->
          <div class="space-y-2">
            <label for="username" class="block text-sm font-mono text-base-400">
              <span class="text-neon-400 opacity-70">const</span> <span class="text-white">username</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <div class="relative">
              <input
                type="text"
                id="username"
                v-model="username"
                placeholder="&quot;operator&quot;"
                autocomplete="username"
                required
                :disabled="authStore.isLoading"
                class="w-full bg-base-950 border border-base-800 text-white font-mono text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500 transition-colors placeholder:text-base-400/50"
              >
            </div>
          </div>

          <!-- Password -->
          <div class="space-y-2">
            <label for="password" class="block text-sm font-mono text-base-400">
              <span class="text-neon-400 opacity-70">const</span> <span class="text-white">password</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <div class="relative">
              <input
                type="password"
                id="password"
                v-model="password"
                placeholder="••••••••"
                autocomplete="current-password"
                required
                :disabled="authStore.isLoading"
                class="w-full bg-base-950 border border-base-800 text-white font-mono text-sm rounded-lg px-4 py-3 focus:outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500 transition-colors placeholder:text-base-400/50"
              >
            </div>
          </div>

          <!-- Submit Button -->
          <div class="pt-2">
            <button
              type="submit"
              :disabled="authStore.isLoading"
              class="w-full flex items-center justify-center bg-transparent border border-neon-500 text-neon-400 hover:bg-[rgba(0,255,163,0.1)] text-sm font-mono px-5 py-3 rounded-lg transition-colors shadow-[0_0_15px_rgba(0,255,163,0.1)] hover:shadow-[0_0_20px_rgba(0,255,163,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg v-if="!authStore.isLoading" class="btn-devtools-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span v-if="authStore.isLoading" class="spinner"></span>
              <span>{{ authStore.isLoading ? '登录中...' : '执行登录' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 底部提示 -->
      <div class="mt-8 text-center text-xs text-base-400 font-mono flex items-center justify-center gap-2">
        <span class="w-1.5 h-1.5 rounded-full bg-neon-400 animate-pulse"></span>
        <span class="opacity-50">Secure Connection Established</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { checkSystemInit } from '@/services/api'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const username = ref('')
const password = ref('')

onMounted(async () => {
  await checkSystemInit()

  const isAuth = await authStore.fetchUser()
  if (isAuth) {
    const redirect = route.query.redirect as string || '/'
    router.push(redirect)
  }
})

async function handleLogin() {
  authStore.clearError()

  const success = await authStore.login(username.value, password.value)
  if (success) {
    const fromCli = route.query.from === 'cli'
    if (fromCli) {
      router.push('/cli-code?from=cli')
    } else {
      const redirect = route.query.redirect as string || '/'
      router.push(redirect)
    }
  }
}
</script>

<style scoped>
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 255, 163, 0.3);
  border-radius: 50%;
  border-top-color: #00FFA3;
  animation: spin 1s linear infinite;
  vertical-align: middle;
  margin-right: 8px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #09090b inset !important;
  -webkit-text-fill-color: white !important;
  transition: background-color 5000s ease-in-out 0s;
}
</style>
