<template>
  <div v-if="people.length" class="contributor-avatars" role="group" :aria-label="t('skill.contributors')">
    <router-link v-for="person in people.slice(0, max)" :key="person.id"
      :to="`/users/${person.id}`" class="contributor-link"
      :aria-label="t('profile.visit', { name: person.name || person.username })">
      <UserAvatar :avatar="person.avatar" :name="person.name" :username="person.username" size-class="w-8 h-8 text-xs" />
    </router-link>
    <details v-if="people.length > max" class="contributor-more" @keydown.esc="closeMore">
      <summary :aria-label="t('profile.moreContributors', { count: people.length - max })" :title="t('profile.moreContributors', { count: people.length - max })">+{{ people.length - max }}</summary>
      <div class="contributor-menu">
        <p>{{ t('skill.contributors') }}</p>
        <router-link v-for="person in people.slice(max)" :key="person.id" :to="`/users/${person.id}`" @click="closeMore">
          <UserAvatar :avatar="person.avatar" :name="person.name" :username="person.username" size-class="w-8 h-8 text-xs" />
          <span>{{ person.name || person.username }}</span>
        </router-link>
      </div>
    </details>
  </div>
  <span v-else class="contributor-empty" :title="t('profile.noContributors')">—</span>
</template>

<script setup lang="ts">
import UserAvatar from '@/components/UserAvatar.vue'
import { useI18n } from '@/composables/useI18n'
import type { SkillContributor } from '@/services/api'

withDefaults(defineProps<{ people: SkillContributor[]; max?: number }>(), { max: 3 })
const { t } = useI18n()
function closeMore(event: Event) {
  const details = (event.target as HTMLElement).closest('details')
  if (details) details.open = false
}
</script>

<style scoped>
.contributor-avatars { position: relative; display: flex; align-items: center; padding-left: 6px; isolation: isolate; }
.contributor-link, .contributor-more summary { display: inline-flex; border: 2px solid var(--color-base-950); border-radius: 50%; margin-left: -6px; flex-shrink: 0; background: var(--color-base-950); }
.contributor-link:hover, .contributor-link:focus-visible { z-index: 2; outline: 2px solid var(--color-neon-400); outline-offset: 1px; }
.contributor-avatars:has(details[open]) { z-index: 5; }
.contributor-more[open] { z-index: 5; }
.contributor-more summary { width: 36px; height: 36px; align-items: center; justify-content: center; background: var(--color-base-900); color: var(--color-fg-strong); font-size: 11px; font-weight: 600; cursor: pointer; list-style: none; }
.contributor-more summary::-webkit-details-marker { display: none; }
.contributor-menu { position: absolute; left: 0; top: calc(100% + 8px); width: min(220px, calc(100vw - 64px)); max-height: 280px; overflow-y: auto; padding: 8px; background: var(--color-base-950); border: 1px solid var(--color-base-800); border-radius: 12px; box-shadow: 0 8px 24px #0002; }
.contributor-menu p { padding: 6px 8px; font-size: 12px; color: var(--color-base-400); }
.contributor-menu a { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 6px; color: var(--color-fg-strong); font-size: 13px; text-decoration: none; }
.contributor-menu a:hover { background: var(--color-base-900); }
.contributor-menu a span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.contributor-empty { color: var(--color-base-500); }
</style>
