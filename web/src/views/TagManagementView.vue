<template>
  <main class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
    <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
      <span class="text-neon-400">~</span>
      <span class="opacity-50">/</span>
      <router-link to="/" class="hover:text-white transition-colors">{{ t('nav.home') }}</router-link>
      <span class="opacity-50">/</span>
      <span class="text-white">admin</span>
      <span class="opacity-50">/</span>
      <span class="text-white">tags</span>
    </div>

    <div class="skill-card p-8 relative overflow-hidden">
      <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">ADMIN-TAGS</div>

      <div class="mb-8 border-b border-base-800 pb-6">
        <h1 class="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <span class="text-neon-400 font-mono font-normal opacity-70">></span>
          <span>{{ t('tagAdmin.heading') }}</span>
        </h1>
        <p class="text-base-400 text-sm font-mono">{{ t('tagAdmin.subtitle') }}</p>
      </div>

      <div class="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h2 class="flex items-center gap-2 text-lg font-semibold text-white pb-3 border-b border-base-800 font-mono mb-0">
          <span class="text-neon-400">#</span> {{ t('tagAdmin.listHeading') }}
        </h2>
        <button type="button" class="btn-primary px-4 py-2.5 rounded-lg font-mono flex items-center gap-2" @click="openAddModal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>{{ t('tagAdmin.addTag') }}</span>
        </button>
      </div>

      <div class="flex gap-4 mb-6 flex-wrap items-center">
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('tagAdmin.searchPlaceholder')"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 font-mono text-white focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors pl-10"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-400">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </span>
          </div>
        </div>
      </div>

      <div class="border border-base-800 rounded-xl overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-base-950">
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('tagAdmin.thName') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('tagAdmin.thUsage') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400 font-mono uppercase tracking-wider">{{ t('tagAdmin.thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 5" :key="'sk-' + i" class="border-t border-base-800">
                <td v-for="j in 3" :key="j" class="px-4 py-4">
                  <div class="h-4 bg-base-800 rounded animate-pulse"></div>
                </td>
              </tr>
            </template>
            <tr v-else-if="filteredTags.length === 0" class="border-t border-base-800">
              <td colspan="3" class="px-4 py-12 text-center text-base-400 font-mono">{{ t('tagAdmin.emptyState') }}</td>
            </tr>
            <tr
              v-else
              v-for="tag in filteredTags"
              :key="tag.id"
              class="border-t border-base-800 hover:bg-white/5 transition-colors"
            >
              <td class="px-4 py-4 font-mono text-white">{{ tag.name }}</td>
              <td class="px-4 py-4 font-mono text-base-400">{{ tag.usage_count ?? 0 }}</td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="p-2 text-base-400 hover:text-neon-400 hover:bg-neon-400/10 rounded-lg transition-colors"
                    :title="t('btn.edit')"
                    @click="openEditModal(tag)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="p-2 text-base-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    :title="t('btn.delete')"
                    @click="confirmDelete(tag)"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新建 -->
    <div v-if="showAddModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click.self="closeAddModal">
      <div class="bg-base-900 border border-base-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800">
          <h3 class="text-lg font-semibold text-white font-mono">{{ t('tagAdmin.addModal') }}</h3>
          <button type="button" class="text-base-400 hover:text-white" @click="closeAddModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form class="px-6 py-4" @submit.prevent="handleAdd">
          <label class="block text-sm text-base-400 font-mono mb-2">{{ t('tagAdmin.thName') }}</label>
          <input
            v-model="addName"
            type="text"
            class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 font-mono text-white focus:border-neon-400 focus:outline-none"
            :placeholder="t('tagAdmin.namePlaceholder')"
          />
          <div class="flex justify-end gap-3 mt-6">
            <button type="button" class="px-4 py-2 rounded-lg border border-base-800 text-base-400 hover:text-white" @click="closeAddModal">
              {{ t('admin.cancel') }}
            </button>
            <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-mono disabled:opacity-50" :disabled="isAdding">
              <span v-if="isAdding" class="spinner spinner-sm"></span>
              <template v-else>{{ t('tagAdmin.confirmAdd') }}</template>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 编辑 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click.self="closeEditModal">
      <div class="bg-base-900 border border-base-800 rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800">
          <h3 class="text-lg font-semibold text-white font-mono">{{ t('tagAdmin.editModal') }}</h3>
          <button type="button" class="text-base-400 hover:text-white" @click="closeEditModal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form class="px-6 py-4" @submit.prevent="handleEdit">
          <label class="block text-sm text-base-400 font-mono mb-2">{{ t('tagAdmin.thName') }}</label>
          <input
            v-model="editName"
            type="text"
            class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 font-mono text-white focus:border-neon-400 focus:outline-none"
            :placeholder="t('tagAdmin.namePlaceholder')"
          />
          <div class="flex justify-end gap-3 mt-6">
            <button type="button" class="px-4 py-2 rounded-lg border border-base-800 text-base-400 hover:text-white" @click="closeEditModal">
              {{ t('admin.cancel') }}
            </button>
            <button type="submit" class="btn-primary px-4 py-2 rounded-lg font-mono disabled:opacity-50" :disabled="isSaving">
              <span v-if="isSaving" class="spinner spinner-sm"></span>
              <template v-else>{{ t('admin.confirmSave') }}</template>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { tagsApi, type Tag } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'

