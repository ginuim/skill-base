<template>
  <main class="flat-page admin-page">
    <!-- 面包屑 -->
    <router-link to="/" class="flat-back">← {{ t('nav.home') }}</router-link>

    <div class="admin-content">

      <div class="flat-header">
        <h1 class="text-2xl font-bold text-fg-strong mb-2 flex items-center gap-3">
          <span>{{ t('admin.heading') }}</span>
        </h1>
        <p class="text-base-400 text-sm ">{{ t('admin.subtitle').replace(/^\/\/\s*/, '') }}</p>
      </div>

      <div class="admin-toolbar">
        <h2 class="admin-list-title"> {{ t('admin.userList') }}
        </h2>
        <button class="flat-primary px-4 py-2.5 rounded-lg  flex items-center gap-2" @click="showAddUserModal">
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
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5  text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pl-10"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-400">
              <Search :size="16" :stroke-width="2" aria-hidden="true" />
            </span>
            <button
              v-if="searchQuery"
              type="button"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-fg-strong transition-colors"
              @click="searchQuery = ''"
            >
              <X :size="16" :stroke-width="2" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="relative min-w-[140px]">
          <select
            v-model="statusFilter"
            class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 pr-10  text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors appearance-none cursor-pointer"
          >
            <option value="">{{ t('admin.allStatus') }}</option>
            <option value="active">{{ t('admin.active') }}</option>
            <option value="disabled">{{ t('admin.disabled') }}</option>
          </select>
          <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-400" :stroke-width="2" aria-hidden="true" />
        </div>
      </div>

      <!-- 用户列表 -->
      <div class="admin-table-scroll">
        <table class="w-full">
          <thead>
            <tr class="admin-table-heading">
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('admin.thUsername') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('admin.thName') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('admin.thRole') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('admin.thStatus') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('admin.thCreatedAt') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('admin.thActions') }}</th>
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
                <p class="text-base-400 ">{{ t('admin.emptyState') }}</p>
              </td>
            </tr>
            <tr
              v-else
              v-for="user in paginatedUsers"
              :key="user.id"
              class="border-t border-base-800 hover:bg-white/5 transition-colors"
            >
              <td class="px-4 py-4  text-fg-strong">{{ user.username }}</td>
              <td class="px-4 py-4  text-fg-strong">{{ user.name || '-' }}</td>
              <td class="px-4 py-4">
                <span
                  class="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full "
                  :class="user.role === 'admin' ? 'bg-neon-400/10 text-neon-400 border border-neon-400/30' : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'"
                >
                  <Shield v-if="user.role === 'admin'" :size="12" :stroke-width="2" aria-hidden="true" />
                  <UserCircle v-else :size="12" :stroke-width="2" aria-hidden="true" />
                  {{ user.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser') }}
                </span>
              </td>
              <td class="px-4 py-4 ">
                <span :class="user.status === 'disabled' ? 'text-red-400' : 'text-neon-400'">
                  {{ user.status === 'disabled' ? t('admin.disabled') : t('admin.active') }}
                </span>
              </td>
              <td class="px-4 py-4  text-base-400 text-sm">{{ formatDate(user.created_at) }}</td>
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
            class="px-4 py-2 rounded-lg  text-sm border border-base-800 text-base-400 hover:border-neon-400 hover:text-neon-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            {{ t('admin.prevPage') }}
          </button>
          <span class="text-base-400  text-sm">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="px-4 py-2 rounded-lg  text-sm border border-base-800 text-base-400 hover:border-neon-400 hover:text-neon-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div class="admin-dialog w-full max-w-lg mx-4 transform transition-all flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800 shrink-0">
          <h3 class="text-lg font-semibold text-fg-strong  flex items-center gap-2">
            {{ t('admin.addModal') }}
          </h3>
          <button type="button" class="text-base-400 hover:text-fg-strong transition-colors" @click="closeAddModal">
            <X :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <div class="flex gap-2 px-6 py-2 border-b border-base-800 shrink-0" role="tablist" :aria-label="t('admin.addModal')">
          <button
            type="button"
            role="tab"
            :aria-selected="addModalTab === 'basic'"
            class="px-3 py-1.5 rounded  text-sm border transition-colors"
            :class="addModalTab === 'basic' ? 'border-neon-400 text-neon-400 bg-neon-400/5' : 'border-base-800 text-base-400 hover:text-fg-strong'"
            @click="addModalTab = 'basic'"
          >
            {{ t('admin.tabBasic') }}
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="addModalTab === 'skills'"
            class="px-3 py-1.5 rounded  text-sm border transition-colors"
            :class="addModalTab === 'skills' ? 'border-neon-400 text-neon-400 bg-neon-400/5' : 'border-base-800 text-base-400 hover:text-fg-strong'"
            @click="addModalTab = 'skills'"
          >
            {{ t('admin.tabSkills') }}
          </button>
        </div>
        <form novalidate @submit.prevent="handleAddUser" class="flex flex-col flex-1 min-h-0">
          <div class="flex-1 min-h-0 flex flex-col min-h-0">
            <div v-show="addModalTab === 'basic'" class="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
              <div>
                <label class=" text-base-400 mb-2 block text-sm">
                  {{ t('admin.thUsername') }}
                </label>
                <input
                  type="text"
                  v-model="addForm.username"
                  required
                  autocomplete="off"
                  class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3  text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
                />
              </div>
              <div>
                <label class=" text-base-400 mb-2 block text-sm">
                  {{ t('admin.password') }}
                </label>
                <div class="relative">
                  <input
                    :type="showPassword ? 'text' : 'password'"
                    v-model="addForm.password"
                    required
                    autocomplete="new-password"
                    class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3  text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pr-20"
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
                <label class=" text-base-400 mb-2 block text-sm">
                  {{ t('admin.thName') }}
                </label>
                <input
                  type="text"
                  v-model="addForm.name"
                  class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3  text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
                />
              </div>
              <div>
                <label class=" text-base-400 mb-3 block text-sm">{{ t('admin.roleLabel') }}</label>
                <div class="flex gap-6">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      v-model="addForm.role"
                      value="developer"
                      class="w-4 h-4 accent-neon-400"
                    />
                    <span class="text-fg-strong  text-sm">{{ t('admin.roleUser') }}</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      v-model="addForm.role"
                      value="admin"
                      class="w-4 h-4 accent-neon-400"
                    />
                    <span class="text-fg-strong  text-sm">{{ t('admin.roleAdmin') }}</span>
                  </label>
                </div>
              </div>
            </div>
            <div v-show="addModalTab === 'skills'" class="flex flex-col flex-1 min-h-0 overflow-hidden p-6 space-y-3">
              <label class=" text-base-400 block text-sm mb-0 shrink-0">{{ t('admin.skillsLabel') }}</label>
              <p class="text-xs text-base-500  shrink-0">{{ t('admin.skillsHintAdd') }}</p>
              <div v-if="skillsListLoading" class="text-base-400  text-xs py-4 shrink-0">…</div>
              <template v-else>
                <div v-if="allSkills.length === 0" class="text-base-500 text-xs  shrink-0">{{ t('admin.skillsEmpty') }}</div>
                <template v-else>
                  <div class="um-picker-filter-row shrink-0">
                    <input
                      v-model="skillPickerFilter"
                      type="text"
                      :placeholder="t('admin.skillsFilterPlaceholder')"
                      class="um-picker-name-search w-full bg-base-950 border border-base-800 rounded-lg px-3 py-2  text-sm text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400"
                    />
                    <div
                      v-if="availableTagsFromSkills.length > 0"
                      class="tag-filter-dropdown"
                      :class="{ 'tag-filter-dropdown--open': skillPickerTagDropdownOpen }"
                    >
                      <button
                        type="button"
                        class="filter-chip tag-filter-trigger"
                        :class="{ 'filter-chip--active': skillPickerSelectedTagIds.length > 0 }"
                        :aria-expanded="skillPickerTagDropdownOpen"
                        aria-haspopup="listbox"
                        @click.stop="toggleSkillPickerTagDropdown"
                      >
                        <Tags :size="14" :stroke-width="2" aria-hidden="true" />
                        {{ t('index.tagsFilter') }}
                        <span v-if="skillPickerSelectedTagIds.length > 0" class="tag-filter-badge">{{ skillPickerSelectedTagIds.length }}</span>
                        <ChevronDown class="tag-filter-chevron" :size="14" :stroke-width="2.5" aria-hidden="true" />
                      </button>
                      <div
                        v-show="skillPickerTagDropdownOpen"
                        class="tag-filter-panel"
                        role="listbox"
                        aria-multiselectable="true"
                        @click.stop
                      >
                        <div class="tag-filter-panel-header">
                          <p class="tag-filter-hint">{{ t('index.tagsFilterHint') }}</p>
                          <button
                            v-if="skillPickerSelectedTagIds.length > 0"
                            type="button"
                            class="tag-filter-clear"
                            :title="t('index.clearTags')"
                            @click="clearSkillPickerTagFilter"
                          >
                            <X class="tag-filter-clear-icon" :size="12" :stroke-width="2" aria-hidden="true" />
                            <span>{{ t('index.clearTags') }}</span>
                          </button>
                        </div>
                        <div class="um-picker-tag-filter-options">
                          <button
                            v-for="tag in availableTagsFromSkills"
                            :key="tag.id"
                            type="button"
                            class="tag-filter-option"
                            :class="{ 'tag-filter-option--active': isSkillPickerTagSelected(tag.id) }"
                            role="option"
                            :aria-selected="isSkillPickerTagSelected(tag.id)"
                            @click="toggleSkillPickerTag(tag.id)"
                          >
                            <span class="tag-filter-option-check" aria-hidden="true">
                              <Check v-if="isSkillPickerTagSelected(tag.id)" :size="14" :stroke-width="2.5" />
                            </span>
                            <span class="tag-filter-option-label">{{ tag.name }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="filteredSkillsForPicker.length === 0" class="text-base-500 text-xs  py-2 shrink-0">{{ t('admin.skillsNoMatch') }}</div>
                  <div
                    v-else
                    class="tag-filter-options um-skill-options um-skill-options--modal flex-1 min-h-0 overflow-y-auto"
                    role="listbox"
                    aria-multiselectable="true"
                  >
                    <button
                      v-for="s in filteredSkillsForPicker"
                      :key="s.id"
                      type="button"
                      class="tag-filter-option"
                      :class="{ 'tag-filter-option--active': isAddSkillSelected(s.id) }"
                      role="option"
                      :aria-selected="isAddSkillSelected(s.id)"
                      @click="toggleAddSkillPending(s.id)"
                    >
                      <span class="tag-filter-option-check" aria-hidden="true">
                        <Check v-if="isAddSkillSelected(s.id)" :size="14" :stroke-width="2.5" />
                      </span>
                      <span class="tag-filter-option-label">{{ s.name }}</span>
                    </button>
                  </div>
                </template>
              </template>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-base-800 shrink-0 bg-base-900">
            <button type="button" class="px-4 py-2 rounded-lg  text-sm border border-base-800 text-base-400 hover:text-fg-strong transition-colors" @click="closeAddModal">
              {{ t('admin.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="isAdding"
              class="flat-primary px-4 py-2 rounded-lg  text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <div class="admin-dialog w-full max-w-lg mx-4 transform transition-all flex flex-col max-h-[90vh]">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800 shrink-0">
          <h3 class="text-lg font-semibold text-fg-strong  flex items-center gap-2">
            {{ t('admin.editModal') }}
          </h3>
          <button type="button" class="text-base-400 hover:text-fg-strong transition-colors" @click="closeEditModal">
            <X :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <div class="flex gap-2 px-6 py-2 border-b border-base-800 shrink-0" role="tablist" :aria-label="t('admin.editModal')">
          <button
            type="button"
            role="tab"
            :aria-selected="editModalTab === 'basic'"
            class="px-3 py-1.5 rounded  text-sm border transition-colors"
            :class="editModalTab === 'basic' ? 'border-neon-400 text-neon-400 bg-neon-400/5' : 'border-base-800 text-base-400 hover:text-fg-strong'"
            @click="editModalTab = 'basic'"
          >
            {{ t('admin.tabBasic') }}
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="editModalTab === 'skills'"
            class="px-3 py-1.5 rounded  text-sm border transition-colors"
            :class="editModalTab === 'skills' ? 'border-neon-400 text-neon-400 bg-neon-400/5' : 'border-base-800 text-base-400 hover:text-fg-strong'"
            @click="editModalTab = 'skills'"
          >
            {{ t('admin.tabSkills') }}
          </button>
        </div>
        <form @submit.prevent="handleEditUser" class="flex flex-col flex-1 min-h-0">
          <div class="flex-1 min-h-0 flex flex-col min-h-0">
            <div v-show="editModalTab === 'basic'" class="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
              <div>
                <label class=" text-base-400 mb-2 block text-sm">
                  {{ t('admin.thUsername') }}
                </label>
                <input
                  type="text"
                  :value="editForm.username"
                  disabled
                  class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3  text-base-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label class=" text-base-400 mb-2 block text-sm">
                  {{ t('admin.thName') }}
                </label>
                <input
                  type="text"
                  v-model="editForm.name"
                  autocomplete="off"
                  class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3  text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
                />
              </div>
              <div>
                <label class=" text-base-400 mb-3 block text-sm">{{ t('admin.roleLabel') }}</label>
                <div class="flex gap-6">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      v-model="editForm.role"
                      value="developer"
                      class="w-4 h-4 accent-neon-400"
                    />
                    <span class="text-fg-strong  text-sm">{{ t('admin.roleUser') }}</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      v-model="editForm.role"
                      value="admin"
                      class="w-4 h-4 accent-neon-400"
                    />
                    <span class="text-fg-strong  text-sm">{{ t('admin.roleAdmin') }}</span>
                  </label>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between">
                  <div>
                    <label class=" text-base-400 block text-sm">{{ t('admin.statusLabel') }}</label>
                    <p class="text-xs text-base-500  mt-1">{{ editForm.disabled ? t('admin.statusDisabled') : t('admin.statusActive') }}</p>
                  </div>
                  <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" :checked="!editForm.disabled" @change="editForm.disabled = !editForm.disabled" class="sr-only peer">
                    <div class="w-12 h-6 bg-base-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-base-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-400 peer-checked:after:bg-base-950"></div>
                  </label>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between">
                  <div>
                    <label class=" text-base-400 block text-sm">{{ t('admin.resetPassword') }}</label>
                    <p class="text-xs text-base-500  mt-1">{{ t('admin.resetPasswordHint') }}</p>
                  </div>
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg  text-xs border border-base-800 text-base-400 hover:border-neon-400 hover:text-neon-400 transition-colors"
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
                      class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-3  text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pr-16"
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
            </div>
            <div v-show="editModalTab === 'skills'" class="flex flex-col flex-1 min-h-0 overflow-hidden p-6 space-y-3">
              <label class=" text-base-400 block text-sm mb-0 shrink-0">{{ t('admin.skillsLabel') }}</label>
              <p class="text-xs text-base-500  shrink-0">{{ t('admin.skillsHintEdit') }}</p>
              <div v-if="skillsListLoading" class="text-base-400  text-xs py-4 shrink-0">…</div>
              <template v-else>
                <div v-if="allSkills.length === 0" class="text-base-500 text-xs  shrink-0">{{ t('admin.skillsEmpty') }}</div>
                <template v-else>
                  <div class="um-picker-filter-row shrink-0">
                    <input
                      v-model="skillPickerFilter"
                      type="text"
                      :placeholder="t('admin.skillsFilterPlaceholder')"
                      class="um-picker-name-search w-full bg-base-950 border border-base-800 rounded-lg px-3 py-2  text-sm text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400"
                    />
                    <div
                      v-if="availableTagsFromSkills.length > 0"
                      class="tag-filter-dropdown"
                      :class="{ 'tag-filter-dropdown--open': skillPickerTagDropdownOpen }"
                    >
                      <button
                        type="button"
                        class="filter-chip tag-filter-trigger"
                        :class="{ 'filter-chip--active': skillPickerSelectedTagIds.length > 0 }"
                        :aria-expanded="skillPickerTagDropdownOpen"
                        aria-haspopup="listbox"
                        @click.stop="toggleSkillPickerTagDropdown"
                      >
                        <Tags :size="14" :stroke-width="2" aria-hidden="true" />
                        {{ t('index.tagsFilter') }}
                        <span v-if="skillPickerSelectedTagIds.length > 0" class="tag-filter-badge">{{ skillPickerSelectedTagIds.length }}</span>
                        <ChevronDown class="tag-filter-chevron" :size="14" :stroke-width="2.5" aria-hidden="true" />
                      </button>
                      <div
                        v-show="skillPickerTagDropdownOpen"
                        class="tag-filter-panel"
                        role="listbox"
                        aria-multiselectable="true"
                        @click.stop
                      >
                        <div class="tag-filter-panel-header">
                          <p class="tag-filter-hint">{{ t('index.tagsFilterHint') }}</p>
                          <button
                            v-if="skillPickerSelectedTagIds.length > 0"
                            type="button"
                            class="tag-filter-clear"
                            :title="t('index.clearTags')"
                            @click="clearSkillPickerTagFilter"
                          >
                            <X class="tag-filter-clear-icon" :size="12" :stroke-width="2" aria-hidden="true" />
                            <span>{{ t('index.clearTags') }}</span>
                          </button>
                        </div>
                        <div class="um-picker-tag-filter-options">
                          <button
                            v-for="tag in availableTagsFromSkills"
                            :key="tag.id"
                            type="button"
                            class="tag-filter-option"
                            :class="{ 'tag-filter-option--active': isSkillPickerTagSelected(tag.id) }"
                            role="option"
                            :aria-selected="isSkillPickerTagSelected(tag.id)"
                            @click="toggleSkillPickerTag(tag.id)"
                          >
                            <span class="tag-filter-option-check" aria-hidden="true">
                              <Check v-if="isSkillPickerTagSelected(tag.id)" :size="14" :stroke-width="2.5" />
                            </span>
                            <span class="tag-filter-option-label">{{ tag.name }}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="filteredSkillsForPicker.length === 0" class="text-base-500 text-xs  py-2 shrink-0">{{ t('admin.skillsNoMatch') }}</div>
                  <div
                    v-else
                    class="tag-filter-options um-skill-options um-skill-options--modal flex-1 min-h-0 overflow-y-auto"
                    role="listbox"
                    aria-multiselectable="true"
                  >
                    <button
                      v-for="s in filteredSkillsForPicker"
                      :key="s.id"
                      type="button"
                      class="tag-filter-option"
                      :class="{
                        'tag-filter-option--active': isEditSkillSelected(s.id),
                        'tag-filter-option--busy': skillBusyId === s.id,
                      }"
                      role="option"
                      :aria-selected="isEditSkillSelected(s.id)"
                      :disabled="isEditSkillRowDisabled(s.id)"
                      @click="toggleEditSkillCollaboration(s.id)"
                    >
                      <span class="tag-filter-option-check" aria-hidden="true">
                        <Check v-if="isEditSkillSelected(s.id)" :size="14" :stroke-width="2.5" />
                      </span>
                      <span class="tag-filter-option-label">{{ s.name }}</span>
                    </button>
                  </div>
                </template>
              </template>
            </div>
          </div>
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-base-800 shrink-0 bg-base-900">
            <button type="button" class="px-4 py-2 rounded-lg  text-sm border border-base-800 text-base-400 hover:text-fg-strong transition-colors" @click="closeEditModal">
              {{ t('admin.cancel') }}
            </button>
            <button
              type="submit"
              :disabled="isEditing"
              class="flat-primary px-4 py-2 rounded-lg  text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
  Check,
  Tags,
} from 'lucide-vue-next'
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { usersApi, skillsApi, collaboratorsApi, type User, type Skill, type Tag } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'
import { parseUtcDateString } from '@/utils/date'

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
type UserModalTab = 'basic' | 'skills'
const addModalTab = ref<UserModalTab>('basic')
const editModalTab = ref<UserModalTab>('basic')
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
  addModalTab.value = 'basic'
  addForm.value = { username: '', password: '', name: '', role: 'developer' }
  showPassword.value = false
  addPendingSkillIds.value = []
  skillPickerFilter.value = ''
  skillPickerSelectedTagIds.value = []
  skillPickerTagDropdownOpen.value = false
  showAddModal.value = true
  void fetchAllSkills()
}

function closeAddModal() {
  showAddModal.value = false
  skillPickerSelectedTagIds.value = []
  skillPickerTagDropdownOpen.value = false
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
  if (!addForm.value.username.trim()) {
    addModalTab.value = 'basic'
    globalToast.error(t('admin.usernameRequired'))
    return
  }
  if (!addForm.value.password) {
    addModalTab.value = 'basic'
    globalToast.error(t('admin.passwordRequired'))
    return
  }
  isAdding.value = true
  try {
    const res = await usersApi.create(addForm.value)
    const uid = res.user?.id
    const uname = addForm.value.username.trim()
    if (uid != null && addPendingSkillIds.value.length > 0 && uname) {
      for (const skillId of addPendingSkillIds.value) {
        try {
          await collaboratorsApi.add(skillId, uname)
        } catch (err: any) {
          globalToast.error(t('admin.skillMembershipError') + ': ' + err.message)
        }
      }
    }
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
  editModalTab.value = 'basic'
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
  ownerSkillIdSet.value = new Set()
  memberCollaboratorSkillIds.value = []
  skillPickerFilter.value = ''
  skillPickerSelectedTagIds.value = []
  skillPickerTagDropdownOpen.value = false
  skillBusyId.value = null
  showEditModal.value = true
  void Promise.all([fetchAllSkills(), loadUserSkillCollaborations(user.id)])
}

function closeEditModal() {
  showEditModal.value = false
  ownerSkillIdSet.value = new Set()
  memberCollaboratorSkillIds.value = []
  skillBusyId.value = null
  skillPickerSelectedTagIds.value = []
  skillPickerTagDropdownOpen.value = false
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
  const date = parseUtcDateString(dateStr)
  return date.toLocaleDateString(currentLang.value === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// —— 技能协作者（样式同首页 tag 过滤：按钮 + 模拟勾选；增删走 POST/DELETE …/skills/:id/collaborators）——
const allSkills = ref<Skill[]>([])
const skillsListLoading = ref(false)
const skillPickerFilter = ref('')
const skillPickerSelectedTagIds = ref<number[]>([])
const skillPickerTagDropdownOpen = ref(false)
const addPendingSkillIds = ref<string[]>([])
const ownerSkillIdSet = ref(new Set<string>())
const memberCollaboratorSkillIds = ref<string[]>([])
const skillBusyId = ref<string | null>(null)

const availableTagsFromSkills = computed(() => {
  const map = new Map<number, Tag>()
  for (const skill of allSkills.value) {
    for (const tag of skill.tags || []) {
      if (!map.has(tag.id)) {
        map.set(tag.id, tag)
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

const filteredSkillsForPicker = computed(() => {
  let list = allSkills.value
  const tagIds = skillPickerSelectedTagIds.value
  if (tagIds.length > 0) {
    const need = new Set(tagIds)
    list = list.filter((s) => (s.tags || []).some((t) => need.has(t.id)))
  }
  const q = skillPickerFilter.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    )
  }
  return list
})

function onSkillPickerDocumentClick() {
  skillPickerTagDropdownOpen.value = false
}

const skillPickerSkillsTabActive = computed(
  () =>
    (showAddModal.value && addModalTab.value === 'skills') ||
    (showEditModal.value && editModalTab.value === 'skills')
)

watch(
  skillPickerSkillsTabActive,
  (active) => {
    if (active) {
      document.addEventListener('click', onSkillPickerDocumentClick)
    } else {
      document.removeEventListener('click', onSkillPickerDocumentClick)
      skillPickerTagDropdownOpen.value = false
    }
  },
  { flush: 'post' }
)

onUnmounted(() => {
  document.removeEventListener('click', onSkillPickerDocumentClick)
})

function isSkillPickerTagSelected(id: number) {
  return skillPickerSelectedTagIds.value.includes(id)
}

function toggleSkillPickerTag(id: number) {
  const cur = skillPickerSelectedTagIds.value
  const i = cur.indexOf(id)
  skillPickerSelectedTagIds.value = i === -1 ? [...cur, id] : cur.filter((x) => x !== id)
}

function clearSkillPickerTagFilter() {
  skillPickerSelectedTagIds.value = []
}

function toggleSkillPickerTagDropdown() {
  skillPickerTagDropdownOpen.value = !skillPickerTagDropdownOpen.value
}

async function fetchAllSkills() {
  skillsListLoading.value = true
  try {
    const { skills } = await skillsApi.list()
    const next = [...skills]
    next.sort((a, b) => a.name.localeCompare(b.name))
    allSkills.value = next
  } catch (err: any) {
    globalToast.error(t('admin.fetchError') + ': ' + err.message)
  } finally {
    skillsListLoading.value = false
  }
}

async function loadUserSkillCollaborations(userId: number) {
  try {
    const { collaborations } = await usersApi.listUserSkillCollaborations(userId)
    ownerSkillIdSet.value = new Set(collaborations.filter((c) => c.role === 'owner').map((c) => c.skill_id))
    memberCollaboratorSkillIds.value = collaborations
      .filter((c) => c.role === 'collaborator')
      .map((c) => c.skill_id)
  } catch (err: any) {
    globalToast.error(t('admin.fetchError') + ': ' + err.message)
    ownerSkillIdSet.value = new Set()
    memberCollaboratorSkillIds.value = []
  }
}

function isAddSkillSelected(id: string) {
  return addPendingSkillIds.value.includes(id)
}

function toggleAddSkillPending(id: string) {
  const cur = addPendingSkillIds.value
  const i = cur.indexOf(id)
  addPendingSkillIds.value = i === -1 ? [...cur, id] : cur.filter((x) => x !== id)
}

function isEditSkillSelected(skillId: string) {
  return ownerSkillIdSet.value.has(skillId) || memberCollaboratorSkillIds.value.includes(skillId)
}

function isEditSkillRowDisabled(skillId: string) {
  if (ownerSkillIdSet.value.has(skillId)) return true
  if (skillBusyId.value === null) return false
  return skillBusyId.value === skillId
}

async function toggleEditSkillCollaboration(skillId: string) {
  const uid = editForm.value.id
  if (!uid || skillBusyId.value !== null) return
  if (ownerSkillIdSet.value.has(skillId)) {
    globalToast.error(t('admin.skillOwnerLocked'))
    return
  }
  const isIn = memberCollaboratorSkillIds.value.includes(skillId)
  skillBusyId.value = skillId
  try {
    if (isIn) {
      await collaboratorsApi.remove(skillId, uid)
      memberCollaboratorSkillIds.value = memberCollaboratorSkillIds.value.filter((x) => x !== skillId)
    } else {
      await collaboratorsApi.add(skillId, editForm.value.username)
      memberCollaboratorSkillIds.value = [...memberCollaboratorSkillIds.value, skillId]
    }
  } catch (err: any) {
    globalToast.error(t('admin.skillMembershipError') + ': ' + err.message)
  } finally {
    skillBusyId.value = null
  }
}
</script>

<style scoped>
/* 技能选择器：名称搜索 + 标签筛选（布局与 HomeView 标签下拉视觉对齐） */
.um-picker-filter-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.um-picker-name-search {
  flex: 1 1 12rem;
  min-width: 0;
}

.tag-filter-dropdown {
  position: relative;
}

.tag-filter-trigger {
  gap: 0.35rem;
}

.tag-filter-badge {
  min-width: 1.125rem;
  height: 1.125rem;
  padding: 0 0.25rem;
  border-radius: 9999px;
  background: rgba(255, 117, 181, 0.25);
  color: #ff75b5;
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.125rem;
  text-align: center;
}

.tag-filter-chevron {
  flex-shrink: 0;
  opacity: 0.75;
  transition: transform 0.2s ease;
}

.tag-filter-dropdown--open .tag-filter-chevron {
  transform: rotate(180deg);
}

.tag-filter-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 80;
  min-width: 14rem;
  max-width: min(20rem, calc(100vw - 2rem));
  max-height: 11rem;
  display: flex;
  flex-direction: column;
  padding: 0.45rem 0.5rem 0.5rem;
  background: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  border-radius: 0.625rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.tag-filter-panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  flex-shrink: 0;
  margin-bottom: 0.35rem;
}

.tag-filter-hint {
  margin: 0;
  padding: 0.15rem 0.25rem 0 0;
  flex: 1;
  min-width: 0;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--color-base-400);
  line-height: 1.35;
}

.tag-filter-clear {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  padding: 0.25rem 0.4rem;
  border-radius: 0.375rem;
  border: 1px solid var(--color-base-800);
  background: transparent;
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: var(--color-base-400);
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.tag-filter-clear:hover {
  border-color: var(--color-base-600);
  color: var(--color-base-200);
  background: color-mix(in srgb, var(--color-fg-strong) 5%, transparent);
}

.tag-filter-clear-icon {
  flex-shrink: 0;
  color: var(--color-base-500);
  opacity: 0.9;
}

.tag-filter-clear:hover .tag-filter-clear-icon {
  color: var(--color-base-400);
}

.um-picker-tag-filter-options {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 与 HomeView 标签过滤选项一致：无原生 checkbox */
.um-skill-options {
  max-height: 10rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.25rem 0;
  border-radius: 0.5rem;
  border: 1px solid var(--color-base-800);
  background: var(--color-base-950);
}

.um-skill-options--modal {
  max-height: none;
}

.tag-filter-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.45rem 0.5rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-base-300);
  font-size: 0.8125rem;
  font-family: 'JetBrains Mono', monospace;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.tag-filter-option:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-fg-strong) 6%, transparent);
  color: var(--color-fg-strong);
}

.tag-filter-option:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.tag-filter-option.tag-filter-option--busy:disabled {
  cursor: wait;
}

.tag-filter-option--active {
  background: rgba(var(--color-neon-rgb), 0.08);
  color: var(--color-neon-400);
}

.tag-filter-option-check {
  flex-shrink: 0;
  width: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neon-400);
}

.tag-filter-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
