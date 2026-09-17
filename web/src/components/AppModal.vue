<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="modal-overlay"
      @click.self="emit('close')"
    >
      <div
        ref="panelRef"
        class="modal-panel"
        :style="{ maxWidth }"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="modal-header">
          <h2 :id="titleId" class="text-h2">
            <slot name="title">{{ title }}</slot>
          </h2>
          <button
            type="button"
            class="btn btn-ghost btn-icon"
            :aria-label="closeAria"
            @click="emit('close')"
          >
            <X :size="16" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, useId, useTemplateRef, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  maxWidth?: string
  closeAria?: string
}>(), {
  title: '',
  maxWidth: '480px',
  closeAria: 'Close',
})

const emit = defineEmits<{
  close: []
}>()

const titleId = useId()
const panelRef = useTemplateRef<HTMLElement>('panelRef')

watch(() => props.open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  const first = panelRef.value?.querySelector<HTMLElement>('input, textarea, select, button:not(.btn-icon)')
  first?.focus()
})

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.open) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.modal-body {
  min-width: 0;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
}
</style>
