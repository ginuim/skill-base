<template>
  <div :class="viewMode === 'list' ? 'skill-list' : 'skill-grid'">
    <template v-if="isLoading">
      <template v-if="viewMode === 'list'">
        <div v-for="i in skeletonCount" :key="i" class="skeleton-list-row">
          <div class="skeleton-list-index"></div>
          <div class="skeleton-list-main">
            <div class="skeleton-title"></div>
            <div class="skeleton-desc"></div>
          </div>
          <div class="skeleton-list-aside"></div>
        </div>
      </template>
      <template v-else>
        <div v-for="i in skeletonCount" :key="i" class="skeleton-card">
          <div class="skeleton-title"></div>
          <div class="skeleton-desc"></div>
          <div class="skeleton-desc-short"></div>
          <div class="skeleton-footer"></div>
        </div>
      </template>
    </template>

    <template v-else-if="skills.length === 0">
      <div class="empty-state" :class="{ 'empty-state--full': viewMode === 'card' }">
        <slot name="empty">
          <div class="empty-state-icon">📦</div>
          <p v-if="emptyText" class="empty-state-text">{{ emptyText }}</p>
        </slot>
      </div>
    </template>

    <template v-else-if="viewMode === 'list'">
      <div class="skill-list-heading" aria-hidden="true">
        <span>#</span><span>{{ t('index.skillColumn') }}</span>
        <div class="skill-list-aside"><span>{{ t('skill.contributors') }}</span><span>{{ t('index.downloadColumn') }}</span><span>{{ t('index.favoriteColumn') }}</span><span>{{ t('index.updatedColumn') }}</span></div>
      </div>
      <article v-for="(skill, index) in skills" :key="skill.id" class="skill-list-row">
        <span class="skill-list-index">{{ index + 1 }}</span>
        <router-link :to="`/skills/${skill.id}`" class="skill-list-main">
          <div class="skill-list-title-row">
            <h3 class="skill-list-name" :title="skill.name">{{ skill.name }}</h3>
            <span v-if="skill.visibility === 'private'" class="skill-visibility-badge">PRIVATE</span>
            <span v-for="tag in (skill.tags || []).slice(0, 2)" :key="tag.id" class="skill-list-tag">{{ tag.name }}</span>
          </div>
          <p class="skill-list-desc">{{ truncateDescription(skill.description, listDescMaxLen) }}</p>
        </router-link>
        <div class="skill-list-aside">
          <ContributorAvatars :people="skill.contributors || []" />
          <span class="skill-list-stat" :title="t('index.downloadCount')">
            <Download :size="13" :stroke-width="2" aria-hidden="true" />{{ skill.download_count ?? 0 }}
          </span>
          <span class="skill-list-stat" :class="{ 'skill-list-stat--favorited': skill.is_favorited }" :title="t('index.favorite')">
            <Heart :size="13" :stroke-width="2" aria-hidden="true" />{{ skill.favorite_count ?? 0 }}
          </span>
          <span class="skill-list-date">{{ formatDate(skill.updated_at, currentLang) }}</span>
        </div>
      </article>
    </template>

    <template v-else>
      <article
        v-for="skill in skills"
        :key="skill.id"
        class="skill-card"
      >
        <div class="skill-card-header">
          <h3 class="skill-card-name">
            <router-link :to="`/skills/${skill.id}`" class="skill-card-link" :title="skill.name">{{ skill.name }}</router-link>
          </h3>
          <span v-if="skill.visibility === 'private'" class="skill-visibility-badge">PRIVATE</span>
        </div>
        <p class="skill-card-desc">{{ truncateDescription(skill.description, cardDescMaxLen) }}</p>
        <div class="skill-card-footer">
          <ContributorAvatars :people="skill.contributors || []" />
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
            <span class="skill-card-date">{{ formatDate(skill.updated_at, currentLang) }}</span>
          </span>
        </div>
      </article>
    </template>
  </div>
</template>

<script setup lang="ts">
import ContributorAvatars from '@/components/ContributorAvatars.vue'
import { Download, Heart } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import { formatDate } from '@/utils/date'
import type { Skill } from '@/services/api'
import type { SkillViewMode } from '@/composables/useSkillViewMode'

withDefaults(defineProps<{
  skills: Skill[]
  viewMode: SkillViewMode
  isLoading?: boolean
  emptyText?: string
  skeletonCount?: number
  listDescMaxLen?: number
  cardDescMaxLen?: number
}>(), {
  isLoading: false,
  emptyText: '',
  skeletonCount: 6,
  listDescMaxLen: 100,
  cardDescMaxLen: 100,
})

