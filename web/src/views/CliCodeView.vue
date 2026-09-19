<template>
  <main class="flat-page cli-code-page">
    <router-link to="/settings" class="flat-back"
      >← {{ t('settings.heading') }}</router-link
    >
    <header class="flat-header">
      <h1>{{ t('cliCode.heading') }}</h1>
      <p>{{ t('cliCode.subtitle') }}</p>
    </header>
    <!-- 加载状态 -->
    <div v-if="isLoading" class="cli-code-loading py-8 text-center">
      <div class="spinner mx-auto"></div>
      <div class="text-base-400 text-sm font-mono mt-4">
        {{ t('cliCode.secureToken') }}
      </div>
    </div>

    <!-- 验证码显示区域 -->
    <div v-else>
      <div class="cli-code-display flex flex-col items-start">
        <div
          class="cli-code-value text-4xl sm:text-5xl font-mono tracking-widest text-center select-all"
        >
          {{ cliCode || '----' }}
        </div>
        <div
          class="cli-code-timer font-mono mt-6 flex items-center gap-2 text-base-400"
        >
          <Clock
            class="cli-code-timer-icon w-4 h-4"
            :stroke-width="2"
            aria-hidden="true"
          />
          <span
            :class="{ 'text-red-400': isExpiring, 'text-red-500': isExpired }"
          >
            {{ timerText }}
          </span>
        </div>
      </div>

      <div class="cli-code-actions flex flex-wrap gap-3">
        <button
          @click="copyCode"
          :disabled="!cliCode || isLoading || isExpired"
          class="flat-primary"
        >
          <Copy
            v-if="!copied"
            :size="16"
            :stroke-width="2"
            aria-hidden="true"
          />
          <Check v-else :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ copied ? t('cliCode.copied') : t('cliCode.copyBtn') }}</span>
        </button>
        <button
          @click="generateCode"
          :disabled="isLoading"
          class="flat-secondary"
        >
          <RefreshCw :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t('cliCode.regenerate') }}</span>
        </button>
      </div>
    </div>

    <div class="cli-code-hint">
      <strong class="block mb-3 text-fg-strong">{{
        t('cliCode.usage')
      }}</strong>
      <span class="font-mono text-sm" v-html="t('cliCode.cliHint')"></span>
    </div>
  </main>
</template>

<script setup lang="ts">
import { Clock, Copy, Check, RefreshCw } from 'lucide-vue-next'
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'
import { copyToClipboard } from '@/utils/clipboard'

const authStore = useAuthStore()
const { t } = useI18n()

const cliCode = ref('')
const isLoading = ref(false)
const copied = ref(false)
const expiresAt = ref<Date | null>(null)
const timerInterval = ref<number | null>(null)
const remainingMs = ref(0)

const isExpired = computed(() => remainingMs.value <= 0)
const isExpiring = computed(
  () => remainingMs.value > 0 && remainingMs.value <= 60000,
)

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
  if (await authStore.fetchUser()) {
    generateCode()
  }
})

onUnmounted(() => {
  if (timerInterval.value) {
    clearInterval(timerInterval.value)
  }
})

async function generateCode() {
  isLoading.value = true
  try {
    const response = await apiPost<{ code: string; expires_at: string }>(
      '/auth/cli-code/generate',
    )
    cliCode.value = response.code
    expiresAt.value = new Date(response.expires_at)

    // 启动倒计时
    startTimer()
  } catch (err) {
    globalToast.error(t('cliCode.genFailed'))
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

  const success = await copyToClipboard(cliCode.value)
  if (success) {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } else {
    globalToast.error(t('cliCode.copyFailed') || '复制失败')
  }
}
</script>

<style scoped>
.cli-code-page {
  max-width: 760px;
}
.cli-code-display {
  padding: 24px 0 32px;
}
.cli-code-value {
  color: var(--color-fg-strong);
  font-weight: 600;
}
.cli-code-hint {
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid var(--color-base-800);
  color: var(--color-base-400);
  line-height: 1.9;
}
.cli-code-loading {
  min-height: 210px;
}
</style>
