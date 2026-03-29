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
          placeholder="&quot;search skill...&quot;"
          autocomplete="off"
          v-model="searchQuery"
        >
        <button type="button" class="clear-btn" id="clearSearch" @click="clearSearch">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- 面包屑 -->
    <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
      <span class="text-neon-400">~</span>
      <span class="opacity-50">/</span>
      <span class="text-white">skills</span>
      <span class="opacity-50 ml-2">ls -la</span>
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
          <p v-if="searchQuery" class="empty-state-text">未找到包含 "{{ searchQuery }}" 的 Skill</p>
          <template v-else>
            <p class="empty-state-text">暂无 Skill，去发布第一个吧</p>
            <router-link to="/publish" class="btn btn-primary">发布 Skill</router-link>
          </template>
        </div>
      </template>

      <!-- Skill 卡片 -->
      <template v-else>
        <router-link
          v-for="skill in filteredSkills"
          :key="skill.id"
          :to="{ path: '/skill', query: { id: skill.id } }"
          class="skill-card"
        >
          <div class="skill-card-header">
            <h3 class="skill-card-name">{{ skill.name }}</h3>
          </div>
          <p class="skill-card-desc">{{ truncateDescription(skill.description) }}</p>
          <div class="skill-card-footer">
            <div class="skill-card-meta">
              <span class="skill-card-owner">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {{ skill.owner?.name || skill.owner?.username || '未知' }}
              </span>
            </div>
            <span>{{ formatDate(skill.updated_at) }}</span>
          </div>
        </router-link>
      </template>
    </div>
  </main>

  <!-- 浮动发布按钮 -->
  <router-link to="/publish" class="fab" title="发布新版本">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  </router-link>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSkillsStore } from '@/stores/skills'

const skillsStore = useSkillsStore()
const searchQuery = ref('')
const isLoading = ref(true)

const filteredSkills = computed(() => {
  if (!searchQuery.value) {
    return skillsStore.skills
  }
  const query = searchQuery.value.toLowerCase()
  return skillsStore.skills.filter(skill =>
    skill.name.toLowerCase().includes(query) ||
    skill.description.toLowerCase().includes(query)
  )
})

function clearSearch() {
  searchQuery.value = ''
}

function truncateDescription(desc: string | null | undefined): string {
  if (!desc) return '暂无描述'
  if (desc.length > 100) {
    return desc.substring(0, 100) + '...'
  }
  return desc
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`
  return `${Math.floor(diffDays / 365)} 年前`
}

onMounted(async () => {
  await skillsStore.fetchSkills()
  isLoading.value = false
})
</script>

<style scoped>
/* 骨架屏样式 */
.skeleton-card {
  background-color: #13141a;
  border: 1px solid #27272a;
  padding: 1.5rem;
  border-radius: 0.75rem;
}
.skeleton-title, .skeleton-desc, .skeleton-desc-short, .skeleton-footer {
  background: linear-gradient(90deg, #13141a 25%, #27272a 50%, #13141a 75%);
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
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
}
.empty-state-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}
.empty-state-text {
  color: #a1a1aa;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}
</style>
