<template>
  <div class="setup-container">
    <div class="setup-shell">
      <!-- 语言切换器 -->
      <div class="lang-switcher" :class="{ active: langMenuOpen }">
        <button class="lang-switcher-trigger" @click="toggleLangMenu">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>{{ currentLangLabel }}</span>
          <svg class="lang-chevron" :class="{ rotated: langMenuOpen }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="lang-switcher-menu">
          <button
            class="lang-switcher-option"
            :class="{ active: currentLang === 'zh' }"
            @click="setLang('zh')"
          >
            中文
          </button>
          <button
            class="lang-switcher-option"
            :class="{ active: currentLang === 'en' }"
            @click="setLang('en')"
          >
            English
          </button>
        </div>
      </div>

      <!-- Logo -->
      <div class="setup-brand">
        <span class="setup-brand-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </span>
        <span class="setup-brand-text">Skill Base</span>
      </div>

      <!-- 卡片 -->
      <div class="setup-card">
        <!-- 装饰性代码角标 -->
        <div class="setup-card-badge">INIT-SYS</div>

        <div class="setup-header">
          <h1 class="setup-title">
            <span class="setup-title-prompt">></span>
            Setup
          </h1>
          <p class="setup-subtitle">
            {{ t('setup.subtitle') }}
          </p>
        </div>

        <!-- 错误/成功信息 -->
        <div v-if="error" class="setup-error" role="alert">
          {{ error }}
        </div>
        <div v-if="success" class="setup-success" role="status">
          {{ success }}
        </div>

        <form @submit.prevent="handleSubmit" class="setup-form">
          <!-- Username -->
          <div class="setup-field">
            <label for="username" class="setup-label">
              <span class="setup-keyword">let</span> <span class="setup-label-name">admin_username</span> <span class="setup-equals">=</span>
            </label>
            <div>
              <input
                type="text"
                id="username"
                v-model="username"
                placeholder='"admin"'
                autocomplete="username"
                required
                minlength="3"
                maxlength="50"
                :disabled="isLoading"
                class="setup-input"
              >
            </div>
            <p class="setup-hint">{{ t('setup.usernameHint') }}</p>
          </div>

          <!-- Password -->
          <div class="setup-field">
            <label for="password" class="setup-label">
              <span class="setup-keyword">let</span> <span class="setup-label-name">password</span> <span class="setup-equals">=</span>
            </label>
            <div>
              <input
                type="password"
                id="password"
                v-model="password"
                placeholder="••••••••"
                autocomplete="new-password"
                required
                minlength="6"
                :disabled="isLoading"
                class="setup-input"
              >
            </div>
            <p class="setup-hint">{{ t('setup.passwordHint') }}</p>
          </div>

          <!-- Confirm Password -->
          <div class="setup-field">
            <label for="confirmPassword" class="setup-label">
              <span class="setup-keyword">let</span> <span class="setup-label-name">confirm_password</span> <span class="setup-equals">=</span>
            </label>
            <div>
              <input
                type="password"
                id="confirmPassword"
                v-model="confirmPassword"
                placeholder="••••••••"
                autocomplete="new-password"
                required
                minlength="6"
                :disabled="isLoading"
                class="setup-input"
              >
            </div>
          </div>

          <!-- Submit Button -->
          <div class="setup-actions">
            <button
              type="submit"
              :disabled="isLoading"
              class="setup-submit"
            >
              <svg class="btn-devtools-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>{{ isLoading ? t('setup.loading') : t('setup.submit') }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- 底部提示 -->
      <div class="setup-status">
        <span class="setup-status-dot"></span>
        <span class="setup-status-text">System Initialization</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiPost, apiGet } from '@/services/api'
import { useI18n } from '@/composables/useI18n'

const router = useRouter()
const { t, setLang: setI18nLang, currentLang: i18nCurrentLang } = useI18n()

// 语言相关
const currentLang = computed(() => i18nCurrentLang.value)
const langMenuOpen = ref(false)

const currentLangLabel = computed(() => {
  return currentLang.value === 'zh' ? '中文' : 'English'
})

// 表单数据
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const isLoading = ref(false)
const error = ref('')
const success = ref('')

function toggleLangMenu() {
  langMenuOpen.value = !langMenuOpen.value
}

function setLang(lang: 'zh' | 'en') {
  setI18nLang(lang)
  langMenuOpen.value = false
}

// 检查系统初始化状态
async function checkInitStatus() {
  try {
    const data = await apiGet<{ initialized: boolean }>('/init/status')
    if (data.initialized) {
      // 已初始化，跳转到首页
      router.push('/')
    }
  } catch (err) {
    console.error('Failed to check init status:', err)
  }
}

