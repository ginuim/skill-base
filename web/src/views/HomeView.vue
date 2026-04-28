<template>
  <!-- 页面内容 -->
  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
    <!-- 页面标题区域 -->
    <div class="page-header mb-8 text-center">
      <div class="inline-flex items-center justify-center gap-2 px-3 py-1 bg-base-900 border border-base-800 rounded-full mb-6 text-xs font-mono text-neon-400">
        <span class="w-2 h-2 rounded-full bg-neon-400 animate-pulse"></span>
        Skill Directory
      </div>

      <div class="search-bar">
        <div class="search-icon-wrapper">
          <span>$</span>
          <span>grep</span>
        </div>
        <input
          type="search"
          id="searchInput"
          :placeholder="`&quot;${t('index.searchPlaceholder')}&quot;`"
          autocomplete="off"
          v-model="searchQuery"
        >
        <button type="button" class="clear-btn" id="clearSearch" @click="clearSearch">
          <X :size="16" :stroke-width="2" aria-hidden="true" />
        </button>
      </div>
    </div>

    <!-- 面包屑与过滤器 -->
    <div v-if="skillsStore.skills.length > 0" class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div class="text-sm text-base-400 font-mono flex items-center gap-2">
        <span class="text-neon-400">~</span>
        <span class="opacity-50">/</span>
        <span class="text-fg-strong">skills</span>
        <span class="opacity-50 ml-2">ls -la</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          type="button"
          class="filter-chip"
          :class="{ 'filter-chip--active': onlyFavorites }"
          @click="onlyFavorites = !onlyFavorites"
        >
          <Heart :size="14" :stroke-width="2" aria-hidden="true" />
          {{ t('index.favoriteOnly') }}
        </button>
      </div>
    </div>

    <!-- Skill 列表 -->
    <div id="skill-list" class="skill-grid pb-16">
      <!-- 加载状态 -->
      <template v-if="isLoading">
        <div v-for="i in 6" :key="i" class="skeleton-card">
          <div class="skeleton-title"></div>
          <div class="skeleton-desc"></div>
          <div class="skeleton-desc-short"></div>
          <div class="skeleton-footer"></div>
        </div>
      </template>

      <!-- 空状态 -->
      <template v-else-if="!filteredSkills || filteredSkills.length === 0">
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">📦</div>
          <p v-if="searchQuery" class="empty-state-text">{{ t('index.noResults', { q: searchQuery }) }}</p>
          <template v-else>
            <p class="empty-state-text">{{ t('index.noSkills') }}</p>
            <router-link to="/publish" class="btn btn-primary mt-6">
              <Plus class="mr-1" :size="18" :stroke-width="2.5" aria-hidden="true" />
              {{ t('index.publishBtn') }}
            </router-link>
          </template>
        </div>
      </template>

      <!-- Skill 卡片 -->
      <template v-else>
        <router-link
          v-for="skill in filteredSkills"
          :key="skill.id"
          :to="`/skills/${skill.id}`"
          class="skill-card"
        >
          <div class="skill-card-header">
            <h3 class="skill-card-name">{{ skill.name }}</h3>
            <span v-if="skill.visibility === 'private'" class="skill-visibility-badge">PRIVATE</span>
          </div>
          <p class="skill-card-desc">{{ truncateDescription(skill.description) }}</p>
          <div class="skill-card-footer">
            <div class="skill-card-meta">
              <span class="skill-card-owner">
                <User :size="14" :stroke-width="2" aria-hidden="true" />
                {{ skill.owner?.name || skill.owner?.username || t('state.unknown') }}
              </span>
              <span class="skill-card-stats">
                <span class="skill-card-stat" :title="t('index.downloadCount')">
                  <Download :size="14" :stroke-width="2" aria-hidden="true" />
                  {{ skill.download_count ?? 0 }}
                </span>
                <span
                  class="skill-card-stat"
                  :title="skill.is_favorited ? t('index.favorited') : t('index.favorite')"
                >
                  <span :class="{ 'skill-card-stat--favorited': skill.is_favorited }">
                    <Heart :size="14" :stroke-width="2" aria-hidden="true" />
                  </span>
                  {{ skill.favorite_count ?? 0 }}
                </span>
              </span>
            </div>
            <span>{{ formatDate(skill.updated_at, currentLang) }}</span>
          </div>
        </router-link>
      </template>
    </div>
  </main>

  <!-- 浮动发布按钮 -->
  <router-link to="/publish" class="fab" :title="t('index.fabTitle')">
    <Plus :size="24" :stroke-width="2" aria-hidden="true" />
  </router-link>
</template>

<script setup lang="ts">
import { X, Heart, Plus, User, Download } from 'lucide-vue-next'
import { ref, computed, onMounted } from 'vue'
import { useSkillsStore } from '@/stores/skills'
import { useI18n } from '@/composables/useI18n'
import { formatDate } from '@/utils/date'

const skillsStore = useSkillsStore()
const { t, currentLang } = useI18n()
const searchQuery = ref('')
const onlyFavorites = ref(false)
const isLoading = ref(true)

const filteredSkills = computed(() => {
  let result = skillsStore.skills

  if (onlyFavorites.value) {
    result = result.filter(skill => skill.is_favorited)
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

function clearSearch() {
  searchQuery.value = ''
}

function truncateDescription(desc: string | null | undefined): string {
  if (!desc) return t('state.noDesc')
  if (desc.length > 100) {
    return desc.substring(0, 100) + '...'
  }
  return desc
}

onMounted(async () => {
  await skillsStore.fetchSkills()
  isLoading.value = false
})
</script>

<style scoped>
/* 骨架屏样式（随 html[data-theme] 变量切换） */
.skeleton-card {
  background-color: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  padding: 1.5rem;
  border-radius: 0.75rem;
}
.skeleton-title, .skeleton-desc, .skeleton-desc-short, .skeleton-footer {
  background: linear-gradient(
    90deg,
    var(--color-base-900) 25%,
    var(--color-base-700) 50%,
    var(--color-base-900) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
  height: 1rem;
}
.skeleton-title { width: 75%; margin-bottom: 1rem; height: 1.25rem; }
.skeleton-desc { width: 100%; margin-bottom: 0.5rem; }
.skeleton-desc-short { width: 85%; margin-bottom: 1.5rem; }
.skeleton-footer { width: 100%; margin-top: auto; }

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* 空状态 */
.empty-state {
  padding: 4rem 1rem;
  text-align: center;
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
}
.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}
.empty-state-text {
  color: var(--color-base-400);
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.skill-visibility-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 9999px;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.625rem;
  line-height: 1;
  padding: 0.3rem 0.5rem;
  color: #fcd34d;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.3);
  letter-spacing: 0.04em;
}
</style>
