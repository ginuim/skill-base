<template>
  <!-- 页面内容 -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
    <header class="library-header">
      <div>
        <h1>{{ t('index.library') }}</h1>
        <p>{{ t('index.libraryHint') }}</p>
      </div>
      <div class="library-search">
        <Search :size="18" aria-hidden="true" />
        <input type="search" id="searchInput" :placeholder="searchPlaceholder" :aria-label="t('index.searchLabel')" autocomplete="off" v-model="searchQuery" />
        <button v-if="searchQuery" type="button" :aria-label="t('index.clearSearch')" @click="clearSearch"><X :size="16" /></button>
      </div>
    </header>

    <!-- 面包屑与过滤器 -->
    <div v-if="skillsStore.skills.length > 0" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="library-result-count">{{ t('index.resultCount', { count: filteredSkills.length }) }}</div>
      <div class="home-filter-actions">
        <button
          type="button"
          class="filter-chip"
          :class="{ 'filter-chip--active': onlyFavorites }"
          @click="onlyFavorites = !onlyFavorites"
        >
          <Heart :size="14" :stroke-width="2" aria-hidden="true" />
          {{ t('index.favoriteOnly') }}
        </button>

        <SkillViewModeToggle v-model="viewMode" />

        <div
          v-if="!isLoading && availableTags.length > 0"
          class="tag-filter-dropdown"
          :class="{ 'tag-filter-dropdown--open': showTagDropdown }"
        >
          <button
            type="button"
            class="filter-chip tag-filter-trigger"
            :class="{ 'filter-chip--active': selectedTagIds.length > 0 }"
            :aria-expanded="showTagDropdown"
            aria-haspopup="listbox"
            @click.stop="toggleTagDropdown"
          >
            <Tags :size="14" :stroke-width="2" aria-hidden="true" />
            {{ t('index.tagsFilter') }}
            <span v-if="selectedTagIds.length > 0" class="tag-filter-badge">{{ selectedTagIds.length }}</span>
            <ChevronDown class="tag-filter-chevron" :size="14" :stroke-width="2.5" aria-hidden="true" />
          </button>
          <div
            v-show="showTagDropdown"
            class="tag-filter-panel"
            role="listbox"
            aria-multiselectable="true"
            @click.stop
          >
            <div class="tag-filter-panel-header">
              <p class="tag-filter-hint">{{ t('index.tagsFilterHint') }}</p>
              <button
                v-if="selectedTagIds.length > 0"
                type="button"
                class="tag-filter-clear"
                :title="t('index.clearTags')"
                @click="clearTagFilter"
              >
                <X class="tag-filter-clear-icon" :size="12" :stroke-width="2" aria-hidden="true" />
                <span>{{ t('index.clearTags') }}</span>
              </button>
            </div>
            <div class="tag-filter-options">
              <button
                v-for="tag in availableTags"
                :key="tag.id"
                type="button"
                class="tag-filter-option"
                :class="{ 'tag-filter-option--active': isTagSelected(tag.id) }"
                role="option"
                :aria-selected="isTagSelected(tag.id)"
                @click="toggleTag(tag.id)"
              >
                <span class="tag-filter-option-check" aria-hidden="true">
                  <Check v-if="isTagSelected(tag.id)" :size="14" :stroke-width="2.5" />
                </span>
                <span class="tag-filter-option-label">{{ tag.name }}</span>
                <span class="tag-filter-option-count">{{ tagSkillCounts.get(tag.id) ?? 0 }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Skill 列表 -->
    <div id="skill-list" class="pb-16">
      <SkillListDisplay
        :skills="filteredSkills"
        :view-mode="viewMode"
        :is-loading="isLoading"
        :empty-text="emptyListText"
        :skeleton-count="viewMode === 'list' ? 8 : 6"
      >
        <template #empty>
          <div class="empty-state-icon">📦</div>
          <p v-if="searchQuery" class="empty-state-text">{{ t('index.noResults', { q: searchQuery }) }}</p>
          <p v-else-if="skillsStore.skills.length > 0" class="empty-state-text">{{ activeFilterEmptyText }}</p>
          <template v-else>
            <p class="empty-state-text">{{ t('index.noSkills') }}</p>
            <router-link to="/publish" class="btn btn-primary mt-6">
              <Plus class="mr-1" :size="18" :stroke-width="2.5" aria-hidden="true" />
              {{ t('index.publishBtn') }}
            </router-link>
          </template>
        </template>
      </SkillListDisplay>
    </div>
  </main>

</template>

<script setup lang="ts">
import { X, Search, Heart, Plus, Tags, ChevronDown, Check } from 'lucide-vue-next'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSkillsStore } from '@/stores/skills'
import { useI18n } from '@/composables/useI18n'
import { useSkillViewMode } from '@/composables/useSkillViewMode'
import { useHomeTagFilter } from '@/composables/useHomeTagFilter'
import SkillListDisplay from '@/components/SkillListDisplay.vue'
import SkillViewModeToggle from '@/components/SkillViewModeToggle.vue'
import { type Tag } from '@/services/api'

