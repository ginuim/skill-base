<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="[`toast--${toast.type}`]"
        >
          <div class="toast__icon">
            <CircleCheck v-if="toast.type === 'success'" class="toast__lucide" :size="20" :stroke-width="2" aria-hidden="true" />
            <CircleX v-else-if="toast.type === 'error'" class="toast__lucide" :size="20" :stroke-width="2" aria-hidden="true" />
            <TriangleAlert v-else-if="toast.type === 'warning'" class="toast__lucide" :size="20" :stroke-width="2" aria-hidden="true" />
            <Info v-else class="toast__lucide" :size="20" :stroke-width="2" aria-hidden="true" />
          </div>
          <div class="toast__content">
            <p class="toast__message">{{ toast.message }}</p>
          </div>
          <button type="button" class="toast__close" :aria-label="'Close'" @click="removeToast(toast.id)">
            <X class="toast__lucide toast__lucide--close" :size="20" :stroke-width="2" aria-hidden="true" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CircleCheck, CircleX, TriangleAlert, Info, X } from 'lucide-vue-next'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

const toasts = ref<Toast[]>([])
let toastId = 0

const show = (message: string, type: ToastType = 'info', duration: number = 3000) => {
  const id = ++toastId
  const toast: Toast = {
    id,
    message,
    type,
    duration
  }
  toasts.value.push(toast)

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }
}

const removeToast = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

const success = (message: string, duration?: number) => show(message, 'success', duration)
const error = (message: string, duration?: number) => show(message, 'error', duration)
const warning = (message: string, duration?: number) => show(message, 'warning', duration)
const info = (message: string, duration?: number) => show(message, 'info', duration)

defineExpose({
  show,
  success,
  error,
  warning,
  info
})
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 0.5rem;
  background: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

html[data-theme="light"] .toast {
  box-shadow: 0 10px 40px color-mix(in srgb, var(--color-fg-strong) 12%, transparent);
}

.toast--success {
  border-color: var(--color-neon-500);
  box-shadow: 0 0 20px rgba(var(--color-neon-rgb), 0.15), 0 10px 40px rgba(0, 0, 0, 0.35);
}

html[data-theme="light"] .toast--success {
  box-shadow:
    0 0 20px rgba(var(--color-neon-rgb), 0.15),
    0 10px 40px color-mix(in srgb, var(--color-fg-strong) 12%, transparent);
}

.toast--success .toast__icon {
  color: var(--color-neon-400);
}

.toast--error {
  border-color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.15), 0 10px 40px rgba(0, 0, 0, 0.35);
}

html[data-theme="light"] .toast--error {
  box-shadow:
    0 0 20px rgba(239, 68, 68, 0.15),
    0 10px 40px color-mix(in srgb, var(--color-fg-strong) 12%, transparent);
}

.toast--error .toast__icon {
  color: #ef4444;
}

.toast--warning {
  border-color: #f59e0b;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.15), 0 10px 40px rgba(0, 0, 0, 0.35);
}

html[data-theme="light"] .toast--warning {
  box-shadow:
    0 0 20px rgba(245, 158, 11, 0.15),
    0 10px 40px color-mix(in srgb, var(--color-fg-strong) 12%, transparent);
}

.toast--warning .toast__icon {
  color: #f59e0b;
}

.toast--info {
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15), 0 10px 40px rgba(0, 0, 0, 0.35);
}

html[data-theme="light"] .toast--info {
  box-shadow:
    0 0 20px rgba(59, 130, 246, 0.15),
    0 10px 40px color-mix(in srgb, var(--color-fg-strong) 12%, transparent);
}

.toast--info .toast__icon {
  color: #3b82f6;
}

.toast__icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
}

.toast__icon :deep(svg),
.toast__lucide {
  width: 100%;
  height: 100%;
}

.toast__content {
  flex: 1;
  min-width: 0;
}

.toast__message {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-fg);
  line-height: 1.5;
  word-break: break-word;
}

.toast__close {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-base-400);
  cursor: pointer;
  transition: color 0.2s ease;
}

.toast__close:hover {
  color: var(--color-fg-strong);
}

.toast__close .toast__lucide--close {
  width: 100%;
  height: 100%;
}

/* Transition animations */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.9);
}

.toast-move {
  transition: transform 0.3s ease;
}

/* Mobile responsive */
@media (max-width: 640px) {
  .toast-container {
    top: auto;
    bottom: 1rem;
    left: 1rem;
    right: 1rem;
    align-items: stretch;
  }

  .toast {
    min-width: auto;
    max-width: none;
  }

  .toast-enter-from {
    opacity: 0;
    transform: translateY(100%) scale(0.9);
  }

  .toast-leave-to {
    opacity: 0;
    transform: translateY(100%) scale(0.9);
  }
}
</style>
