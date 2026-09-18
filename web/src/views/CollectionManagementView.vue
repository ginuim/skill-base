<template>
  <main class="flat-page admin-page">
    <router-link to="/" class="flat-back">← {{ t('nav.home') }}</router-link>

    <div class="admin-content">

      <div class="flat-header">
        <h1 class="text-2xl font-bold text-fg-strong mb-2 flex items-center gap-3">
          <span>{{ t('collectionAdmin.heading') }}</span>
        </h1>
        <p class="text-base-400 text-sm ">{{ t('collectionAdmin.subtitle').replace(/^\/\/\s*/, '') }}</p>
      </div>

      <div class="admin-toolbar">
        <h2 class="admin-list-title"> {{ t('collectionAdmin.listHeading') }}
        </h2>
        <button type="button" class="flat-primary px-4 py-2.5 rounded-lg  flex items-center gap-2" @click="openAddModal">
          <Plus :size="16" :stroke-width="2" aria-hidden="true" />
          <span>{{ t('collectionAdmin.addCollection') }}</span>
        </button>
      </div>

      <div class="flex gap-4 mb-6 flex-wrap items-center">
        <div class="flex-1 min-w-[200px]">
          <div class="relative">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('collectionAdmin.searchPlaceholder')"
              class="admin-search-input w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5 text-fg-strong focus:border-neon-400 focus:outline-none focus:ring-1 focus:ring-neon-400 transition-colors"
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
            <tr class="admin-table-heading">
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('collectionAdmin.thName') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('collectionAdmin.thSlug') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('collectionAdmin.thDescription') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('collectionAdmin.thSkills') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('collectionAdmin.thSort') }}</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-base-400  uppercase tracking-wider">{{ t('collectionAdmin.thActions') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="isLoading">
              <tr v-for="i in 5" :key="'sk-' + i" class="border-t border-base-800">
                <td v-for="j in 6" :key="j" class="px-4 py-4">
                  <div class="h-4 bg-base-800 rounded animate-pulse"></div>
                </td>
              </tr>
            </template>
            <tr v-else-if="filteredCollections.length === 0" class="border-t border-base-800">
              <td colspan="6" class="px-4 py-12 text-center text-base-400 ">{{ t('collectionAdmin.emptyState') }}</td>
            </tr>
            <tr
              v-else
              v-for="collection in filteredCollections"
              :key="collection.id"
              class="border-t border-base-800 hover:bg-white/5 transition-colors"
            >
              <td class="px-4 py-4  text-fg-strong">{{ collection.name }}</td>
              <td class="px-4 py-4  text-neon-400">{{ collection.slug }}</td>
              <td class="px-4 py-4  text-base-400 max-w-md truncate">{{ collection.description || t('state.noDesc') }}</td>
              <td class="px-4 py-4  text-base-400">{{ collection.skill_count ?? 0 }}</td>
              <td class="px-4 py-4  text-base-400">{{ collection.sort_order ?? 0 }}</td>
              <td class="px-4 py-4">
                <div class="flex items-center gap-2">
                  <button type="button" class="p-2 text-base-400 hover:text-neon-400 hover:bg-neon-400/10 rounded-lg transition-colors" :title="t('collectionAdmin.editMembers')" @click="openMembersModal(collection)">
                    <ListChecks :size="16" :stroke-width="2" aria-hidden="true" />
                  </button>
                  <button type="button" class="p-2 text-base-400 hover:text-neon-400 hover:bg-neon-400/10 rounded-lg transition-colors" :title="t('btn.edit')" @click="openEditModal(collection)">
                    <Pencil :size="16" :stroke-width="2" aria-hidden="true" />
                  </button>
                  <button type="button" class="p-2 text-base-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" :title="t('btn.delete')" @click="confirmDelete(collection)">
                    <Trash2 :size="16" :stroke-width="2" aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showFormModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click.self="closeFormModal">
      <div class="admin-dialog w-full max-w-lg mx-4">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800">
          <h3 class="text-lg font-semibold text-fg-strong ">{{ isEditing ? t('collectionAdmin.editModal') : t('collectionAdmin.addModal') }}</h3>
          <button type="button" class="text-base-400 hover:text-fg-strong" @click="closeFormModal">
            <X :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <form class="px-6 py-4 space-y-4" @submit.prevent="saveForm">
          <div>
            <label class="block text-sm text-base-400  mb-2">{{ t('collectionAdmin.thName') }}</label>
            <input v-model="form.name" type="text" class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5  text-fg-strong focus:border-neon-400 focus:outline-none" :placeholder="t('collectionAdmin.namePlaceholder')" />
          </div>
          <div>
            <label class="block text-sm text-base-400  mb-2">{{ t('collectionAdmin.thSlug') }}</label>
            <input
              v-model="form.slug"
              type="text"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5  text-fg-strong focus:border-neon-400 focus:outline-none"
              :placeholder="t('collectionAdmin.slugPlaceholder')"
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
            />
            <p class="mt-1.5 text-xs text-base-500 ">{{ t('collectionAdmin.slugHint') }}</p>
          </div>
          <div>
            <label class="block text-sm text-base-400  mb-2">{{ t('collectionAdmin.thDescription') }}</label>
            <textarea
              v-model="form.description"
              rows="3"
              :maxlength="MAX_COLLECTION_DESCRIPTION_LENGTH"
              class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5  text-fg-strong focus:border-neon-400 focus:outline-none"
              :placeholder="t('collectionAdmin.descriptionPlaceholder')"
            ></textarea>
            <p class="mt-1.5 text-xs text-base-500 ">
              {{ t('collectionAdmin.descriptionMaxHint', { max: MAX_COLLECTION_DESCRIPTION_LENGTH }) }}
              <span :class="form.description.length > MAX_COLLECTION_DESCRIPTION_LENGTH ? 'text-red-400' : 'text-base-400'">
                ({{ form.description.length }}/{{ MAX_COLLECTION_DESCRIPTION_LENGTH }})
              </span>
            </p>
          </div>
          <div>
            <label class="block text-sm text-base-400  mb-2">{{ t('collectionAdmin.thSort') }}</label>
            <input v-model.number="form.sort_order" type="number" class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5  text-fg-strong focus:border-neon-400 focus:outline-none" />
          </div>
          <div class="flex justify-end gap-3 pt-2">
            <button type="button" class="px-4 py-2 rounded-lg border border-base-800 text-base-400 hover:text-fg-strong" @click="closeFormModal">
              {{ t('admin.cancel') }}
            </button>
            <button type="submit" class="flat-primary px-4 py-2 rounded-lg  disabled:opacity-50" :disabled="isSaving">
              <span v-if="isSaving" class="spinner spinner-sm"></span>
              <template v-else>{{ t('admin.confirmSave') }}</template>
            </button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="showMembersModal" class="fixed inset-0 bg-black/80 flex items-center justify-center z-50" @click.self="closeMembersModal">
      <div class="admin-dialog w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
        <div class="flex items-center justify-between px-6 py-4 border-b border-base-800">
          <h3 class="text-lg font-semibold text-fg-strong ">{{ t('collectionAdmin.membersModal') }}</h3>
          <button type="button" class="text-base-400 hover:text-fg-strong" @click="closeMembersModal">
            <X :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <div class="px-6 py-4 border-b border-base-800">
          <input
            v-model="skillSearchQuery"
            type="text"
            :placeholder="t('collectionAdmin.skillSearchPlaceholder')"
            class="w-full bg-base-950 border border-base-800 rounded-lg px-4 py-2.5  text-fg-strong focus:border-neon-400 focus:outline-none"
          />
          <p class="mt-2 text-xs text-base-500 ">
            {{ t('collectionAdmin.maxSkillsHint') }}
            <span class="text-base-400">({{ selectedSkillIds.length }}/10)</span>
          </p>
        </div>
        <div class="px-6 py-4 overflow-y-auto flex-1">
          <div v-if="filteredSkills.length === 0" class="text-sm text-base-400  py-8 text-center">{{ t('collectionAdmin.noSkills') }}</div>
          <label
            v-for="skill in filteredSkills"
            :key="skill.id"
            class="flex items-start gap-3 py-3 border-b border-base-800/70 cursor-pointer"
          >
            <input v-model="selectedSkillIds" type="checkbox" :value="skill.id" class="mt-1" />
            <span class="min-w-0">
              <span class="block text-fg-strong ">{{ skill.name }}</span>
              <span class="block text-xs text-base-400  truncate">{{ skill.id }}</span>
            </span>
          </label>
        </div>
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-base-800">
          <button type="button" class="px-4 py-2 rounded-lg border border-base-800 text-base-400 hover:text-fg-strong" @click="closeMembersModal">
            {{ t('admin.cancel') }}
          </button>
          <button type="button" class="flat-primary px-4 py-2 rounded-lg  disabled:opacity-50" :disabled="isSavingMembers || selectedSkillIds.length > MAX_COLLECTION_SKILLS" @click="saveMembers">
            <span v-if="isSavingMembers" class="spinner spinner-sm"></span>
            <template v-else>{{ t('admin.confirmSave') }}</template>
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { Plus, Search, Pencil, Trash2, X, ListChecks } from 'lucide-vue-next'
import { computed, onMounted, ref, watch } from 'vue'
import { collectionsApi, skillsApi, type Collection, type Skill } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'

