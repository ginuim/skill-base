<template>
  <span class="user-avatar" :class="sizeClass" :title="label">
    <img v-if="src" :src="src" alt="" class="user-avatar-img" loading="lazy" decoding="async" />
    <span v-else class="user-avatar-initial">{{ initial }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { avatarSrc } from '@/utils/avatar'

const props = withDefaults(defineProps<{
  avatar?: string | null
  name?: string | null
  username?: string | null
  sizeClass?: string
}>(), {
  sizeClass: 'w-8 h-8 text-xs',
})

const src = computed(() => avatarSrc(props.avatar))
const label = computed(() => props.name || props.username || '')
const initial = computed(() => (props.name || props.username || 'U').charAt(0).toUpperCase())
</script>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--color-neon-400) 18%, var(--color-base-950));
  color: var(--color-neon-400);
  font-weight: 600;
  line-height: 1;
}
.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.user-avatar-initial {
  user-select: none;
}
</style>
