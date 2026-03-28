<template>
  <div>
    <SkillBaseNav :current-path="'/settings'"></SkillBaseNav>

    <div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div class="container mx-auto max-w-2xl">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">
          <span class="text-neon-400">></span> 账户设置
        </h1>
        <p class="text-base-400">管理你的账户信息和 CLI 授权</p>
      </div>

      <!-- Profile Section -->
      <div class="card p-6 mb-6">
        <h2 class="text-lg font-semibold text-white mb-6 pb-4 border-b border-base-800">
          基本信息
        </h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">用户名</label>
            <input
              type="text"
              :value="authStore.username"
              disabled
              class="w-full px-4 py-3 rounded-lg opacity-50 cursor-not-allowed"
            />
            <p class="text-xs text-base-500 mt-1">用户名不可修改</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">显示名称</label>
            <input
              v-model="profileForm.name"
              type="text"
              placeholder="输入显示名称"
              class="w-full px-4 py-3 rounded-lg"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">邮箱</label>
            <input
              v-model="profileForm.email"
              type="email"
              placeholder="输入邮箱地址"
              class="w-full px-4 py-3 rounded-lg"
            />
          </div>

          <div class="flex gap-4 pt-4">
            <button
              @click="saveProfile"
              :disabled="isSaving"
              class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <span v-if="isSaving" class="spinner spinner-sm"></span>
              <template v-else>保存</template>
            </button>
            <button
              @click="resetProfile"
              class="btn-secondary px-6 py-2 rounded-lg"
            >
              重置
            </button>
          </div>
        </div>
      </div>

      <!-- CLI Code Section -->
      <div class="card p-6 mb-6">
        <h2 class="text-lg font-semibold text-white mb-6 pb-4 border-b border-base-800">
          CLI 授权
        </h2>

        <p class="text-base-400 text-sm mb-4">
          使用以下授权码在 CLI 中登录：
        </p>

        <div class="flex gap-4">
          <div class="flex-1 bg-base-950 rounded-lg px-4 py-3 font-mono text-neon-400">
            {{ cliCode || '点击生成授权码' }}
          </div>
          <button
            v-if="!cliCode"
            @click="generateCliCode"
            :disabled="isGeneratingCode"
            class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <span v-if="isGeneratingCode" class="spinner spinner-sm"></span>
            <template v-else>生成</template>
          </button>
          <button
            v-else
            @click="copyCliCode"
            class="btn-secondary px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
            </svg>
            复制
          </button>
        </div>

        <p class="text-xs text-base-500 mt-4">
          授权码有效期为 5 分钟，请及时使用。
        </p>
      </div>

      <!-- Password Section -->
      <div class="card p-6">
        <h2 class="text-lg font-semibold text-white mb-6 pb-4 border-b border-base-800">
          修改密码
        </h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">当前密码</label>
            <input
              v-model="passwordForm.current"
              type="password"
              placeholder="输入当前密码"
              class="w-full px-4 py-3 rounded-lg"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">新密码</label>
            <input
              v-model="passwordForm.new"
              type="password"
              placeholder="输入新密码"
              class="w-full px-4 py-3 rounded-lg"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-base-200 mb-2">确认新密码</label>
            <input
              v-model="passwordForm.confirm"
              type="password"
              placeholder="再次输入新密码"
              class="w-full px-4 py-3 rounded-lg"
            />
          </div>

          <div class="flex gap-4 pt-4">
            <button
              @click="changePassword"
              :disabled="isChangingPassword || !canChangePassword"
              class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
            >
              <span v-if="isChangingPassword" class="spinner spinner-sm"></span>
              <template v-else>修改密码</template>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'
import SkillBaseNav from '@/components/SkillBaseNav.vue'

const router = useRouter()
const authStore = useAuthStore()

// Profile
const profileForm = ref({
  name: '',
  email: '',
})
const isSaving = ref(false)

// CLI Code
const cliCode = ref('')
const isGeneratingCode = ref(false)

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

onMounted(async () => {
  const isAuth = await authStore.fetchUser()
  if (!isAuth) {
    router.push('/login')
    return
  }

  resetProfile()
})

function resetProfile() {
  profileForm.value = {
    name: authStore.user?.name || '',
    email: authStore.user?.email || '',
  }
}

async function saveProfile() {
  isSaving.value = true
  try {
    await authStore.updateProfile({
      name: profileForm.value.name,
      email: profileForm.value.email,
    })
    alert('保存成功')
  } catch (err) {
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}

async function generateCliCode() {
  isGeneratingCode.value = true
  try {
    const response = await apiPost<{ code: string }>('/auth/cli-code')
    cliCode.value = response.code
  } catch (err) {
    alert('生成失败')
  } finally {
    isGeneratingCode.value = false
  }
}

function copyCliCode() {
  navigator.clipboard.writeText(cliCode.value)
  alert('已复制到剪贴板')
}

async function changePassword() {
  if (passwordForm.value.new !== passwordForm.value.confirm) {
    alert('两次输入的密码不一致')
    return
  }

  isChangingPassword.value = true
  try {
    await apiPost('/auth/change-password', {
      current_password: passwordForm.value.current,
      new_password: passwordForm.value.new,
    })
    alert('密码修改成功')
    passwordForm.value = { current: '', new: '', confirm: '' }
  } catch (err: any) {
    alert(err.message || '修改失败')
  } finally {
    isChangingPassword.value = false
  }
}
</script>
