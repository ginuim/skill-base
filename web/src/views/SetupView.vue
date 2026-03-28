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

      <!-- Setup Card -->
      <div class="card p-8">
        <h1 class="text-2xl font-bold text-white text-center mb-2">初始化系统</h1>
        <p class="text-base-400 text-center mb-8 text-sm">
          创建管理员账户以开始使用 Skill Base
        </p>

        <!-- Error Message -->
        <div
          v-if="error"
          class="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
        >
          {{ error }}
        </div>

        <!-- Setup Form -->
        <form @submit.prevent="handleSetup" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">管理员用户名</label>
            <input
              v-model="form.username"
              type="text"
              required
              class="w-full px-4 py-3 rounded-lg"
              placeholder="输入用户名"
              :disabled="isLoading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">管理员密码</label>
            <input
              v-model="form.password"
              type="password"
              required
              class="w-full px-4 py-3 rounded-lg"
              placeholder="输入密码"
              :disabled="isLoading"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">确认密码</label>
            <input
              v-model="form.confirmPassword"
              type="password"
              required
              class="w-full px-4 py-3 rounded-lg"
              placeholder="再次输入密码"
              :disabled="isLoading"
            />
          </div>

          <button
            type="submit"
            class="w-full btn-primary py-3 rounded-lg font-medium flex items-center justify-center gap-2"
            :disabled="isLoading || !isValid"
          >
            <span v-if="isLoading" class="spinner spinner-sm"></span>
            <template v-else>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              完成初始化
            </template>
          </button>
        </form>
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-base-500 mt-8">
        Skill Base - AI Agent Skill 管理平台
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { initApi } from '@/services/api'

const router = useRouter()

const form = ref({
  username: '',
  password: '',
  confirmPassword: '',
})
const isLoading = ref(false)
const error = ref('')

const isValid = computed(() => {
  return form.value.username &&
    form.value.password &&
    form.value.password === form.value.confirmPassword
})

onMounted(async () => {
  // Check if already initialized
  try {
    const status = await initApi.status()
    if (status.initialized) {
      router.push('/')
    }
  } catch (err) {
    console.error('Failed to check init status:', err)
  }
})

async function handleSetup() {
  if (form.value.password !== form.value.confirmPassword) {
    error.value = '两次输入的密码不一致'
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    await initApi.setup({
      admin_username: form.value.username,
      admin_password: form.value.password,
    })

    // Redirect to login
    router.push('/login')
  } catch (err: any) {
    error.value = err.message || '初始化失败'
  } finally {
    isLoading.value = false
  }
}
</script>