const { t, currentLang } = useI18n()

const collections = ref<Collection[]>([])
const skills = ref<Skill[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const skillSearchQuery = ref('')

const showFormModal = ref(false)
const showMembersModal = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const isSaving = ref(false)
const isSavingMembers = ref(false)
const membersCollectionId = ref<number | null>(null)
const selectedSkillIds = ref<string[]>([])

const COLLECTION_SLUG_PATTERN = /^[a-z][a-z0-9-]*$/

const form = ref({
  name: '',
  slug: '',
  description: '',
  sort_order: 0,
})

const filteredCollections = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return collections.value
  return collections.value.filter((collection) => {
    return collection.name.toLowerCase().includes(q)
      || collection.slug.toLowerCase().includes(q)
      || String(collection.description || '').toLowerCase().includes(q)
  })
})

const MAX_COLLECTION_SKILLS = 10
const MAX_COLLECTION_DESCRIPTION_LENGTH = 120

const filteredSkills = computed(() => {
  const q = skillSearchQuery.value.trim().toLowerCase()
  if (!q) return skills.value
  return skills.value.filter((skill) => {
    return skill.name.toLowerCase().includes(q) || skill.id.toLowerCase().includes(q)
  })
})

async function loadCollections() {
  isLoading.value = true
  try {
    const res = await collectionsApi.list()
    collections.value = res.collections || []
  } catch (err: any) {
    globalToast.error(t('collectionAdmin.fetchError') + ': ' + err.message)
  } finally {
    isLoading.value = false
  }
}

