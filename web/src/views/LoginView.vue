<template>
  <div class="login-container">
    <section class="flat-page login-shell" aria-labelledby="login-heading">
      <router-link to="/" class="login-brand">
        <Package :size="24" :stroke-width="1.8" aria-hidden="true" />
        <span>Skill Base</span>
      </router-link>

      <header class="flat-header login-header">
        <h1 id="login-heading">{{ t('login.heading') }}</h1>
        <p>{{ t('login.subtitle') }}</p>
      </header>

      <form @submit.prevent="handleLogin" class="flat-form" :aria-busy="authStore.isLoading">
        <div class="flat-field">
          <label for="username">{{ t('login.username') }}</label>
          <input
            id="username"
            v-model="username"
            name="username"
            type="text"
            :placeholder="t('login.errUsername')"
            autocomplete="username"
            autocapitalize="none"
            :spellcheck="false"
            required
            :disabled="authStore.isLoading"
          />
        </div>
        <div class="flat-field">
          <label for="password">{{ t('login.password') }}</label>
          <input
            id="password"
            v-model="password"
            name="password"
            type="password"
            :placeholder="t('login.errPassword')"
            autocomplete="current-password"
            required
            :disabled="authStore.isLoading"
          />
        </div>
        <p v-if="authStore.error" class="flat-error" role="alert">{{ authStore.error }}</p>
        <button type="submit" class="flat-primary login-submit" :disabled="authStore.isLoading">
          <span v-if="authStore.isLoading" class="spinner spinner-sm" aria-hidden="true"></span>
          <span aria-live="polite">{{ authStore.isLoading ? t('login.loading') : t('login.submit') }}</span>
          <ArrowRight v-if="!authStore.isLoading" :size="16" aria-hidden="true" />
        </button>
      </form>
      <router-link to="/" class="flat-back login-back">← {{ t('nav.home') }}</router-link>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Package, ArrowRight } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { checkSystemInit } from '@/services/api'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const username = ref('')
const password = ref('')

onMounted(async () => {
  await checkSystemInit()

  const isAuth = await authStore.fetchUser()
  if (isAuth) {
    if (route.query.from === 'cli') {
      router.push('/cli-code?from=cli')
    } else {
      const redirect = route.query.redirect as string || '/'
      router.push(redirect)
    }
  }
})

async function handleLogin() {
  authStore.clearError()

  const success = await authStore.login(username.value, password.value)
  if (success) {
    const fromCli = route.query.from === 'cli'
    if (fromCli) {
      router.push('/cli-code?from=cli')
    } else {
      const redirect = route.query.redirect as string || '/'
      router.push(redirect)
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  padding: 48px 24px;
}
.login-shell {
  width: 100%;
  max-width: 400px;
  margin: auto;
  padding: 0;
}
.login-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-fg-strong);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.025em;
  text-decoration: none;
}
.login-header {
  margin: 40px 0 28px;
}
.login-header p {
  line-height: 1.7;
}
.login-shell .login-submit {
  width: 100%;
  min-height: 46px;
  margin-top: 4px;
  font-size: 14px;
}
.login-shell input:disabled {
  opacity: 0.55;
}
.login-back {
  margin-top: 28px;
}
@media (max-width: 640px) {
  .login-container {
    padding: 40px 24px;
  }
  .login-shell input {
    font-size: 16px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}
</style>
