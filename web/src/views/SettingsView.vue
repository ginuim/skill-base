<template>
  <main class="flat-page settings-page">
    <router-link to="/" class="flat-back">← {{ t('nav.home') }}</router-link>
    <header class="flat-header">
      <h1>{{ t('settings.heading') }}</h1>
      <p>{{ t('settings.subtitle') }}</p>
    </header>
    <section class="settings-section">
      <div class="section-intro">
        <h2>{{ t('settings.basicInfo') }}</h2>
        <p>{{ t('settings.profileHint') }}</p>
      </div>
      <form @submit.prevent="saveProfile" class="flat-form">
        <div class="profile-avatar-row">
          <UserAvatar
            :avatar="profileForm.avatar"
            :name="profileForm.name"
            :username="profileForm.username"
            size-class="w-16 h-16 text-lg"
          />
          <div>
            <p class="avatar-name">
              {{ profileForm.name || profileForm.username }}
            </p>
            <p class="flat-hint">{{ t('settings.avatarHint') }}</p>
          </div>
        </div>
        <details class="avatar-picker">
          <summary>{{ t('settings.changeAvatar') }}</summary>
          <div
            class="avatar-options"
            role="group"
            :aria-label="t('settings.avatarLabel')"
          >
            <button
              type="button"
              class="avatar-option"
              :class="{ 'is-selected': profileForm.avatar === null }"
              :aria-pressed="profileForm.avatar === null"
              :aria-label="t('settings.avatarDefault')"
              @click="selectAvatar(null, $event)"
            >
              <span>{{ profileInitial }}</span>
            </button>
            <button
              v-for="file in PRESET_AVATARS"
              :key="file"
              type="button"
              class="avatar-option"
              :class="{ 'is-selected': profileForm.avatar === file }"
              :aria-pressed="profileForm.avatar === file"
              :aria-label="file.replace('.png', '')"
              :title="file.replace('.png', '')"
              @click="selectAvatar(file, $event)"
            >
              <img :src="avatarSrc(file)!" alt="" />
            </button>
          </div>
        </details>
        <div class="settings-username">
          <span>{{ t('settings.usernameLabel') }}</span
          ><strong>{{ profileForm.username }}</strong
          ><small>{{ t('settings.usernameHint') }}</small>
        </div>
        <div class="flat-field">
          <label for="profile-name">{{ t('settings.nameLabel') }}</label
          ><input
            id="profile-name"
            v-model="profileForm.name"
            :placeholder="t('settings.namePlaceholder')"
            autocomplete="name"
            :disabled="isSaving"
          />
          <p class="flat-hint">{{ t('settings.nameHint') }}</p>
        </div>
        <button type="submit" class="flat-primary" :disabled="isSaving">
          <span v-if="isSaving" class="spinner spinner-sm"></span
          >{{ t('settings.saveBtn') }}
        </button>
      </form>
    </section>
    <section class="settings-section">
      <div class="section-intro">
        <h2>{{ t('settings.cliSection') }}</h2>
        <p>{{ t('settings.cliHint') }}</p>
      </div>
      <div class="settings-action-row">
        <p class="flat-hint" v-html="t('settings.cliDesc')"></p>
        <router-link to="/cli-code" class="flat-secondary"
          ><Laptop :size="16" />{{ t('settings.cliLink') }} →</router-link
        >
      </div>
    </section>
    <section class="settings-section">
      <div class="section-intro">
        <h2>{{ t('settings.security') }}</h2>
        <p>{{ t('settings.securityHint') }}</p>
      </div>
      <details ref="passwordDetails" class="password-details">
        <summary>{{ t('settings.passwordSection') }}</summary>
        <form @submit.prevent="changePassword" class="flat-form">
          <div class="flat-field">
            <label for="current-password">{{ t('settings.oldPassword') }}</label
            ><input
              id="current-password"
              v-model="passwordForm.current"
              type="password"
              autocomplete="current-password"
              required
              :disabled="isChangingPassword"
            />
          </div>
          <div class="flat-field">
            <label for="new-password">{{ t('settings.newPassword') }}</label
            ><input
              id="new-password"
              v-model="passwordForm.new"
              type="password"
              autocomplete="new-password"
              minlength="6"
              required
              :disabled="isChangingPassword"
            />
            <p class="flat-hint">{{ t('settings.newPasswordHint') }}</p>
          </div>
          <div class="flat-field">
            <label for="confirm-password">{{
              t('settings.confirmPassword')
            }}</label
            ><input
              id="confirm-password"
              v-model="passwordForm.confirm"
              type="password"
              autocomplete="new-password"
              minlength="6"
              required
              :disabled="isChangingPassword"
            />
          </div>
          <button
            type="submit"
            class="flat-primary"
            :disabled="isChangingPassword || !canChangePassword"
          >
            <span v-if="isChangingPassword" class="spinner spinner-sm"></span
            >{{ t('settings.changePasswordBtn') }}
          </button>
        </form>
      </details>
    </section>
  </main>
