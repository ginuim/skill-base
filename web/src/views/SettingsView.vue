<template>
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
    <div class="max-w-2xl mx-auto">
      <!-- 面包屑 -->
      <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
        <span class="text-neon-400">~</span>
        <span class="opacity-50">/</span>
        <router-link to="/" class="hover:text-white transition-colors">{{ t('nav.home') }}</router-link>
        <span class="opacity-50">/</span>
        <span class="text-white">{{ t('nav.settings') }}</span>
      </div>

      <div class="skill-card p-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">CFG-USER</div>

        <div class="mb-8 border-b border-base-800 pb-6">
          <h1 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <span class="text-neon-400 font-mono font-normal opacity-70">></span>
            <span>{{ t('settings.heading') }}</span>
          </h1>
          <p class="text-base-400 text-sm font-mono">{{ t('settings.subtitle') }}</p>
        </div>

        <!-- 基本信息 -->
        <div class="mb-10">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono">
            <span class="text-neon-400">#</span> {{ t('settings.basicInfo') }}
          </h2>
          <form @submit.prevent="saveProfile" class="space-y-5 mt-6">
            <div>
              <label class="font-mono text-base-400 mb-2 block text-sm">
                <span class="text-neon-400 opacity-70">let</span> <span class="text-white">username</span> <span class="text-neon-400 opacity-70">=</span>
              </label>
              <input
                type="text"
                v-model="profileForm.username"
                disabled
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white opacity-50 cursor-not-allowed"
              />
              <p class="font-mono text-xs text-base-500 mt-1">{{ t('settings.usernameHint') }}</p>
            </div>
            <div>
              <label class="font-mono text-base-400 mb-2 block text-sm">
                <span class="text-neon-400 opacity-70">let</span> <span class="text-white">name</span> <span class="text-neon-400 opacity-70">=</span>
              </label>
              <input
                type="text"
                v-model="profileForm.name"
                :placeholder="t('settings.namePlaceholder')"
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
              />
              <p class="font-mono text-xs text-base-500 mt-1">{{ t('settings.nameHint') }}</p>
            </div>
            <div class="pt-2">
              <button
                type="submit"
                :disabled="isSaving"
                class="btn-primary px-6 py-2.5 rounded-lg font-mono flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isSaving" class="spinner spinner-sm"></span>
                <template v-else>{{ t('settings.saveBtn') }}</template>
              </button>
            </div>
          </form>
        </div>

        <!-- CLI 验证码 -->
        <div class="mb-10">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono">
            <span class="text-neon-400">#</span> {{ t('settings.cliSection') }}
          </h2>
          <div class="mt-6">
            <p class="text-base-400 text-sm font-mono mb-4" v-html="t('settings.cliDesc')"></p>
            <router-link to="/cli-code" class="inline-flex items-center gap-2 rounded-lg px-4 py-3 font-mono text-sm border border-neon-400/20 text-neon-400 bg-neon-400/5 hover:bg-neon-400/10 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>{{ t('settings.cliLink') }}</span>
            </router-link>
          </div>
        </div>

        <!-- 修改密码 -->
        <div>
          <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono">
            <span class="text-neon-400">#</span> {{ t('settings.passwordSection') }}
          </h2>
          <form @submit.prevent="changePassword" class="space-y-5 mt-6">
            <div>
              <label class="font-mono text-base-400 mb-2 block text-sm">
                <span class="text-neon-400 opacity-70">let</span> <span class="text-white">current_password</span> <span class="text-neon-400 opacity-70">=</span>
              </label>
              <input
                type="password"
                v-model="passwordForm.current"
                required
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
              />
            </div>
            <div>
              <label class="font-mono text-base-400 mb-2 block text-sm">
                <span class="text-neon-400 opacity-70">let</span> <span class="text-white">new_password</span> <span class="text-neon-400 opacity-70">=</span>
              </label>
              <input
                type="password"
                v-model="passwordForm.new"
                required
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
              />
              <p class="font-mono text-xs text-base-500 mt-1">{{ t('settings.newPasswordHint') }}</p>
            </div>
            <div>
              <label class="font-mono text-base-400 mb-2 block text-sm">
                <span class="text-neon-400 opacity-70">let</span> <span class="text-white">confirm_password</span> <span class="text-neon-400 opacity-70">=</span>
              </label>
              <input
                type="password"
                v-model="passwordForm.confirm"
                required
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
              />
            </div>
            <div class="pt-2">
              <button
                type="submit"
                :disabled="isChangingPassword || !canChangePassword"
                class="btn-primary px-6 py-2.5 rounded-lg font-mono flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span v-if="isChangingPassword" class="spinner spinner-sm"></span>
                <template v-else>{{ t('settings.changePasswordBtn') }}</template>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'

const authStore = useAuthStore()
const { t } = useI18n()

// Profile
const profileForm = ref({
  username: '',
  name: '',
})
const isSaving = ref(false)

// Password
const passwordForm = ref({
  current: '',
  new: '',
  confirm: '',
})
const isChangingPassword = ref(false)

const canChangePassword = computed(() => {
  return passwordForm.value.current &&
    passwordForm.value.new &&
    passwordForm.value.confirm &&
    passwordForm.value.new === passwordForm.value.confirm
})

onMounted(() => {
  resetProfile()
})

function resetProfile() {
  profileForm.value = {
    username: authStore.username || '',
    name: authStore.user?.name || '',
  }
}

async function saveProfile() {
  isSaving.value = true
  try {
    await authStore.updateProfile({
      name: profileForm.value.name,
    })
    globalToast.success(t('settings.saveSuccess'))
  } catch (err) {
    globalToast.error(t('settings.saveFailed'))
  } finally {
    isSaving.value = false
  }
}

async function changePassword() {
  // 校验逻辑
  if (!passwordForm.value.current) {
    globalToast.warning(t('settings.noOldPassword'))
    return
  }

  if (passwordForm.value.new.length < 6) {
    globalToast.warning(t('settings.newPassTooShort'))
    return
  }

  if (passwordForm.value.new !== passwordForm.value.confirm) {
    globalToast.warning(t('settings.passMismatch'))
    return
  }

  isChangingPassword.value = true
  try {
    const response = await apiPost<{ ok: boolean; error?: string; detail?: string }>('/auth/me/change-password', {
      old_password: passwordForm.value.current,
      new_password: passwordForm.value.new,
    })
    if (response.ok) {
      globalToast.success(t('settings.changeSuccess'))
      passwordForm.value = { current: '', new: '', confirm: '' }
    } else {
      globalToast.error(response.detail || t('settings.changeFailed'))
    }
  } catch (err: any) {
    // 处理旧密码错误的情况
    if (err.data?.error === 'wrong_password') {
      globalToast.error(t('settings.wrongPassword'))
    } else {
      globalToast.error(err.message || t('settings.changeFailed'))
    }
  } finally {
    isChangingPassword.value = false
  }
}
</script>
