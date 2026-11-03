<template>
  <main class="collection-detail-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
    <router-link to="/collections" class="collection-back-link">
      <ChevronLeft :size="16" :stroke-width="2" aria-hidden="true" />
      <span>{{ t('collections.backToList') }}</span>
    </router-link>

    <div v-if="isLoading" class="collection-detail-state">{{ t('nav.collectionLoading') }}</div>

    <div v-else-if="!collection" class="collection-detail-error">
      <div class="collection-detail-error-icon">
        <Frown :size="40" :stroke-width="1.5" aria-hidden="true" />
      </div>
      <template v-if="showSessionExpired">
        <h2 class="collection-detail-error-title">{{ t('collections.sessionExpired') }}</h2>
        <p class="collection-detail-error-desc">{{ t('collections.sessionExpiredDesc') }}</p>
        <router-link :to="loginRedirect" class="btn-primary px-6 py-3 rounded-lg">
          {{ t('nav.login') }}
        </router-link>
      </template>
      <template v-else-if="showNotFound">
        <h2 class="collection-detail-error-title">{{ t('collections.notFound') }}</h2>
        <p class="collection-detail-error-desc">{{ t('collections.notFoundDesc') }}</p>
        <router-link to="/collections" class="btn-primary px-6 py-3 rounded-lg">
          {{ t('collections.backToList') }}
        </router-link>
      </template>
      <template v-else>
        <h2 class="collection-detail-error-title">{{ t('collections.loadError') }}</h2>
        <p class="collection-detail-error-desc">{{ error || t('collections.loadErrorDesc') }}</p>
        <div class="collection-detail-error-actions">
          <button type="button" class="btn-primary px-6 py-3 rounded-lg" @click="loadDetail">
            {{ t('collections.retry') }}
          </button>
          <router-link to="/collections" class="btn-secondary px-6 py-3 rounded-lg">
            {{ t('collections.backToList') }}
          </router-link>
        </div>
      </template>
    </div>

    <template v-else>
      <section class="collection-hero">
        <div class="collection-hero-cover">
          <CollectionBookCover
            :collection="collection"
            :skill-count="skills.length"
            size="lg"
            interactive
          />
        </div>

        <div class="collection-hero-info">
          <h1 class="collection-detail-title">{{ collection.name }}</h1>
          <p class="collection-detail-desc">{{ collection.description || t('state.noDesc') }}</p>

          <dl class="collection-meta">
            <div v-if="creatorLabel" class="collection-meta-row">
              <dt>{{ t('collections.creator') }}</dt>
              <dd>{{ creatorLabel }}</dd>
            </div>
            <div v-if="collection.created_at" class="collection-meta-row">
              <dt>{{ t('collections.createdAt') }}</dt>
              <dd :title="formatDateFull(collection.created_at)">{{ formatDate(collection.created_at, currentLang) }}</dd>
            </div>
            <div class="collection-meta-row">
              <dt>{{ t('collections.skillCount') }}</dt>
              <dd>{{ t('index.skillsCount', { count: skills.length }) }}</dd>
            </div>
            <div class="collection-meta-row">
              <dt>{{ t('collections.downloadCount') }}</dt>
              <dd>{{ collection.download_count ?? 0 }}</dd>
            </div>
          </dl>

          <div class="collection-install-section">
            <div class="collection-install-methods" role="group" :aria-label="t('skill.installTitle')">
              <button v-for="method in installMethods" :key="method" type="button"
                :aria-pressed="installMethod === method" :class="{ 'is-selected': installMethod === method }"
                @click="installMethod = method">{{ t(`skill.${method}Method`) }}</button>
            </div>
            <InstallHint class="collection-install-hint" :text="t(installMethod === 'cli' ? 'collections.installHint' : `skill.${installMethod}Hint`)" />
            <div class="collection-install-actions">
              <CollectionInstallBar v-if="installMethod === 'cli'" :collection-slug="collection.slug" />
              <div v-else-if="installMethod === 'agent'" class="collection-agent-install">
                <pre tabindex="0">{{ agentInstallPrompt }}</pre>
                <button type="button" class="collection-install-copy" @click="copyAgentPrompt">
                  <Copy :size="14" aria-hidden="true" />{{ t('skill.copyPrompt') }}
                </button>
              </div>
              <button
                type="button"
                v-if="installMethod === 'download'"
                class="collection-download-btn"
                :title="t('collections.downloadAll')"
                :disabled="isDownloading"
                @click="downloadAllSkills"
              >
                <Download :size="14" :stroke-width="2" aria-hidden="true" />
                {{ t('collections.downloadAll') }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="collection-skills-section">
        <div class="collection-skills-toolbar">
          <h2 class="collection-skills-heading">
            {{ t('nav.collectionSkills') }}
            <span class="collection-skills-count">({{ skills.length }})</span>
          </h2>
          <SkillViewModeToggle v-model="viewMode" />
        </div>

        <SkillListDisplay
          :skills="skills"
          :view-mode="viewMode"
          :empty-text="t('nav.collectionEmptySkills')"
        />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronLeft, Copy, Download, Frown } from 'lucide-vue-next'
