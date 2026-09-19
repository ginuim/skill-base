<template>
  <div class="view-mode-toggle" role="group" :aria-label="t('index.viewMode')">
    <button
      type="button"
      class="view-mode-btn"
      :class="{ 'view-mode-btn--active': modelValue === 'card' }"
      :title="t('index.viewCard')"
      :aria-pressed="modelValue === 'card'"
      @click="$emit('update:modelValue', 'card')"
    >
      <LayoutGrid :size="14" :stroke-width="2" aria-hidden="true" />
      <span class="view-mode-btn-label">{{ t('index.viewCard') }}</span>
    </button>
    <button
      type="button"
      class="view-mode-btn"
      :class="{ 'view-mode-btn--active': modelValue === 'list' }"
      :title="t('index.viewList')"
      :aria-pressed="modelValue === 'list'"
      @click="$emit('update:modelValue', 'list')"
    >
      <List :size="14" :stroke-width="2" aria-hidden="true" />
      <span class="view-mode-btn-label">{{ t('index.viewList') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { LayoutGrid, List } from 'lucide-vue-next'
import { useI18n } from '@/composables/useI18n'
import type { SkillViewMode } from '@/composables/useSkillViewMode'

defineProps<{
  modelValue: SkillViewMode
}>()

defineEmits<{
  'update:modelValue': [value: SkillViewMode]
}>()

const { t } = useI18n()
</script>

<style scoped>
.view-mode-toggle {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-base-800);
  border-radius: 9999px;
  overflow: hidden;
}

.view-mode-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.55rem;
  border: none;
  background: transparent;
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.view-mode-btn:hover,
.view-mode-btn:focus-visible {
  color: var(--color-fg-strong);
  outline: none;
}

.view-mode-btn:focus-visible {
  box-shadow: inset 0 0 0 1px var(--color-base-500);
}

.view-mode-btn--active {
  background: color-mix(in srgb, var(--color-fg-strong) 8%, transparent);
  color: var(--color-fg-strong);
}

.view-mode-btn-label {
  display: none;
}

@media (min-width: 640px) {
  .view-mode-btn-label {
    display: inline;
  }
}
</style>