const { t, currentLang } = useI18n()

const tags = ref<Tag[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

const filteredTags = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return tags.value
  return tags.value.filter((tag) => tag.name.toLowerCase().includes(q))
})

async function loadTags() {
  isLoading.value = true
  try {
    const res = await tagsApi.list()
    tags.value = res.tags
  } catch (err: any) {
    globalToast.error(t('tagAdmin.fetchError') + ': ' + err.message)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  document.title = t('tagAdmin.title')
  loadTags()
})

watch(currentLang, () => {
  document.title = t('tagAdmin.title')
})

const showAddModal = ref(false)
const addName = ref('')
const isAdding = ref(false)

function openAddModal() {
  addName.value = ''
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function handleAdd() {
  const name = addName.value.trim()
  if (!name) {
    globalToast.error(t('tagAdmin.nameRequired'))
    return
  }
  isAdding.value = true
  try {
    await tagsApi.create(name)
    await loadTags()
    closeAddModal()
    globalToast.success(t('tagAdmin.addSuccess'))
  } catch (err: any) {
    globalToast.error(t('tagAdmin.addError') + ': ' + err.message)
  } finally {
    isAdding.value = false
  }
}

const showEditModal = ref(false)
const editId = ref(0)
const editName = ref('')
const isSaving = ref(false)

function openEditModal(tag: Tag) {
  editId.value = tag.id
  editName.value = tag.name
  showEditModal.value = true
}

function closeEditModal() {
  showEditModal.value = false
}

async function handleEdit() {
  const name = editName.value.trim()
  if (!name) {
    globalToast.error(t('tagAdmin.nameRequired'))
    return
  }
  isSaving.value = true
  try {
    await tagsApi.update(editId.value, name)
    await loadTags()
    closeEditModal()
    globalToast.success(t('tagAdmin.editSuccess'))
  } catch (err: any) {
    globalToast.error(t('tagAdmin.editError') + ': ' + err.message)
  } finally {
    isSaving.value = false
  }
}

async function confirmDelete(tag: Tag) {
  const ok = window.confirm(t('tagAdmin.deleteConfirm', { name: tag.name }))
  if (!ok) return
  try {
    await tagsApi.delete(tag.id)
    await loadTags()
    globalToast.success(t('tagAdmin.deleteSuccess'))
  } catch (err: any) {
    globalToast.error(t('tagAdmin.deleteError') + ': ' + err.message)
  }
}
</script>
