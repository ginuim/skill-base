<template>
  <main class="flat-page admin-page">
    <router-link to="/" class="flat-back">← {{ t('nav.home') }}</router-link>

    <div>

      <div class="flat-header">
        <h1 class="text-fg-strong mb-2 flex items-center gap-3">
          <span>{{ t('tagAdmin.heading') }}</span>
        </h1>
        <p class="text-base-400 text-sm ">{{ t('tagAdmin.subtitle').replace(/^\/\/\s*/, '') }}</p>
      </div>

      <div class="admin-toolbar">
        <h2 class="admin-list-title"> {{ t('tagAdmin.listHeading') }}
        </h2>
        <button type="button" class="flat-primary px-4 py-2.5 rounded-lg  flex items-center gap-2" @click="openAddModal">
          <Plus :size="16" :stroke-width="2" aria-hidden="true" />
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
              class="admin-search-input w-full"
            />
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-base-400">
              <Search :size="16" :stroke-width="2" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>

      <div class="admin-table-scroll">
        <table class="w-full">
          <thead>
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('tagAdmin.thName') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('tagAdmin.thUsage') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('tagAdmin.thActions') }}</th>
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
              <td colspan="3" class="px-4 py-12 text-center text-base-400 ">{{ t('tagAdmin.emptyState') }}</td>
            </tr>
            <tr
              v-else
              v-for="tag in filteredTags"
              :key="tag.id"
              class="border-t border-base-800 hover:bg-white/5 transition-colors"
            >
              <td class="px-4 py-4  text-fg-strong">{{ tag.name }}</td>
              <td class="px-4 py-4  text-base-400">{{ tag.usage_count ?? 0 }}</td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="p-2 text-base-400 hover:text-neon-400 hover:bg-neon-400/10 rounded-lg transition-colors"
                    :title="t('btn.edit')"
                    @click="openEditModal(tag)"
                  >
                    <Pencil :size="16" :stroke-width="2" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    class="p-2 text-base-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    :title="t('btn.delete')"
                    @click="confirmDelete(tag)"
                  >
                    <Trash2 :size="16" :stroke-width="2" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新建 / 编辑（同一弹窗，按 formMode 区分） -->
    <div v-if="showFormModal" class="fixed inset-0 flex items-center justify-center z-50" @click.self="closeFormModal">
      <div class="admin-dialog w-full max-w-md mx-4">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800">
          <h3 class="text-lg font-semibold text-fg-strong ">{{ formMode === 'add' ? t('tagAdmin.addModal') : t('tagAdmin.editModal') }}</h3>
          <button type="button" class="text-base-400 hover:text-fg-strong" @click="closeFormModal">
            <X :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <form class="px-6 py-4" @submit.prevent="handleSubmit">
          <label class="block text-sm text-base-400  mb-2">{{ t('tagAdmin.thName') }}</label>
          <input
            v-model="formName"
            type="text"
            class="w-full"
            :placeholder="t('tagAdmin.namePlaceholder')"
          />
          <div class="flex justify-end gap-3 mt-6">
            <button type="button" class="px-4 py-2 rounded-lg border border-base-800 text-base-400 hover:text-fg-strong" @click="closeFormModal">
              {{ t('admin.cancel') }}
            </button>
            <button type="submit" class="flat-primary px-4 py-2 rounded-lg  disabled:opacity-50" :disabled="isSubmitting">
              <span v-if="isSubmitting" class="spinner spinner-sm"></span>
              <template v-else>{{ formMode === 'add' ? t('tagAdmin.confirmAdd') : t('admin.confirmSave') }}</template>
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, X } from 'lucide-vue-next'
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

// 新建 / 编辑共用一个弹窗，formMode 区分模式
const showFormModal = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const formId = ref(0)
const formName = ref('')
const isSubmitting = ref(false)

function openAddModal() {
  formMode.value = 'add'
  formName.value = ''
  showFormModal.value = true
}

function openEditModal(tag: Tag) {
  formMode.value = 'edit'
  formId.value = tag.id
  formName.value = tag.name
  showFormModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
}

async function handleSubmit() {
  const name = formName.value.trim()
  if (!name) {
    globalToast.error(t('tagAdmin.nameRequired'))
    return
  }
  isSubmitting.value = true
  try {
    if (formMode.value === 'add') {
      await tagsApi.create(name)
      globalToast.success(t('tagAdmin.addSuccess'))
    } else {
      await tagsApi.update(formId.value, name)
      globalToast.success(t('tagAdmin.editSuccess'))
    }
    await loadTags()
    closeFormModal()
  } catch (err: any) {
    const key = formMode.value === 'add' ? 'tagAdmin.addError' : 'tagAdmin.editError'
    globalToast.error(t(key) + ': ' + err.message)
  } finally {
    isSubmitting.value = false
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