const { t, currentLang } = useI18n()

function truncateDescription(desc: string | null | undefined, maxLen: number): string {
  if (!desc) return t('state.noDesc')
  const text = desc.replace(/\s+/g, ' ').trim()
  const chars = Array.from(text)
  return chars.length > maxLen ? chars.slice(0, maxLen).join('') + '…' : text
}
</script>

<style scoped>
.skeleton-card {
  background-color: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  padding: 1.25rem 1.5rem;
  border-radius: 0.75rem;
}

.skeleton-title,
.skeleton-desc,
.skeleton-desc-short,
.skeleton-footer {
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

.empty-state--full {
  grid-column: 1 / -1;
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

.skill-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  /* margin-top: 2rem; */
  border-top: 1px solid var(--color-base-800);
}

.skill-list-index {
  flex-shrink: 0;
  align-self: center;
  width: 2rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  font-variant-numeric: tabular-nums;
  color: var(--color-base-500);
  text-align: left;
}

.skill-list-row, .skill-list-heading {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 346px;
  align-items: center;
  gap: 16px;
  padding: 16px 12px;
  border-bottom: 1px solid var(--color-base-800);
}
.skill-list-heading { padding-block: 12px; font-size: 11px; color: var(--color-base-400); }
.skill-list-row { transition: background 0.15s ease; }
.skill-list-row:hover { background: color-mix(in srgb, var(--color-fg-strong) 2%, transparent); }
.skill-list-main { min-width: 0; text-decoration: none; }
.skill-list-main:focus-visible { outline: 2px solid var(--color-neon-400); outline-offset: 4px; border-radius: 4px; }

.skill-list-row:last-child {
  border-bottom: none;
}

.skill-list-row:hover .skill-list-name {
  color: var(--color-neon-400);
}

.skill-list-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.skill-list-name {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-fg-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  transition: color 0.15s ease;
}

.skill-list-desc {
  max-width: 64ch;
  margin: 0;
  font-size: 0.8125rem;
  color: var(--color-base-400);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-list-tag {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: 0.1rem 0.4rem;
  border-radius: 9999px;
  border: 1px solid var(--color-base-800);
  background: color-mix(in srgb, var(--color-fg-strong) 4%, transparent);
  color: var(--color-base-400);
  font-size: 0.625rem;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.4;
}

.skill-list-aside {
  display: grid;
  grid-template-columns: 124px 60px 52px 80px;
  align-items: center;
  gap: 10px;
  font-size: 0.75rem;
  color: var(--color-base-400);
  font-variant-numeric: tabular-nums;
}
.skill-list-aside > :not(:first-child) { justify-self: end; }

.skill-list-owner,
.skill-list-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  white-space: nowrap;
}

.skill-list-stat--favorited {
  color: #ff75b5;
}

.skill-list-date {
  white-space: nowrap;
  color: var(--color-base-500);
}

.skeleton-list-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 0;
  border-bottom: 1px solid var(--color-base-800);
}

.skeleton-list-index {
  flex-shrink: 0;
  width: 2rem;
  height: 0.75rem;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-base-900) 25%,
    var(--color-base-700) 50%,
    var(--color-base-900) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

.skeleton-list-main {
  flex: 1;
  min-width: 0;
}

.skeleton-list-aside {
  width: 8rem;
  height: 0.75rem;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--color-base-900) 25%,
    var(--color-base-700) 50%,
    var(--color-base-900) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@media (max-width: 900px) {
  .skill-list-row, .skill-list-heading { grid-template-columns: 24px minmax(0, 1fr) 260px; gap: 12px; }
  .skill-list-aside { grid-template-columns: 116px 58px 62px; gap: 12px; }
  .skill-list-aside > :last-child { display: none; }
  .skill-list-tag { display: none; }
}
@media (max-width: 639px) {
  .skill-list-heading { display: none; }
  .skill-list-row { grid-template-columns: 20px minmax(0, 1fr); gap: 8px 10px; padding: 14px 0; }
  .skill-list-index { align-self: start; padding-top: 2px; width: auto; }
  .skill-list-aside { grid-column: 2; grid-template-columns: minmax(100px, 1fr) 55px 50px; width: 100%; }
  .skill-list-name { font-size: 14px; }
  .skill-list-desc { font-size: 12px; }
}
</style>
