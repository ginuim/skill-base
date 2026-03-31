<template>
  <div class="min-h-screen">
    <!-- 面包屑 -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0" style="max-width: 520px;">
      <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
        <span class="text-neon-400">~</span>
        <span class="opacity-50">/</span>
        <router-link to="/" class="hover:text-white transition-colors">home</router-link>
        <span class="opacity-50">/</span>
        <span class="text-white">cli-code</span>
      </div>
    </div>

    <!-- 页面内容 -->
    <main class="page-content">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-16" style="max-width: 520px;">
        <div class="card cli-code-card relative overflow-hidden p-8">
          <!-- 装饰性角标 -->
          <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">AUTH-CLI</div>

          <div class="cli-code-header mb-8 text-left">
            <h1 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
              <span class="text-neon-400 font-mono font-normal opacity-70">></span>
              <span>{{ t('cliCode.heading') }}</span>
            </h1>
            <p class="text-base-400 text-sm font-mono">// {{ t('cliCode.subtitle') }}</p>
          </div>

          <!-- 加载状态 -->
          <div v-if="isLoading" class="cli-code-loading py-8 text-center">
            <div class="spinner mx-auto"></div>
            <div class="text-base-400 text-sm font-mono mt-4">{{ t('cliCode.secureToken') }}</div>
          </div>

          <!-- 验证码显示区域 -->
          <div v-else>
            <div class="cli-code-display rounded-xl p-8 mb-8 flex flex-col items-center">
              <div class="cli-code-value text-4xl sm:text-5xl font-mono tracking-widest text-center select-all">
                {{ cliCode || '----' }}
              </div>
              <div class="cli-code-timer font-mono mt-6 flex items-center gap-2 text-base-400">
                <svg class="cli-code-timer-icon w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <span :class="{ 'text-red-400': isExpiring, 'text-red-500': isExpired }">
                  {{ timerText }}
                </span>
              </div>
            </div>

            <div class="cli-code-actions flex flex-col sm:flex-row gap-4 justify-center">
              <button
                @click="copyCode"
                :disabled="!cliCode || isLoading"
                class="btn btn-primary flex-1 py-3 font-mono text-sm rounded-lg flex items-center justify-center gap-2"
              >
                <svg v-if="!copied" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{{ copied ? t('cliCode.copied') : t('cliCode.copyBtn') }}</span>
              </button>
              <button
                @click="generateCode"
                :disabled="isLoading"
                class="btn btn-secondary flex-1 py-3 font-mono text-sm rounded-lg flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                <span>{{ t('cliCode.regenerate') }}</span>
              </button>
            </div>
          </div>

          <div class="cli-code-hint mt-8 p-4 rounded-lg text-left">
            <strong class="block mb-2 font-mono text-neon-400"># {{ t('cliCode.usage') }}</strong>
            <span class="font-mono text-sm" v-html="t('cliCode.cliHint')"></span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const cliCode = ref('')
const isLoading = ref(false)
const copied = ref(false)
const expiresAt = ref<Date | null>(null)
const timerInterval = ref<number | null>(null)
const remainingMs = ref(0)

const isExpired = computed(() => remainingMs.value <= 0)
const isExpiring = computed(() => remainingMs.value > 0 && remainingMs.value <= 60000)

const timerText = computed(() => {
  if (isExpired.value) {
    return t('cliCode.expired')
  }
  const minutes = Math.floor(remainingMs.value / 60000)
  const seconds = Math.floor((remainingMs.value % 60000) / 1000)
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`
  return `${formattedTime}${t('cliCode.expires')}`
})

onMounted(async () => {
  // Check auth
  const isAuth = await authStore.fetchUser()
  if (!isAuth) {
    router.push('/login')
    return
  }

  generateCode()
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

async function generateCode() {
  isLoading.value = true
  try {
    const response = await apiPost<{ code: string; expires_at: string }>('/auth/cli-code/generate')
    cliCode.value = response.code
    expiresAt.value = new Date(response.expires_at)
    
    // 启动倒计时
    startTimer()
  } catch (err) {
    alert(t('cliCode.genFailed'))
  } finally {
    isLoading.value = false
  }
}

function startTimer() {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
  
  updateTimer()
  timerInterval.value = window.setInterval(updateTimer, 1000)
}

function updateTimer() {
  if (!expiresAt.value) {
    remainingMs.value = 0
    return
  }
  
  const now = new Date()
  remainingMs.value = Math.max(0, expiresAt.value.getTime() - now.getTime())
  
  if (remainingMs.value <= 0 && timerInterval.value) {
    clearInterval(timerInterval.value)
  }
}

async function copyCode() {
  if (!cliCode.value) return
  
  try {
    await navigator.clipboard.writeText(cliCode.value)
    copied.value = true
    
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch (error) {
    // 降级方案
    alert(t('cliCode.copiedToast'))
  }
}
</script>

<style scoped>
.card {
  background-color: #13141a;
  border: 1px solid #27272a;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 0.75rem;
}

.cli-code-display {
  background-color: #09090b;
  border: 1px solid #27272a;
}

.cli-code-value {
  color: #00FFA3;
  text-shadow: 0 0 15px rgba(0,255,163,0.3);
}

.cli-code-hint {
  background-color: rgba(0,255,163,0.05);
  border: 1px solid rgba(0,255,163,0.2);
  color: #a1a1aa;
}

.btn-primary {
  background-color: transparent;
  border: 1px solid #00E592;
  color: #00FFA3;
  box-shadow: 0 0 15px rgba(0,255,163,0.1);
}

.btn-primary:hover:not(:disabled) {
  background-color: rgba(0,255,163,0.1);
  box-shadow: 0 0 20px rgba(0,255,163,0.2);
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid #27272a;
  color: #e4e4e7;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #27272a;
  color: #fff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