import InstallHint from '@/components/InstallHint.vue'
import { useI18n } from '@/composables/useI18n'
import { useSkillViewMode } from '@/composables/useSkillViewMode'
import { useAuthStore } from '@/stores/auth'
import CollectionBookCover from '@/components/CollectionBookCover.vue'
import CollectionInstallBar from '@/components/CollectionInstallBar.vue'
import SkillListDisplay from '@/components/SkillListDisplay.vue'
import SkillViewModeToggle from '@/components/SkillViewModeToggle.vue'
import { withBasePath } from '@/utils/basePath'
import { formatDate, formatDateFull } from '@/utils/date'
import { globalToast } from '@/composables/useToast'
import { collectionsApi, type ApiError, type Collection, type Skill } from '@/services/api'

const route = useRoute()
const authStore = useAuthStore()
const { t, currentLang } = useI18n()
const { viewMode } = useSkillViewMode()

const collection = ref<Collection | null>(null)
const skills = ref<Skill[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)
const errorStatus = ref<number | null>(null)
const errorCode = ref<string | null>(null)
const isDownloading = ref(false)
const installMethods = ['download', 'agent', 'cli'] as const
const installMethod = ref<typeof installMethods[number]>('download')

const agentInstallPrompt = computed(() => {
  if (!collection.value) return ''
  const page = new URL(withBasePath(`/collections/${collection.value.id}`), window.location.origin).href
  const zip = new URL(collectionsApi.downloadUrl(collection.value.slug), window.location.origin).href
  return `${t('collections.agentPrompt')}\n${page}\n\nZIP: ${zip}\n\n${t('collections.agentArchiveHint')}\n\n${t('skill.agentPromptEnd')}`
})

async function copyAgentPrompt() {
  try {
    await navigator.clipboard.writeText(agentInstallPrompt.value)
    globalToast.success(t('skill.copyInstallSuccess'))
  } catch {
    globalToast.error(t('collections.copyPromptError'))
  }
}

const loginRedirect = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))

const showSessionExpired = computed(() => {
  if (collection.value || isLoading.value) return false
  return errorStatus.value === 401 || errorCode.value === 'session_expired'
})

const showNotFound = computed(() => {
  if (collection.value || isLoading.value) return false
  if (showSessionExpired.value) return false
  return errorStatus.value === 404
})

const creatorLabel = computed(() => {
  const creator = collection.value?.created_by
  if (!creator) return ''
  return creator.name || creator.username || `#${creator.id}`
})

function parseCollectionId(): number | null {
  const raw = route.params.id
  const id = Number(Array.isArray(raw) ? raw[0] : raw)
  return Number.isInteger(id) && id > 0 ? id : null
}

function downloadAllSkills() {
  if (!collection.value) return

  const downloadable = skills.value.filter((skill) => skill.latest_version)
  if (downloadable.length === 0) {
    globalToast.warning(t('collections.downloadAllNone'))
    return
  }

  isDownloading.value = true
  const link = document.createElement('a')
  link.href = collectionsApi.downloadUrl(collection.value.slug)
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  isDownloading.value = false
}

