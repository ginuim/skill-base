<template>
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
    <!-- 面包屑 -->
    <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
      <span class="text-neon-400">~</span>
      <span class="opacity-50">/</span>
      <router-link to="/" class="hover:text-fg-strong transition-colors">{{ t('nav.home') }}</router-link>
      <span class="opacity-50">/</span>
      <span class="text-fg-strong">admin</span>
      <span class="opacity-50">/</span>
      <span class="text-fg-strong">users</span>
    </div>

    <!-- 页面标题 -->
    <div class="skill-card p-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">ADMIN-USERS</div>

      <div class="mb-8 border-b border-base-800 pb-6">
        <h1 class="text-2xl font-bold text-fg-strong mb-2 flex items-center gap-3">
          <span class="text-neon-400 font-mono font-normal opacity-70">></span>
          <span>{{ t('admin.heading') }}</span>
        </h1>
        <p class="text-base-400 text-sm font-mono">{{ t('admin.subtitle') }}</p>
      </div>

      <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-fg-strong pb-3 border-b border-base-800 font-mono mb-0">
          <span class="text-neon-400">#</span> {{ t('admin.userList') }}
        </h2>
        <button class="btn-primary px-4 py-2.5 rounded-lg font-mono flex items-center gap-2" @click="showAddUserModal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
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
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 font-mono text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pl-10"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-fg-strong transition-colors"
              @click="searchQuery = ''"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
        <select
          v-model="statusFilter"
          class="bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 font-mono text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors min-w-[140px] appearance-none cursor-pointer"
          style="background-image: url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%23a1a1aa%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1rem; padding-right: 2.5rem;"
        >
          <option value="">{{ t('admin.allStatus') }}</option>
          <option value="active">{{ t('admin.active') }}</option>
          <option value="disabled">{{ t('admin.disabled') }}</option>
        </select>
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
              <td class="px-4 py-4 font-mono text-fg-strong">{{ user.username }}</td>
              <td class="px-4 py-4 font-mono text-fg-strong">{{ user.name || '-' }}</td>
              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full font-mono"
                  :class="user.role === 'admin' ? 'bg-neon-400/10 text-neon-400 border border-neon-400/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'"
                >
                  <svg v-if="user.role === 'admin'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
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
          <h3 class="text-lg font-semibold text-fg-strong font-mono flex items-center gap-2">
            <span class="text-neon-400 opacity-70">></span>
            {{ t('admin.addModal') }}
          </h3>
          <button class="text-base-400 hover:text-fg-strong transition-colors" @click="closeAddModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form @submit.prevent="handleAddUser" class="p-6 space-y-5">
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-fg-strong">username</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <input
              type="text"
              v-model="addForm.username"
              required
              autocomplete="off"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
            />
          </div>
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-fg-strong">password</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <div class="relative">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="addForm.password"
                required
                autocomplete="new-password"
                class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pr-20"
              />
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="showPassword = !showPassword">
                  <svg v-if="showPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
                <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="generatePassword" title="Generate password">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                    <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                    <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-fg-strong">name</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <input
              type="text"
              v-model="addForm.name"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
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
                <span class="text-fg-strong font-mono text-sm">{{ t('admin.roleUser') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="addForm.role"
                  value="admin"
                  class="w-4 h-4 accent-neon-400"
                />
                <span class="text-fg-strong font-mono text-sm">{{ t('admin.roleAdmin') }}</span>
              </label>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-base-800">
            <button type="button" class="px-4 py-2 rounded-lg font-mono text-sm border border-base-800 text-base-400 hover:border-fg-strong hover:text-fg-strong transition-colors" @click="closeAddModal">
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
          <h3 class="text-lg font-semibold text-fg-strong font-mono flex items-center gap-2">
            <span class="text-neon-400 opacity-70">></span>
            {{ t('admin.editModal') }}
          </h3>
          <button class="text-base-400 hover:text-fg-strong transition-colors" @click="closeEditModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form @submit.prevent="handleEditUser" class="p-6 space-y-5">
          <div>
            <label class="font-mono text-base-400 mb-2 block text-sm">
              <span class="text-neon-400 opacity-70">let</span> <span class="text-fg-strong">username</span> <span class="text-neon-400 opacity-70">=</span>
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
              <span class="text-neon-400 opacity-70">let</span> <span class="text-fg-strong">name</span> <span class="text-neon-400 opacity-70">=</span>
            </label>
            <input
              type="text"
              v-model="editForm.name"
              autocomplete="off"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
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
                <span class="text-fg-strong font-mono text-sm">{{ t('admin.roleUser') }}</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="editForm.role"
                  value="admin"
                  class="w-4 h-4 accent-neon-400"
                />
                <span class="text-fg-strong font-mono text-sm">{{ t('admin.roleAdmin') }}</span>
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
                  class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3 font-mono text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pr-16"
                />
                <div class="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                  <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="showEditPassword = !showEditPassword">
                    <svg v-if="showEditPassword" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  </button>
                  <button type="button" class="p-1.5 text-base-400 hover:text-neon-400 rounded transition-colors" @click="generateEditPassword" title="Generate password">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="2" width="20" height="20" rx="2" ry="2"/>
                      <circle cx="8" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                      <circle cx="16" cy="8" r="1.5" fill="currentColor" stroke="none"/>
                      <circle cx="8" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                      <circle cx="16" cy="16" r="1.5" fill="currentColor" stroke="none"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-base-800">
            <button type="button" class="px-4 py-2 rounded-lg font-mono text-sm border border-base-800 text-base-400 hover:border-fg-strong hover:text-fg-strong transition-colors" @click="closeEditModal">
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
