<template>
  <span class="skill-base-brand"><Package :size="24" :stroke-width="1.8" aria-hidden="true" /><span><span class="brand-skill">Skill</span> Base</span></span>
</template>
<script setup lang="ts">
import { Package } from 'lucide-vue-next'
</script>
<style scoped>
.skill-base-brand { display: inline-flex; align-items: center; gap: 10px; color: var(--color-fg-strong); font: 650 18px/1.4 var(--font-sans); letter-spacing: -.025em; white-space: nowrap; }
.skill-base-brand svg, .brand-skill { color: var(--color-neon-400); }
</style>