// 处理表单提交
async function handleSubmit() {
  error.value = ''
  success.value = ''

  const user = username.value.trim()
  const pass = password.value
  const confirmPass = confirmPassword.value

  // 验证
  if (!user) {
    error.value = t('setup.errUsername')
    return
  }

  if (user.length < 3 || user.length > 50) {
    error.value = t('setup.errUsernameLength')
    return
  }

  if (!pass) {
    error.value = t('setup.errPassword')
    return
  }

  if (pass.length < 6) {
    error.value = t('setup.errPasswordLength')
    return
  }

  if (pass !== confirmPass) {
    error.value = t('setup.errPasswordMismatch')
    return
  }

  isLoading.value = true

  try {
    await apiPost('/init/setup', { username: user, password: pass })

    // 成功
    success.value = t('setup.success')

    // 2秒后跳转到登录页
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err: any) {
    error.value = err.message || t('setup.errFailed')
  } finally {
    isLoading.value = false
  }
}

// 点击外部关闭语言菜单
function handleClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.lang-switcher')) {
    langMenuOpen.value = false
  }
}

onMounted(() => {
  // 检查初始化状态
  checkInitStatus()

  // 添加点击外部监听
  document.addEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.setup-container {
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

.setup-shell {
  width: 100%;
  max-width: 28rem;
  position: relative;
}

/* 语言切换器 */
.lang-switcher {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 50;
}

.lang-switcher-trigger {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid #27272a;
  border-radius: 0.375rem;
  background: rgba(9, 9, 11, 0.5);
  backdrop-filter: blur(4px);
  color: #e4e4e7;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.lang-switcher-trigger:hover {
  border-color: #00e592;
  color: #00ffa3;
}

.lang-chevron {
  transition: transform 0.2s ease;
}

.lang-chevron.rotated {
  transform: rotate(180deg);
}

.lang-switcher-menu {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background-color: #13141a;
  border: 1px solid #27272a;
  border-radius: 0.5rem;
  padding: 0.25rem;
  min-width: 100px;
}

.lang-switcher.active .lang-switcher-menu {
  display: block;
}

.lang-switcher-option {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  color: #a1a1aa;
  background: transparent;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: color 0.2s ease, background-color 0.2s ease;
}

.lang-switcher-option:hover {
  color: #fff;
  background-color: #27272a;
}

.lang-switcher-option.active {
  color: #00ffa3;
  font-weight: 600;
}

.setup-brand {
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

.setup-brand-icon {
  color: #00ffa3;
  filter: drop-shadow(0 0 8px rgba(0, 255, 163, 0.4));
}

.setup-brand-text {
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
}

.setup-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  padding: 2rem;
  background: #13141a;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.setup-card-badge {
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

.setup-header {
  margin-bottom: 2rem;
}

.setup-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0 0 0.5rem;
  color: #fff;
  font-size: 1.5rem;
  line-height: 1;
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
}

.setup-title-prompt {
  color: #00ffa3;
  opacity: 0.7;
  font-weight: 400;
}

.setup-subtitle {
  margin: 0;
  color: #a1a1aa;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
}

.setup-error {
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

.setup-success {
  margin-bottom: 1.5rem;
  padding: 0.75rem;
  border: 1px solid rgba(0, 255, 163, 0.3);
  border-radius: 0.5rem;
  background: rgba(0, 255, 163, 0.1);
  color: #00ffa3;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
  overflow-wrap: anywhere;
}

.setup-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.setup-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.setup-label {
  display: block;
  color: #a1a1aa;
  font-size: 0.875rem;
  font-family: 'JetBrains Mono', monospace;
}

.setup-keyword,
.setup-equals {
  color: #00ffa3;
  opacity: 0.7;
}

.setup-label-name {
  color: #fff;
}

.setup-input {
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

.setup-input::placeholder {
  color: rgba(161, 161, 170, 0.5);
}

.setup-input:focus {
  outline: none;
  border-color: #00e592;
  box-shadow: 0 0 0 1px #00e592;
}

.setup-input:disabled,
.setup-submit:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.setup-hint {
  margin: 0.25rem 0 0;
  color: rgba(161, 161, 170, 0.5);
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
}

.setup-actions {
  padding-top: 0.5rem;
}

.setup-submit {
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
  cursor: pointer;
  transition: background-color 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-shadow: 0 0 15px rgba(0, 255, 163, 0.1);
}

.setup-submit:hover:not(:disabled) {
  background: rgba(0, 255, 163, 0.1);
  box-shadow: 0 0 20px rgba(0, 255, 163, 0.2);
}

.setup-status {
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

.setup-status-dot {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 9999px;
  background: #00ffa3;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.setup-status-text {
  opacity: 0.5;
}

.setup-container ::selection {
  background: rgba(0, 255, 163, 0.3);
  color: #fff;
}

.btn-devtools-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
  margin-right: 6px;
}

input.setup-input:-webkit-autofill,
input.setup-input:-webkit-autofill:hover,
input.setup-input:-webkit-autofill:focus,
input.setup-input:-webkit-autofill:active {
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
