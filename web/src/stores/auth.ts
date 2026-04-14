import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, usersApi, type User } from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null)
  const hasFetchedUser = ref(false)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isSuperAdmin = computed(() => user.value?.is_super_admin === 1)
  const username = computed(() => user.value?.username || '')
  const displayName = computed(() => user.value?.name || user.value?.username || '')

  // Actions
  async function login(username: string, password: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await authApi.login({ username, password })
      user.value = response.user
      hasFetchedUser.value = true
      return true
    } catch (err: any) {
      error.value = err.message || '登录失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    try {
      await authApi.logout()
    } finally {
      user.value = null
      hasFetchedUser.value = true
    }
  }

  async function fetchUser(options: { force?: boolean } = {}) {
    if (!options.force && hasFetchedUser.value) {
      return !!user.value
    }

    try {
      const response = await authApi.me()
      user.value = response
      hasFetchedUser.value = true
      return true
    } catch (err) {
      user.value = null
      hasFetchedUser.value = true
      return false
    }
  }

  async function updateProfile(data: { name?: string; email?: string }) {
    if (!user.value) return false

    try {
      const response = await usersApi.update(user.value.id, data)
      user.value = { ...user.value, ...response }
      return true
    } catch (err: any) {
      error.value = err.message || '更新失败'
      return false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    user,
    hasFetchedUser,
    isLoading,
    error,
    // Getters
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    username,
    displayName,
    // Actions
    login,
    logout,
    fetchUser,
    updateProfile,
    clearError,
  }
})
