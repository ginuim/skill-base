<template>
  <main class="profile-page max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <router-link to="/" class="profile-back"><ArrowLeft :size="15" />{{ t('profile.back') }}</router-link>
    <div v-if="loading" class="profile-message" role="status">{{ t('nav.collectionLoading') }}</div>
    <div v-else-if="error" class="profile-message" role="alert">
      <h1>{{ t(error === 'not-found' ? 'profile.notFound' : 'profile.loadError') }}</h1>
      <button v-if="error !== 'not-found'" class="btn-primary" @click="loadProfile">{{ t('profile.retry') }}</button>
    </div>
    <template v-else-if="profile">
      <header class="profile-header">
        <UserAvatar :avatar="profile.user.avatar" :name="profile.user.name" :username="profile.user.username" size-class="w-20 h-20 text-2xl" />
        <div class="profile-identity">
          <p class="profile-eyebrow">{{ t('profile.title') }}</p>
          <h1>{{ profile.user.name || profile.user.username }}</h1>
          <p>@{{ profile.user.username }} <span>· {{ t('profile.joined', { date: joinedDate }) }}</span></p>
        </div>
        <router-link v-if="auth.user?.id === profile.user.id" to="/publish" class="btn-primary profile-publish"><Plus :size="16" />{{ t('nav.publish') }}</router-link>
      </header>
      <div class="profile-stats">
        <div><strong>{{ profile.stats.skill_count }}</strong><span>{{ t('profile.skills') }}</span></div>
        <div><strong>{{ profile.stats.version_count }}</strong><span>{{ t('profile.versions') }}</span></div>
        <div><strong>{{ profile.stats.download_count.toLocaleString() }}</strong><span>{{ t('profile.downloads') }}</span></div>
      </div>
      <p class="profile-scope">{{ t('profile.scope') }}</p>
      <div class="profile-toolbar">
        <h2>{{ t('profile.skills') }} <span>{{ profile.stats.skill_count }}</span></h2>
        <label class="profile-search"><Search :size="16" /><input v-model="query" type="search" :placeholder="t('profile.search')" :aria-label="t('profile.search')" /></label>
      </div>
      <SkillListDisplay :skills="filteredSkills" view-mode="list">
        <template #empty>
          <p>{{ query ? t('index.noResults', { q: query }) : t('profile.empty') }}</p>
          <p v-if="!query" class="profile-empty-hint">{{ t('profile.emptyHint') }}</p>
        </template>
      </SkillListDisplay>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Search, Plus } from 'lucide-vue-next'
import UserAvatar from '@/components/UserAvatar.vue'
import SkillListDisplay from '@/components/SkillListDisplay.vue'
import { profilesApi, type UserProfile, type ApiError } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const auth = useAuthStore()
const { t, currentLang } = useI18n()
const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const error = ref('')
const query = ref('')
let generation = 0
async function loadProfile() {
  const request = ++generation
  profile.value = null
  loading.value = true
  error.value = ''
  query.value = ''
  try {
    const result = await profilesApi.get(String(route.params.id))
    if (request === generation) profile.value = result
  } catch (cause) {
    if (request === generation) error.value = (cause as ApiError).status === 404 ? 'not-found' : 'failed'
  } finally {
    if (request === generation) loading.value = false
  }
}
watch(() => [route.params.id, auth.user?.id], loadProfile, { immediate: true })
onBeforeUnmount(() => { generation++ })
const filteredSkills = computed(() => {
  const term = query.value.trim().toLocaleLowerCase()
  return (profile.value?.skills || []).filter(skill => `${skill.name} ${skill.description || ''}`.toLocaleLowerCase().includes(term))
})
const joinedDate = computed(() => {
  const raw = profile.value?.user.created_at?.slice(0, 10)
  if (!raw) return ''
  return new Date(`${raw}T00:00:00`).toLocaleDateString(currentLang.value === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: 'short' })
})
</script>

<style scoped>
.profile-page { padding-top: 28px; padding-bottom: 64px; }
.profile-back { display: inline-flex; align-items: center; gap: 8px; color: var(--color-base-400); font-size: 13px; text-decoration: none; }
.profile-back:hover { color: var(--color-neon-400); }
.profile-header { display: flex; align-items: center; gap: 24px; margin: 36px 0 32px; }
.profile-identity { min-width: 0; }
.profile-eyebrow { color: var(--color-neon-400); font-size: 12px; margin-bottom: 6px; }
.profile-identity h1 { font-size: 30px; line-height: 1.25; font-weight: 650; color: var(--color-fg-strong); margin-bottom: 8px; overflow-wrap: anywhere; }
.profile-identity > p:last-child { font-size: 13px; color: var(--color-base-400); overflow-wrap: anywhere; }
.profile-publish { margin-left: auto; display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 8px; flex-shrink: 0; }
.profile-stats { display: flex; padding: 24px 0; border-top: 1px solid var(--color-base-800); border-bottom: 1px solid var(--color-base-800); }
.profile-stats > div { display: flex; flex-direction: column; gap: 6px; padding: 0 36px; border-left: 1px solid var(--color-base-800); }
.profile-stats > div:first-child { padding-left: 0; border: 0; }
.profile-stats strong { font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--color-fg-strong); }
.profile-stats span, .profile-scope { font-size: 12px; color: var(--color-base-400); }
.profile-scope { margin: 12px 0 36px; }
.profile-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
.profile-toolbar h2 { font-size: 17px; font-weight: 600; }
.profile-toolbar h2 span { margin-left: 8px; font-size: 12px; color: var(--color-base-400); }
.profile-search { display: flex; align-items: center; gap: 10px; border: 1px solid var(--color-base-800); border-radius: 8px; padding: 10px 12px; color: var(--color-base-400); }
.profile-search:focus-within { border-color: var(--color-neon-400); }
.profile-search input { width: 220px; background: transparent; outline: none; color: var(--color-fg-strong); font-size: 13px; }
.profile-message { padding: 80px 16px; text-align: center; }
.profile-message button { margin-top: 20px; padding: 10px 20px; border-radius: 8px; }
.profile-empty-hint { font-size: 13px; margin-top: 10px; }
@media (max-width: 639px) {
  .profile-header { flex-wrap: wrap; gap: 16px; margin-top: 28px; }
  .profile-identity { flex: 1; }
  .profile-identity h1 { font-size: 24px; }
  .profile-identity > p:last-child span { display: block; margin-top: 4px; }
  .profile-publish { margin-left: 0; }
  .profile-stats > div { flex: 1; padding: 0 12px; }
  .profile-stats strong { font-size: 24px; }
  .profile-stats span { font-size: 11px; }
  .profile-toolbar { align-items: stretch; flex-direction: column; }
  .profile-search input { width: 100%; min-width: 0; }
}
</style>
