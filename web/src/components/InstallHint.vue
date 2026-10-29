<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ text: string }>()
const parts = computed(() => props.text.split(/\b(skb)\b/g))
</script>

<template>
  <p>
    <template v-for="(part, index) in parts" :key="index">
      <a v-if="part === 'skb'" href="https://www.npmjs.com/package/skill-base-cli" target="_blank" rel="noopener noreferrer">skb</a>
      <template v-else>{{ part }}</template>
    </template>
  </p>
</template>

<style scoped>
a { color: inherit; text-decoration: underline; text-underline-offset: 3px; }
a:hover { color: var(--color-fg-strong); }
</style>