async function loadDetail() {
  const id = parseCollectionId()
  if (id === null) {
    errorStatus.value = 404
    errorCode.value = null
    error.value = null
    isLoading.value = false
    return
  }

  isLoading.value = true
  error.value = null
  errorStatus.value = null
  errorCode.value = null
  collection.value = null
  skills.value = []

  await authStore.fetchUser()

  try {
    const res = await collectionsApi.get(id)
    collection.value = res.collection
    skills.value = res.skills || []
  } catch (err) {
    const apiErr = err as ApiError
    errorStatus.value = apiErr.status ?? null
    errorCode.value = apiErr.data?.error ?? null
    const isAuthError = errorStatus.value === 401 || errorCode.value === 'session_expired'
    const isMissing = errorStatus.value === 404
    error.value = isAuthError || isMissing ? null : (apiErr.message || t('collections.loadErrorDesc'))
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDetail)
watch(() => route.params.id, loadDetail)
</script>

<style scoped>
.collection-install-methods { display: flex; border-bottom: 1px solid var(--color-base-800); margin-bottom: 10px; }
.collection-install-methods button { flex: 1; min-width: 0; white-space: nowrap; padding: 7px; font-size: 12px; color: var(--color-base-400); cursor: pointer; border-bottom: 2px solid transparent; }
.collection-install-methods .is-selected { color: var(--color-fg-strong); border-bottom-color: var(--color-fg-strong); }
.collection-agent-install { width: 100%; min-width: 0; overflow: hidden; }
.collection-agent-install pre { margin: 0; padding: 4px 0; height: 54px; max-height: 54px; box-sizing: border-box; overflow: auto; white-space: pre-wrap; overflow-wrap: anywhere; font-family: var(--font-mono); font-size: 11px; line-height: 1.7; }
.collection-install-copy { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; padding: 5px 0; border-top: 1px solid var(--color-base-800); color: var(--color-fg-strong); font-size: 12px; cursor: pointer; }

.collection-back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: var(--color-base-400);
  text-decoration: none;
  transition: color 0.15s ease;
}

.collection-back-link:hover {
  color: var(--color-neon-400);
}

.collection-detail-state {
  padding: 3rem 1rem;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: var(--color-base-400);
}

.collection-detail-error {
  padding: 4rem 1rem;
  text-align: center;
}

.collection-detail-error-icon {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1.5rem;
  border-radius: 9999px;
  background: var(--color-base-800);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-base-500);
}

.collection-detail-error-title {
  margin: 0 0 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-fg-strong);
}

.collection-detail-error-desc {
  margin: 0 auto 1.5rem;
  max-width: 28rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-base-400);
}

.collection-detail-error-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
}

.collection-hero {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

@media (min-width: 768px) {
  .collection-hero {
    flex-direction: row;
    align-items: flex-start;
    gap: 2.5rem;
  }
}

.collection-hero-cover {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .collection-hero-cover {
    justify-content: flex-start;
  }
}

.collection-hero-info {
  flex: 1;
  min-width: 0;
}

.collection-detail-title {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 650;
  letter-spacing: -0.03em;
  color: var(--color-fg-strong);
}

.collection-detail-desc {
  margin: 0 0 0.75rem;
  font-size: 0.9375rem;
  color: var(--color-base-300);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.collection-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.75rem;
  margin: 0 0 0.875rem;
  font-size: 0.8125rem;
}

.collection-meta-row {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.collection-meta-row dt {
  margin: 0;
  color: var(--color-base-500);
}

.collection-meta-row dt::after {
  content: ':';
}

.collection-meta-row dd {
  margin: 0;
  color: var(--color-base-300);
}

.collection-install-section {
  width: 100%;
  max-width: 580px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.collection-install-hint {
  margin: 0 0 0.25rem;
  font-size: 0.8125rem;
  color: var(--color-base-500);
}

.collection-install-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
}

.collection-download-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
  padding: 0.35rem 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  color: var(--color-neon-400);
  background: transparent;
  border: 1px solid var(--color-neon-500);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: background 0.15s ease;
}

.collection-download-btn:hover:not(:disabled) {
  background: rgba(var(--color-neon-rgb), 0.1);
}

.collection-download-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.collection-skills-section {
  padding-top: 0.5rem;
  /* border-top: 1px solid var(--color-base-800); */
}

.collection-skills-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.collection-skills-heading {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-fg-strong);
}

.collection-skills-count {
  color: var(--color-base-500);
  font-weight: 400;
}
</style>
