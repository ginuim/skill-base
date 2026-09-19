<template>
  <div class="login-container">
    <div class="login-panel">
    <section class="flat-page login-shell" aria-labelledby="login-heading">
      <router-link to="/" class="login-brand">
        <SkillBaseBrand />
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
    <aside class="login-visual" aria-labelledby="login-visual-heading">
      <div class="login-art" aria-hidden="true">
        <CollectionBookCover :name="t('login.demoCollection')" :description="t('login.demoDescription')" :skill-count="3" :color-index="4" />
        <div class="login-skill-preview"><Package :size="20" /><span>SKILL.md</span><Check :size="16" /></div>
      </div>
      <div class="login-visual-copy">
        <p class="login-visual-label">AGENT SKILLS, TOGETHER</p>
        <h2 id="login-visual-heading">{{ t('login.visualTitle') }}</h2>
        <p>{{ t('login.visualDescription') }}</p>
        <ul class="login-features"><li v-for="key in ['manage', 'versions', 'collections']" :key="key">{{ t(`login.feature.${key}`) }}</li></ul>
      </div>
    </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import SkillBaseBrand from '@/components/SkillBaseBrand.vue'
import CollectionBookCover from '@/components/CollectionBookCover.vue'
import { Package, Check, ArrowRight } from 'lucide-vue-next'
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
.login-container { min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 48px 24px; background: var(--color-base-900); }
.login-panel { width: min(960px, 100%); display: grid; grid-template-columns: 1fr 1fr; background: var(--color-base-950); border: 1px solid var(--color-base-800); border-radius: 14px; overflow: hidden; box-shadow: 0 16px 48px rgb(0 0 0 / 6%); }
.login-shell { width: 100%; max-width: 440px; margin: auto; padding: 48px 40px; }
.login-brand { display: inline-flex; text-decoration: none; }
.login-header { margin: 40px 0 28px; }
.login-header p { line-height: 1.7; }
.login-shell .flat-form { gap: 20px; }
.login-shell input { min-height: 44px; }
.login-shell .login-submit { width: 100%; min-height: 44px; margin-top: 4px; font-size: 14px; }
.login-back { margin-top: 24px; }
.login-visual { display: flex; flex-direction: column; justify-content: center; gap: 40px; padding: 48px 40px; background: color-mix(in srgb, var(--color-base-900) 95%, var(--color-neon-400)); }
.login-art { position: relative; align-self: center; padding: 0 24px 20px; }
.login-skill-preview { position: absolute; bottom: 0; right: 0; display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 1px solid var(--color-base-800); border-radius: 8px; background: var(--color-base-950); color: var(--color-fg-strong); font: 12px var(--font-mono); box-shadow: 0 6px 20px rgb(0 0 0 / 5%); }
.login-skill-preview svg { color: var(--color-neon-400); }
.login-visual-label { font-size: 10px; letter-spacing: .13em; color: var(--color-base-400); margin-bottom: 12px; }
.login-visual-copy h2 { font-size: 26px; line-height: 1.35; font-weight: 650; letter-spacing: -.03em; color: var(--color-fg-strong); text-wrap: balance; }
.login-visual-copy > p:not(.login-visual-label) { font-size: 14px; line-height: 1.8; margin-top: 12px; color: var(--color-base-400); }
.login-features { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 24px; font-size: 12px; color: var(--color-base-400); }
@media (max-width: 820px) {
 .login-panel { max-width: 400px; grid-template-columns: 1fr; }
 .login-visual { display: none; }
 .login-shell { padding: 32px; }
}
@media (max-width: 640px) {
 .login-container { padding: 40px 20px; background: var(--color-base-950); }
 .login-panel { border: 0; box-shadow: none; }
 .login-shell { padding: 0; }
 .login-shell input { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }
</style>