const skillsStore = useSkillsStore()
const { t } = useI18n()
const { viewMode } = useSkillViewMode()
const { selectedTagIds, pruneToAvailable } = useHomeTagFilter()
const searchQuery = ref('')
const onlyFavorites = ref(false)
const showTagDropdown = ref(false)
const isLoading = ref(true)

/** 当前列表中出现的标签（与可见 Skill 一致，不额外请求 /tags） */
const availableTags = computed(() => {
  const map = new Map<number, Tag>()
  for (const skill of skillsStore.skills) {
    for (const tag of skill.tags || []) {
      if (!map.has(tag.id)) {
        map.set(tag.id, tag)
      }
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
})

/** 各标签在当前可见 Skill 列表中的出现次数 */
const tagSkillCounts = computed(() => {
  const counts = new Map<number, number>()
  for (const skill of skillsStore.skills) {
    for (const tag of skill.tags || []) {
      counts.set(tag.id, (counts.get(tag.id) ?? 0) + 1)
    }
  }
  return counts
})

const searchPlaceholder = computed(() =>
  t('index.searchPlaceholder', { count: skillsStore.skills.length })
)

const activeFilterEmptyText = computed(() => {
  if (selectedTagIds.value.length > 0) return t('index.noTagMatch')
  if (onlyFavorites.value) return t('index.noFavoriteMatch')
  return t('index.noFilterMatch')
})

const emptyListText = computed(() => {
  if (searchQuery.value) return t('index.noResults', { q: searchQuery.value })
  if (skillsStore.skills.length > 0) return activeFilterEmptyText.value
  return t('index.noSkills')
})

const filteredSkills = computed(() => {
  let result = skillsStore.skills

  if (onlyFavorites.value) {
    result = result.filter(skill => skill.is_favorited)
  }

  const tagIds = selectedTagIds.value
  if (tagIds.length > 0) {
    const need = new Set(tagIds)
    result = result.filter((skill) => {
      const have = (skill.tags || []).map((t) => t.id)
      return have.some((id) => need.has(id))
    })
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(skill =>
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query)
    )
  }

  return result
})

function isTagSelected(id: number) {
  return selectedTagIds.value.includes(id)
}

function toggleTag(id: number) {
  const cur = selectedTagIds.value
  const i = cur.indexOf(id)
  if (i === -1) {
    selectedTagIds.value = [...cur, id]
  } else {
    selectedTagIds.value = cur.filter((x) => x !== id)
  }
}

function clearTagFilter() {
  selectedTagIds.value = []
}

function toggleTagDropdown() {
  showTagDropdown.value = !showTagDropdown.value
}

function closeTagDropdown() {
  showTagDropdown.value = false
}

function onDocumentClick() {
  closeTagDropdown()
}

function clearSearch() {
  searchQuery.value = ''
}

onMounted(async () => {
  document.addEventListener('click', onDocumentClick)
  await skillsStore.fetchSkills()
  pruneToAvailable(new Set(availableTags.value.map((tag) => tag.id)))
  isLoading.value = false
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
})
</script>

<style scoped>
.library-header { display: flex; align-items: center; justify-content: space-between; gap: 32px; margin: 12px 0 36px; }
.library-header h1 { font-size: 28px; font-weight: 650; color: var(--color-fg-strong); letter-spacing: -0.03em; }
.library-header p { margin-top: 8px; font-size: 13px; color: var(--color-base-400); }
.library-search { display: flex; align-items: center; gap: 12px; width: min(440px, 45%); padding: 12px 14px; border: 1px solid var(--color-base-800); border-radius: 8px; color: var(--color-base-400); background: var(--color-base-900); }
.library-search:focus-within { border-color: var(--color-neon-400); }
.library-search input { width: 100%; min-width: 0; background: transparent; border: 0; outline: none; font-size: 13px; color: var(--color-fg-strong); }
.library-search button { display: flex; cursor: pointer; }
.library-result-count { font-size: 13px; font-weight: 500; color: var(--color-base-400); }
@media (max-width: 639px) {
  .library-header { align-items: stretch; flex-direction: column; gap: 20px; margin-bottom: 24px; }
  .library-header h1 { font-size: 24px; }
  .library-search { width: 100%; }
}

.home-filter-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
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
  background: color-mix(in srgb, var(--color-fg-strong) 14%, transparent);
  color: var(--color-fg-strong);
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
  z-index: 50;
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

.tag-filter-options {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
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

.tag-filter-option:hover {
  background: color-mix(in srgb, var(--color-fg-strong) 6%, transparent);
  color: var(--color-fg-strong);
}

.tag-filter-option--active {
  background: rgba(var(--color-neon-rgb), 0.08);
  color: var(--color-neon-400);
}

.tag-filter-option-check {
  width: 1rem;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-neon-400);
}

.tag-filter-option-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-filter-option-count {
  flex-shrink: 0;
  min-width: 1.25rem;
  padding: 0.05rem 0.35rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-fg-strong) 8%, transparent);
  color: var(--color-base-400);
  font-size: 0.625rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.tag-filter-option--active .tag-filter-option-count {
  background: rgba(var(--color-neon-rgb), 0.15);
  color: var(--color-neon-400);
}
</style>
