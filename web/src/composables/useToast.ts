import { ref } from 'vue'
import type { ToastType } from '@/components/Toast.vue'

interface ToastInstance {
  show: (message: string, type?: ToastType, duration?: number) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const toastRef = ref<ToastInstance | null>(null)

export function useToast() {
  const setToastRef = (ref: ToastInstance) => {
    toastRef.value = ref
  }

  const show = (message: string, type: ToastType = 'info', duration?: number) => {
    toastRef.value?.show(message, type, duration)
  }

  const success = (message: string, duration?: number) => {
    toastRef.value?.success(message, duration)
  }

  const error = (message: string, duration?: number) => {
    toastRef.value?.error(message, duration)
  }

  const warning = (message: string, duration?: number) => {
    toastRef.value?.warning(message, duration)
  }

  const info = (message: string, duration?: number) => {
    toastRef.value?.info(message, duration)
  }

  return {
    setToastRef,
    show,
    success,
    error,
    warning,
    info
  }
}

// Global toast instance for use outside of setup
export const globalToast = {
  show: (message: string, type: ToastType = 'info', duration?: number) => {
    toastRef.value?.show(message, type, duration)
  },
  success: (message: string, duration?: number) => {
    toastRef.value?.success(message, duration)
  },
  error: (message: string, duration?: number) => {
    toastRef.value?.error(message, duration)
  },
  warning: (message: string, duration?: number) => {
    toastRef.value?.warning(message, duration)
  },
  info: (message: string, duration?: number) => {
    toastRef.value?.info(message, duration)
  }
}
