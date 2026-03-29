<template>
  <div class="login-container">
    <div class="login-shell">
      <!-- Logo -->
      <div class="login-brand">
        <span class="login-brand-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
        </span>
        <span class="login-brand-text">Skill Base</span>
      </div>

      <!-- 登录卡片 -->
      <div class="login-card">
        <!-- 装饰性代码角标 -->
        <div class="login-card-badge">AUTH-REQ</div>

        <div class="login-header">
          <h1 class="login-title">
            <span class="login-title-prompt">></span>
            Sign In
          </h1>
          <p class="login-subtitle">
            // 内网 Skill 管理平台 · 需要凭证
          </p>
        </div>

        <!-- 错误信息容器 -->
        <div v-if="authStore.error" class="login-error" role="alert">
          {{ authStore.error }}
        </div>

        <form @submit.prevent="handleLogin" class="login-form">
          <!-- Username -->
          <div class="login-field">
            <label for="username" class="login-label">
              <span class="login-keyword">const</span> <span class="login-label-name">username</span> <span class="login-equals">=</span>
            </label>
            <div>
              <input
                type="text"
                id="username"
                v-model="username"
                placeholder="&quot;operator&quot;"
                autocomplete="username"
                required
                :disabled="authStore.isLoading"
                class="login-input"
              >
            </div>
          </div>

          <!-- Password -->
          <div class="login-field">
            <label for="password" class="login-label">
              <span class="login-keyword">const</span> <span class="login-label-name">password</span> <span class="login-equals">=</span>
            </label>
            <div>
              <input
                type="password"
                id="password"
                v-model="password"
                placeholder="••••••••"
                autocomplete="current-password"
                required
                :disabled="authStore.isLoading"
                class="login-input"
              >
            </div>
          </div>

          <!-- Submit Button -->
          <div class="login-actions">
            <button
              type="submit"
              :disabled="authStore.isLoading"
              class="login-submit"
            >
              <svg v-if="!authStore.isLoading" class="btn-devtools-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span v-if="authStore.isLoading" class="spinner"></span>
              <span>{{ authStore.isLoading ? '登录中...' : '执行登录' }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 底部提示 -->
      <div class="login-status">
        <span class="login-status-dot"></span>
        <span class="login-status-text">Secure Connection Established</span>
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
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: #09090b;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 64px 64px;
  color: #e4e4e7;
  font-family: 'Inter', system-ui, sans-serif;
}

.login-shell {
  width: 100%;
  max-width: 28rem;
}

.login-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  font-size: 1.5rem;
  line-height: 1;
  letter-spacing: -0.025em;
  user-select: none;
}

.login-brand-icon {
  color: #00ffa3;
  filter: drop-shadow(0 0 8px rgba(0, 255, 163, 0.4));
}

.login-brand-text {
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}

.login-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  padding: 2rem;
  background: #13141a;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.login-card-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.25rem 0.5rem;
  border-bottom-left-radius: 0.5rem;
  background: #27272a;
  color: #a1a1aa;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  opacity: 0.5;
  user-select: none;
}

.login-header {
  margin-bottom: 2rem;
}

.login-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem;
  color: #fff;
  font-size: 2.25rem;
  line-height: 1;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.login-title-prompt {
  color: #00ffa3;
  opacity: 0.7;
  font-weight: 400;
}

.login-subtitle {
  margin: 0;
  color: #a1a1aa;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
}

.login-error {
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
  overflow-wrap: anywhere;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.login-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.login-label {
  display: block;
  color: #a1a1aa;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
}

.login-keyword,
.login-equals {
  color: #00ffa3;
  opacity: 0.7;
}

.login-label-name {
  color: #fff;
}

.login-input {
  display: block;
  width: 100%;
  height: 3rem;
  padding: 0 1rem;
  box-sizing: border-box;
  margin: 0;
  border: 1px solid #27272a;
  border-radius: 0.5rem;
  background: #09090b;
  color: #fff;
  font-size: 0.875rem;
  line-height: calc(3rem - 2px);
  font-family: 'JetBrains Mono', monospace;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-input::placeholder {
  color: rgba(161, 161, 170, 0.5);
}

.login-input:focus {
  outline: none;
  border-color: #00e592;
  box-shadow: 0 0 0 1px #00e592;
}

.login-input:disabled,
.login-submit:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.login-actions {
  padding-top: 0.5rem;
}

.login-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  width: 100%;
  min-height: 3rem;
  padding: 0 1.25rem;
  border: 1px solid #00e592;
  border-radius: 0.5rem;
  background: transparent;
  color: #00ffa3;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow: 0 0 15px rgba(0, 255, 163, 0.1);
}

.login-submit:hover:not(:disabled) {
  background: rgba(0, 255, 163, 0.1);
  box-shadow: 0 0 20px rgba(0, 255, 163, 0.2);
}

.login-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 2rem;
  color: #a1a1aa;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  text-align: center;
}

.login-status-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: #00ffa3;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.login-status-text {
  opacity: 0.5;
}

.login-container ::selection {
  background: rgba(0, 255, 163, 0.3);
  color: #fff;
}

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

.btn-devtools-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
  margin-right: 6px;
}

input.login-input:-webkit-autofill,
input.login-input:-webkit-autofill:hover,
input.login-input:-webkit-autofill:focus,
input.login-input:-webkit-autofill:active {
  -webkit-box-shadow: 0 0 0 30px #09090b inset !important;
  -webkit-text-fill-color: white !important;
  transition: background-color 5000s ease-in-out 0s;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}
</style>
