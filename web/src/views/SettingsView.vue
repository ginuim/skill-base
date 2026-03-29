<template>
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
    <div class="max-w-2xl mx-auto">
      <!-- 面包屑 -->
      <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
        <span class="text-neon-400">~</span>
        <span class="opacity-50">/</span>
        <router-link to="/" class="hover:text-white transition-colors">home</router-link>
        <span class="opacity-50">/</span>
        <span class="text-white">settings</span>
      </div>

      <div class="skill-card p-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">CFG-USER</div>

        <div class="mb-8 border-b border-base-800 pb-6">
          <h1 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <span class="text-neon-400 font-mono font-normal opacity-70">></span>
            <span>账户设置</span>
          </h1>
          <p class="text-base-400 text-sm font-mono">// 管理您的个人信息和凭证</p>
        </div>

        <!-- 基本信息 -->
        <div class="mb-10">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono">
            <span class="text-neon-400">#</span> 基本信息
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
              <p class="font-mono text-xs text-base-500 mt-1">// 用户名不可修改</p>
            </div>
            <div>
              <label class="font-mono text-base-400 mb-2 block text-sm">
                <span class="text-neon-400 opacity-70">let</span> <span class="text-white">name</span> <span class="text-neon-400 opacity-70">=</span>
              </label>
              <input
                type="text"
                v-model="profileForm.name"
                placeholder="请输入您的姓名"
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
              />
              <p class="font-mono text-xs text-base-500 mt-1">// 可选，用于显示在技能作者信息中</p>
            </div>
            <div class="pt-2">
              <button
                type="submit"
                :disabled="isSaving"
                class="btn-primary px-6 py-2.5 rounded-lg font-mono flex items-center gap-2 disabled:opacity-50"
              >
                <span v-if="isSaving" class="spinner spinner-sm"></span>
                <template v-else>保存修改</template>
              </button>
            </div>
          </form>
        </div>

        <!-- CLI 验证码 -->
        <div class="mb-10">
          <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono">
            <span class="text-neon-400">#</span> CLI 访问凭证
          </h2>
          <div class="mt-6">
            <p class="text-base-400 text-sm font-mono mb-4">
              // 在本地终端使用 <code class="text-neon-400">skb</code> 命令行工具时，需要获取验证码进行登录。
            </p>
            <router-link to="/cli-code" class="inline-flex items-center gap-2 rounded-lg px-4 py-3 font-mono text-sm border border-neon-400/20 text-neon-400 bg-neon-400/5 hover:bg-neon-400/10 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-4 h-4">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>获取 CLI 验证码</span>
            </router-link>
          </div>
        </div>

        <!-- 修改密码 -->
        <div>
          <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono">
            <span class="text-neon-400">#</span> 修改密码
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
              <p class="font-mono text-xs text-base-500 mt-1">// 至少 6 个字符</p>
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
                <template v-else>修改密码</template>
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
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()

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
    alert('保存成功')
  } catch (err) {
    alert('保存失败')
  } finally {
    isSaving.value = false
  }
}

async function changePassword() {
  // 校验逻辑
  if (!passwordForm.value.current) {
    alert('请输入当前密码')
    return
  }

  if (passwordForm.value.new.length < 6) {
    alert('新密码至少 6 个字符')
    return
  }

  if (passwordForm.value.new !== passwordForm.value.confirm) {
    alert('两次输入的密码不一致')
    return
  }

  isChangingPassword.value = true
  try {
    await apiPost('/auth/me/change-password', {
      old_password: passwordForm.value.current,
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