async function loadSkills() {
  const res = await skillsApi.list()
  skills.value = res.skills || []
}

function isValidSlug(slug: string) {
  const normalized = slug.trim().toLowerCase()
  return normalized.length >= 2 && normalized.length <= 64 && COLLECTION_SLUG_PATTERN.test(normalized)
}

function resetForm() {
  form.value = { name: '', slug: '', description: '', sort_order: 0 }
  editingId.value = null
  isEditing.value = false
}

function openAddModal() {
  resetForm()
  showFormModal.value = true
}

function openEditModal(collection: Collection) {
  isEditing.value = true
  editingId.value = collection.id
  form.value = {
    name: collection.name,
    slug: collection.slug,
    description: collection.description || '',
    sort_order: collection.sort_order ?? 0,
  }
  showFormModal.value = true
}

function closeFormModal() {
  showFormModal.value = false
}

async function saveForm() {
  const name = form.value.name.trim()
  const slug = form.value.slug.trim().toLowerCase()
  if (!name) {
    globalToast.error(t('collectionAdmin.nameRequired'))
    return
  }
  if (!slug) {
    globalToast.error(t('collectionAdmin.slugRequired'))
    return
  }
  if (!isValidSlug(slug)) {
    globalToast.error(t('collectionAdmin.slugInvalid'))
    return
  }
  const description = form.value.description.trim()
  if (description.length > MAX_COLLECTION_DESCRIPTION_LENGTH) {
    globalToast.error(t('collectionAdmin.descriptionTooLong', { max: MAX_COLLECTION_DESCRIPTION_LENGTH }))
    return
  }

  isSaving.value = true
  try {
    const body = {
      name,
      slug,
      description,
      sort_order: Number(form.value.sort_order) || 0,
    }
    if (isEditing.value && editingId.value !== null) {
      await collectionsApi.update(editingId.value, body)
      globalToast.success(t('collectionAdmin.editSuccess'))
    } else {
      await collectionsApi.create(body)
      globalToast.success(t('collectionAdmin.addSuccess'))
    }
    await loadCollections()
    closeFormModal()
  } catch (err: any) {
    globalToast.error(t('collectionAdmin.saveError') + ': ' + err.message)
  } finally {
    isSaving.value = false
  }
}

async function openMembersModal(collection: Collection) {
  membersCollectionId.value = collection.id
  skillSearchQuery.value = ''
  try {
    await loadSkills()
    const detail = await collectionsApi.get(collection.id, { includePrivate: true })
    selectedSkillIds.value = (detail.skills || []).map((skill) => skill.id)
    showMembersModal.value = true
  } catch (err: any) {
    globalToast.error(t('collectionAdmin.membersLoadError') + ': ' + err.message)
  }
}

function closeMembersModal() {
  showMembersModal.value = false
}

async function saveMembers() {
  if (membersCollectionId.value === null) return
  if (selectedSkillIds.value.length > MAX_COLLECTION_SKILLS) {
    globalToast.error(t('collectionAdmin.maxSkillsExceeded'))
    return
  }
  isSavingMembers.value = true
  try {
    await collectionsApi.replaceSkills(membersCollectionId.value, selectedSkillIds.value)
    await loadCollections()
    closeMembersModal()
    globalToast.success(t('collectionAdmin.membersSaveSuccess'))
  } catch (err: any) {
    globalToast.error(t('collectionAdmin.membersSaveError') + ': ' + err.message)
  } finally {
    isSavingMembers.value = false
  }
}

async function confirmDelete(collection: Collection) {
  const ok = window.confirm(t('collectionAdmin.deleteConfirm', { name: collection.name }))
  if (!ok) return
  try {
    await collectionsApi.delete(collection.id)
    await loadCollections()
    globalToast.success(t('collectionAdmin.deleteSuccess'))
  } catch (err: any) {
    globalToast.error(t('collectionAdmin.deleteError') + ': ' + err.message)
  }
}

onMounted(() => {
  document.title = t('collectionAdmin.title')
  loadCollections()
})

watch(currentLang, () => {
  document.title = t('collectionAdmin.title')
})
</script>