</template>

<script setup lang="ts">
import { Laptop } from 'lucide-vue-next'
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { apiPost } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'
import UserAvatar from '@/components/UserAvatar.vue'
import { PRESET_AVATARS, avatarSrc, isPresetAvatar } from '@/utils/avatar'

const authStore = useAuthStore()
const { t } = useI18n()

// Profile
const profileForm = ref<{
  username: string
  name: string
  avatar: string | null
}>({
  username: '',
  name: '',
  avatar: null,
})
const isSaving = ref(false)
const passwordDetails = ref<HTMLDetailsElement | null>(null)
function selectAvatar(avatar: string | null, event: Event) {
  profileForm.value.avatar = avatar
  const details = (event.currentTarget as HTMLElement).closest('details')
  if (details) {
    details.open = false
    details.querySelector('summary')?.focus()
  }
}
const profileInitial = computed(() =>
  (profileForm.value.name || profileForm.value.username || 'U')
    .charAt(0)
    .toUpperCase(),
)

// Password
const passwordForm = ref({
  current: '',
  new: '',
  confirm: '',
})
const isChangingPassword = ref(false)

const canChangePassword = computed(() => {
  return (
    passwordForm.value.current &&
    passwordForm.value.new &&
    passwordForm.value.confirm &&
    passwordForm.value.new === passwordForm.value.confirm
  )
})

onMounted(() => {
  resetProfile()
})

function resetProfile() {
  const current = authStore.user?.avatar
  profileForm.value = {
    username: authStore.username || '',
    name: authStore.user?.name || '',
    avatar: isPresetAvatar(current) ? current : null,
  }
}

async function saveProfile() {
  isSaving.value = true
  try {
    await authStore.updateProfile({
      name: profileForm.value.name,
      avatar: profileForm.value.avatar,
    })
    globalToast.success(t('settings.saveSuccess'))
  } catch (err) {
    globalToast.error(t('settings.saveFailed'))
  } finally {
    isSaving.value = false
  }
}

async function changePassword() {
  // 校验逻辑
  if (!passwordForm.value.current) {
    globalToast.warning(t('settings.noOldPassword'))
    return
  }

  if (passwordForm.value.new.length < 6) {
    globalToast.warning(t('settings.newPassTooShort'))
    return
  }

  if (passwordForm.value.new !== passwordForm.value.confirm) {
    globalToast.warning(t('settings.passMismatch'))
    return
  }

  isChangingPassword.value = true
  try {
    const response = await apiPost<{
      ok: boolean
      error?: string
      detail?: string
    }>('/auth/me/change-password', {
      old_password: passwordForm.value.current,
      new_password: passwordForm.value.new,
    })
    if (response.ok) {
      globalToast.success(t('settings.changeSuccess'))
      passwordForm.value = { current: '', new: '', confirm: '' }
      if (passwordDetails.value) passwordDetails.value.open = false
    } else {
      globalToast.error(response.detail || t('settings.changeFailed'))
    }
  } catch (err: any) {
    // 处理旧密码错误的情况
    if (err.data?.error === 'wrong_password') {
      globalToast.error(t('settings.wrongPassword'))
    } else {
      globalToast.error(err.message || t('settings.changeFailed'))
    }
  } finally {
    isChangingPassword.value = false
  }
}
</script>

<style scoped>
.settings-section {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 48px;
  padding: 32px 0;
  border-top: 1px solid var(--color-base-800);
}
.section-intro h2 {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-fg-strong);
}
.section-intro p {
  font-size: 13px;
  color: var(--color-base-400);
  margin-top: 8px;
}
.settings-section > :last-child {
  max-width: 560px;
}
.profile-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar-name {
  color: var(--color-fg-strong);
  font-weight: 600;
}
.avatar-picker {
  margin-top: -8px;
}
.avatar-options {
  display: grid;
  grid-template-columns: repeat(auto-fill, 44px);
  gap: 12px;
  margin-top: 20px;
  padding: 4px;
}
.avatar-option {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-base-900);
  color: var(--color-neon-400);
  cursor: pointer;
}
.avatar-option img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-option:hover,
.avatar-option.is-selected {
  outline: 2px solid var(--color-neon-400);
  outline-offset: 2px;
}
.settings-username {
  display: grid;
  grid-template-columns: 90px 1fr;
  align-items: baseline;
  gap: 6px 12px;
  font-size: 14px;
}
.settings-username strong {
  font-weight: 500;
  color: var(--color-fg-strong);
}
.settings-username small {
  grid-column: 2;
  color: var(--color-base-400);
  font-size: 12px;
}
.settings-action-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}
.password-details {
  width: 100%;
}
.password-details form {
  margin-top: 24px;
}
@media (max-width: 700px) {
  .settings-section {
    grid-template-columns: 1fr;
    gap: 24px;
    padding-block: 28px;
  }
}
</style>
