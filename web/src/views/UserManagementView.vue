<template>
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
    <!-- 面包屑 -->
    <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
      <span class="text-neon-400">~</span>
      <span class="opacity-50">/</span>
      <router-link to="/" class="hover:text-white transition-colors">{{ t('nav.home') }}</router-link>
      <span class="opacity-50">/</span>
      <span class="text-white">admin</span>
      <span class="opacity-50">/</span>
      <span class="text-white">users</span>
    </div>

    <!-- 页面标题 -->
    <div class="skill-card p-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">ADMIN-USERS</div>

      <div class="mb-8 border-b border-base-800 pb-6">
        <h1 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <span class="text-neon-400 font-mono font-normal opacity-70">></span>
          <span>{{ t('admin.heading') }}</span>
        </h1>
        <p class="text-base-400 text-sm font-mono">{{ t('admin.subtitle') }}</p>
      </div>

      <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono mb-0">
          <span class="text-neon-400">#</span> {{ t('admin.userList') }}
        </h2>
        <button class="btn-primary px-4 py-2.5 rounded-lg font-mono flex items-center gap-2" @click="showAddUserModal">
          <Plus :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t('admin.addUser') }}</span>
        </button>
      </div>

      <!-- 搜索和筛选栏 -->
      <div class="flex gap-4 mb-6 flex-wrap items-center">
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <input
              type="text"
              v-model="searchQuery"
              :placeholder="t('admin.searchPlaceholder')"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pl-10"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-400">
              <Search :size="16" :stroke-width="2" aria-hidden="true" />
            </span>
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-white transition-colors"
              @click="searchQuery = ''"
            >
              <X :size="16" :stroke-width="2" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="relative min-w-[140px]">
          <select
            v-model="statusFilter"
            class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 pr-10 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="">{{ t('admin.allStatus') }}</option>
            <option value="active">{{ t('admin.active') }}</option>
            <option value="disabled">{{ t('admin.disabled') }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" :stroke-width="2" aria-hidden="true" />
        </div>
      </div>

      <!-- 用户列表 -->
      <div class="border border-base-800 rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-base-950">
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('admin.thUsername') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('admin.thName') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('admin.thRole') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('admin.thStatus') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('admin.thCreatedAt') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('admin.thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="isLoading" v-for="i in 5" :key="i" class="border-t border-base-800">
              <td v-for="j in 6" :key="j" class="px-4 py-4">
                <div class="h-4 bg-base-800 rounded animate-pulse"></div>
              </td>
            </tr>
            <tr v-else-if="paginatedUsers.length === 0" class="border-t border-base-800">
              <td colspan="6" class="px-4 py-12 text-center">
                <div class="text-4xl mb-4 opacity-30">📦</div>
                <p class="text-base-400 font-mono">{{ t('admin.emptyState') }}</p>
              </td>
            </tr>
            <tr
              v-else
              v-for="user in paginatedUsers"
              :key="user.id"
              class="border-t border-base-800 hover:bg-white/5 transition-colors"
            >
              <td class="px-4 py-4 font-mono text-white">{{ user.username }}</td>
              <td class="px-4 py-4 font-mono text-white">{{ user.name || '-' }}</td>
              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full font-mono"
                  :class="user.role === 'admin' ? 'bg-neon-400/10 text-neon-400 border border-neon-400/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'"
                >
                  <Shield v-if="user.role === 'admin'" :size="12" :stroke-width="2" aria-hidden="true" />
                  <UserCircle v-else :size="12" :stroke-width="2" aria-hidden="true" />
                  {{ user.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser') }}
                </span>
              </td>
              <td class="px-4 py-4 font-mono">
                <span :class="user.status === 'disabled' ? 'text-red-400' : 'text-neon-400'">
                  {{ user.status === 'disabled' ? t('admin.disabled') : t('admin.active') }}
                </span>
              </td>
              <td class="px-4 py-4 font-mono text-base-400 text-sm">{{ formatDate(user.created_at) }}</td>
              <td class="px-4 py-4">
                <button
                  class="p-2 text-base-400 hover:text-neon-400 hover:bg-neon-400/10 rounded-lg transition-colors"
                  @click="showEditUserModal(user)"
                  :title="t('admin.editUser')"
                >
                  <Pencil :size="16" :stroke-width="2" aria-hidden="true" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- 分页 -->
        <div v-if="totalPages > 1" class="flex items-center justify-center gap-4 px-4 py-4 border-t border-base-800">
          <button
            class="px-4 py-2 rounded-lg font-mono text-sm border border-base-800 text-base-400 hover:border-neon-400 hover:text-neon-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            {{ t('admin.prevPage') }}
          </button>
          <span class="text-base-400 font-mono text-sm">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="px-4 py-2 rounded-lg font-mono text-sm border border-base-800 text-base-400 hover:border-neon-400 hover:text-neon-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            {{ t('admin.nextPage') }}
          </button>
        </div>
      </div>
    </div>

    <!-- 添加用户弹窗 -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click.self="closeAddModal">
      <div class="bg-base-900 border border-base-800 rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800">
          <h3 class="text-lg font-semibold text-white font-mono flex items-center gap-2">
            <span class="text-neon-400 opacity-70">></span>
            {{ t('admin.addModal') }}
          </h3>
          <button class="text-base-400 hover:text-white transition-colors" @click="closeAddModal">
            <X :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <form @submit.prevent="handleAddUser" class="p-6 space-y-5">
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-white">username</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <input
              type="text"
              v-model="addForm.username"
              required
              autocomplete="off"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
            />
          </div>
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-white">password</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <div class="relative">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="addForm.password"
                required
                autocomplete="new-password"
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pr-20"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="showPassword = !showPassword">
                  <Eye v-if="showPassword" :size="16" :stroke-width="2" aria-hidden="true" />
                  <EyeOff v-else :size="16" :stroke-width="2" aria-hidden="true" />
                </button>
                <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="generatePassword" title="Generate password">
                  <Dice3 :size="16" :stroke-width="2" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-white">name</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <input
              type="text"
              v-model="addForm.name"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
            />
          </div>
          <div>
            <label class="font-mono text-base-400 mb-3 block text-sm">{{ t('admin.roleLabel') }}</label>
            <div class="flex gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="addForm.role"
                  value="developer"
                  class="w-4 h-4 accent-neon-400"
                />
                <span class="text-white font-mono text-sm">{{ t('admin.roleUser') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="addForm.role"
                  value="admin"
                  class="w-4 h-4 accent-neon-400"
                />
                <span class="text-white font-mono text-sm">{{ t('admin.roleAdmin') }}</span>
              </label>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-base-800">
            <button type="button" class="px-4 py-2 rounded-lg font-mono text-sm border border-base-800 text-base-400 hover:border-white hover:text-white transition-colors" @click="closeAddModal">
              {{ t('admin.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="isAdding"
              class="btn-primary px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isAdding" class="spinner spinner-sm"></span>
              <template v-else>{{ t('admin.confirmAdd') }}</template>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 编辑用户弹窗 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click.self="closeEditModal">
      <div class="bg-base-900 border border-base-800 rounded-xl shadow-2xl w-full max-w-md mx-4 transform transition-all">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800">
          <h3 class="text-lg font-semibold text-white font-mono flex items-center gap-2">
            <span class="text-neon-400 opacity-70">></span>
            {{ t('admin.editModal') }}
          </h3>
          <button class="text-base-400 hover:text-white transition-colors" @click="closeEditModal">
            <X :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <form @submit.prevent="handleEditUser" class="p-6 space-y-5">
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-white">username</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <input
              type="text"
              :value="editForm.username"
              disabled
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-base-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-white">name</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <input
              type="text"
              v-model="editForm.name"
              autocomplete="off"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
            />
          </div>
          <div>
            <label class="font-mono text-base-400 mb-3 block text-sm">{{ t('admin.roleLabel') }}</label>
            <div class="flex gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="editForm.role"
                  value="developer"
                  class="w-4 h-4 accent-neon-400"
                />
                <span class="text-white font-mono text-sm">{{ t('admin.roleUser') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="editForm.role"
                  value="admin"
                  class="w-4 h-4 accent-neon-400"
                />
                <span class="text-white font-mono text-sm">{{ t('admin.roleAdmin') }}</span>
              </label>
            </div>
          </div>
          <div class="border-t border-base-800 pt-5">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-mono text-base-400 block text-sm">{{ t('admin.statusLabel') }}</label>
                <p class="text-xs text-base-500 font-mono mt-1">{{ editForm.disabled ? t('admin.statusDisabled') : t('admin.statusActive') }}</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" :checked="!editForm.disabled" @change="editForm.disabled = !editForm.disabled" class="sr-only peer">
                <div class="w-12 h-6 bg-base-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-base-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-400 peer-checked:after:bg-base-950"></div>
              </label>
            </div>
          </div>
          <div class="border-t border-base-800 pt-5">
            <div class="flex items-center justify-between">
              <div>
                <label class="font-mono text-base-400 block text-sm">{{ t('admin.resetPassword') }}</label>
                <p class="text-xs text-base-500 font-mono mt-1">{{ t('admin.resetPasswordHint') }}</p>
              </div>
              <button
                type="button"
                class="px-3 py-1.5 rounded-lg font-mono text-xs border border-base-800 text-base-400 hover:border-neon-400 hover:text-neon-400 transition-colors"
                @click="showResetPassword = !showResetPassword"
              >
                {{ showResetPassword ? t('admin.cancelReset') : t('admin.doReset') }}
              </button>
            </div>
            <div v-if="showResetPassword" class="mt-4">
              <div class="relative">
                <input
                  :type="showEditPassword ? 'text' : 'password'"
                  v-model="editForm.newPassword"
                  :placeholder="t('admin.newPasswordPlaceholder')"
                  autocomplete="new-password"
                  class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pr-16"
                />
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="showEditPassword = !showEditPassword">
                    <Eye v-if="showEditPassword" :size="16" :stroke-width="2" aria-hidden="true" />
                    <EyeOff v-else :size="16" :stroke-width="2" aria-hidden="true" />
                  </button>
                  <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="generateEditPassword" title="Generate password">
                    <Dice3 :size="16" :stroke-width="2" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-base-800">
            <button type="button" class="px-4 py-2 rounded-lg font-mono text-sm border border-base-800 text-base-400 hover:border-white hover:text-white transition-colors" @click="closeEditModal">
              {{ t('admin.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="isEditing"
              class="btn-primary px-4 py-2 rounded-lg font-mono text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isEditing" class="spinner spinner-sm"></span>
              <template v-else>{{ t('admin.confirmSave') }}</template>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import {
  Plus,
  Search,
  X,
  ChevronDown,
  Shield,
  UserCircle,
  Pencil,
  Eye,
  EyeOff,
  Dice3,
} from 'lucide-vue-next'
import { ref, computed, onMounted } from 'vue'
import { usersApi, type User } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'

const { t, currentLang } = useI18n()

// 权限检查
onMounted(() => {
  fetchUsers()
})

// 用户列表
const users = ref<User[]>([])
const isLoading = ref(false)

async function fetchUsers() {
  isLoading.value = true
  try {
    const response = await usersApi.list()
    users.value = response.users
  } catch (err: any) {
    globalToast.error(t('admin.fetchError') + ': ' + err.message)
  } finally {
    isLoading.value = false
  }
}

// 搜索和筛选
const searchQuery = ref('')
const statusFilter = ref('')

const filteredUsers = computed(() => {
  let result = users.value

  // 搜索
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(u =>
      u.username.toLowerCase().includes(query) ||
      (u.name && u.name.toLowerCase().includes(query))
    )
  }

  // 状态筛选
  if (statusFilter.value) {
    if (statusFilter.value === 'active') {
      result = result.filter(u => u.status !== 'disabled')
    } else if (statusFilter.value === 'disabled') {
      result = result.filter(u => u.status === 'disabled')
    }
  }

  return result
})

// 分页
const currentPage = ref(1)
const pageSize = 10

const totalPages = computed(() => Math.ceil(filteredUsers.value.length / pageSize))

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredUsers.value.slice(start, end)
})

// 添加用户
const showAddModal = ref(false)
const showPassword = ref(false)
const isAdding = ref(false)
const addForm = ref({
  username: '',
  password: '',
  name: '',
  role: 'developer' as 'admin' | 'developer'
})

function showAddUserModal() {
  addForm.value = { username: '', password: '', name: '', role: 'developer' }
  showPassword.value = false
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  addForm.value.password = password
  showPassword.value = true
}

async function handleAddUser() {
  isAdding.value = true
  try {
    await usersApi.create(addForm.value)
    await fetchUsers()
    closeAddModal()
    globalToast.success(t('admin.addSuccess'))
  } catch (err: any) {
    globalToast.error(t('admin.addError') + ': ' + err.message)
  } finally {
    isAdding.value = false
  }
}

// 编辑用户
const showEditModal = ref(false)
const showEditPassword = ref(false)
const showResetPassword = ref(false)
const isEditing = ref(false)
const editForm = ref({
  id: 0,
  username: '',
  name: '',
  role: 'developer' as 'admin' | 'developer',
  disabled: false,
  newPassword: ''
})

function showEditUserModal(user: User) {
  editForm.value = {
    id: user.id,
    username: user.username,
    name: user.name || '',
    role: user.role,
    disabled: user.status === 'disabled',
    newPassword: ''
  }
  showEditPassword.value = false
  showResetPassword.value = false
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

function generateEditPassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  editForm.value.newPassword = password
  showEditPassword.value = true
}

async function handleEditUser() {
  isEditing.value = true
  try {
    // 更新用户基本信息
    await usersApi.update(editForm.value.id, {
      name: editForm.value.name,
      role: editForm.value.role,
      status: editForm.value.disabled ? 'disabled' : 'active'
    })

    // 如果有新密码，更新密码
    if (editForm.value.newPassword) {
      await usersApi.resetPassword(editForm.value.id, editForm.value.newPassword)
    }

    await fetchUsers()
    closeEditModal()
    globalToast.success(t('admin.editSuccess'))
  } catch (err: any) {
    globalToast.error(t('admin.editError') + ': ' + err.message)
  } finally {
    isEditing.value = false
  }
}

// 日期格式化
function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString(currentLang.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
</script>
