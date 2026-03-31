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
            <svg v-if="toast.type === 'success'" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="toast.type === 'error'" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <svg v-else-if="toast.type === 'warning'" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
            </svg>
            <svg v-else viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="toast__content">
            <p class="toast__message">{{ toast.message }}</p>
          </div>
          <button class="toast__close" @click="removeToast(toast.id)">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

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
  background: #13141a;
  border: 1px solid #27272a;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
  backdrop-filter: blur(12px);
}

.toast--success {
  border-color: #00E592;
  box-shadow: 0 0 20px rgba(0, 229, 146, 0.15), 0 10px 40px rgba(0, 0, 0, 0.4);
}

.toast--success .toast__icon {
  color: #00FFA3;
}

.toast--error {
  border-color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.15), 0 10px 40px rgba(0, 0, 0, 0.4);
}

.toast--error .toast__icon {
  color: #ef4444;
}

.toast--warning {
  border-color: #f59e0b;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.15), 0 10px 40px rgba(0, 0, 0, 0.4);
}

.toast--warning .toast__icon {
  color: #f59e0b;
}

.toast--info {
  border-color: #3b82f6;
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15), 0 10px 40px rgba(0, 0, 0, 0.4);
}

.toast--info .toast__icon {
  color: #3b82f6;
}

.toast__icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
}

.toast__icon svg {
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
  color: #e4e4e7;
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
  color: #71717a;
  cursor: pointer;
  transition: color 0.2s ease;
}

.toast__close:hover {
  color: #e4e4e7;
}

.toast__close svg {
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
