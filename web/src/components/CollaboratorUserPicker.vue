<template>
  <div class="collab-picker-root">
    <div class="relative">
      <input
        v-model="modelValue"
        type="text"
        autocomplete="off"
        :placeholder="placeholder"
        class="form-input"
        @focus="onInputFocus"
        @blur="onInputBlur"
        @keydown="onInputKeydown"
      />
      <ul
        v-if="suggestVisible"
        class="collab-suggest-list"
        role="listbox"
      >
        <li
          v-for="(u, i) in suggestions"
          :key="u.id"
          role="option"
          :aria-selected="i === highlightIndex"
          :class="['collab-suggest-item', { 'is-active': i === highlightIndex }]"
          @mousedown.prevent="pickUser(u)"
        >
          <span class="collab-suggest-username">{{ u.username }}</span>
          <span v-if="u.name" class="collab-suggest-name">{{ u.name }}</span>
        </li>
      </ul>
    </div>
    <p v-if="isLoadingUsers" class="collab-picker-hint">{{ t('state.loading') }}</p>
    <p
      v-else-if="inputFocused && modelValue.trim() && suggestions.length === 0"
      class="collab-picker-hint"
    >
      {{ t('collab.noUsers') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usersApi, type User } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'

const RECENT_KEY = 'skill-base:collab-recent-usernames'
const MAX_EMPTY = 20
const MAX_FILTERED = 50

const modelValue = defineModel<string>({ required: true })

const props = withDefaults(
  defineProps<{
    /** 不可选的用户 id（所有者、已有协作者、当前用户等） */
    excludeUserIds?: number[]
    /** 为 true 时清空输入、拉取全量用户并刷新本地「最近」缓存键 */
    active?: boolean
    placeholder?: string
  }>(),
  {
    excludeUserIds: () => [],
    active: false,
    placeholder: '',
  }
)

const emit = defineEmits<{
  enter: []
}>()

const { t } = useI18n()

function loadRecentUsernames(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function persistRecent(names: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(names.slice(0, 30)))
}

function touchRecent(username: string) {
  const u = username.trim()
  if (!u) return
  const next = [u, ...recentUsernames.value.filter((x) => x !== u)].slice(0, 30)
  recentUsernames.value = next
  persistRecent(next)
}

const recentUsernames = ref<string[]>(loadRecentUsernames())
const allUsers = ref<User[]>([])
const isLoadingUsers = ref(false)
const inputFocused = ref(false)
const highlightIndex = ref(-1)
let blurTimer: ReturnType<typeof setTimeout> | null = null

const excludedIds = computed(() => new Set(props.excludeUserIds ?? []))

const suggestions = computed(() => {
  const pool = allUsers.value.filter((u) => !excludedIds.value.has(u.id))
  const needle = modelValue.value.trim().toLowerCase()
  const filtered = needle
    ? pool.filter(
        (u) =>
          u.username.toLowerCase().includes(needle) ||
          (u.name != null && u.name.toLowerCase().includes(needle))
      )
    : pool

  const byUsername = new Map(filtered.map((u) => [u.username, u]))
  const recentOrdered: User[] = []
  for (const name of recentUsernames.value) {
    const u = byUsername.get(name)
    if (u) recentOrdered.push(u)
  }
  const recentIds = new Set(recentOrdered.map((u) => u.id))
  const rest = filtered.filter((u) => !recentIds.has(u.id)).sort((a, b) => a.username.localeCompare(b.username))
  const combined = [...recentOrdered, ...rest]
  const max = needle ? MAX_FILTERED : MAX_EMPTY
  return combined.slice(0, max)
})

const suggestVisible = computed(
  () => inputFocused.value && suggestions.value.length > 0 && !isLoadingUsers.value
)

async function loadAllUsers() {
  isLoadingUsers.value = true
  try {
    const res = await usersApi.search()
    allUsers.value = res.users || []
  } catch {
    globalToast.error(t('collab.usersLoadFailed'))
  } finally {
    isLoadingUsers.value = false
  }
}

watch(
  () => props.active,
  async (open) => {
    if (!open) return
    modelValue.value = ''
    highlightIndex.value = -1
    inputFocused.value = false
    recentUsernames.value = loadRecentUsernames()
    await loadAllUsers()
  },
  { immediate: true }
)

watch(modelValue, () => {
  highlightIndex.value = -1
})

function onInputFocus() {
  if (blurTimer) {
    clearTimeout(blurTimer)
    blurTimer = null
  }
  inputFocused.value = true
}

function onInputBlur() {
  blurTimer = setTimeout(() => {
    inputFocused.value = false
    blurTimer = null
    highlightIndex.value = -1
  }, 150)
}

function pickUser(u: User) {
  modelValue.value = u.username
}

function onInputKeydown(e: KeyboardEvent) {
  const list = suggestions.value
  if (e.key === 'ArrowDown') {
    if (list.length === 0) return
    e.preventDefault()
    highlightIndex.value =
      highlightIndex.value < list.length - 1 ? highlightIndex.value + 1 : 0
  } else if (e.key === 'ArrowUp') {
    if (list.length === 0) return
    e.preventDefault()
    highlightIndex.value =
      highlightIndex.value <= 0 ? list.length - 1 : highlightIndex.value - 1
  } else if (e.key === 'Enter') {
    if (list.length > 0 && highlightIndex.value >= 0) {
      const u = list[highlightIndex.value]
      if (u) {
        e.preventDefault()
        modelValue.value = u.username
      }
    }
    emit('enter')
  } else if (e.key === 'Escape') {
    inputFocused.value = false
    highlightIndex.value = -1
  }
}

defineExpose({
  rememberRecent: touchRecent,
})
</script>

<style scoped>
.collab-picker-root {
  width: 100%;
}

.collab-picker-hint {
  font-size: 0.75rem;
  color: var(--color-base-400);
  margin-top: 0.375rem;
  font-family: "JetBrains Mono", monospace;
}

.form-input {
  width: 100%;
  padding: 0.625rem 0.75rem;
  background-color: var(--color-base-950);
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  color: var(--color-fg-strong);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.875rem;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--color-base-400);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-neon-500);
  box-shadow: 0 0 0 1px var(--color-neon-500);
}

.collab-suggest-list {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  max-height: 220px;
  overflow-y: auto;
  z-index: 20;
  background: var(--color-base-950);
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  padding: 0.25rem 0;
  list-style: none;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
}

html[data-theme="light"] .collab-suggest-list {
  box-shadow: 0 8px 24px color-mix(in srgb, var(--color-fg-strong) 14%, transparent);
}

.collab-suggest-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 0.8125rem;
}

.collab-suggest-item:hover,
.collab-suggest-item.is-active {
  background: rgba(var(--color-neon-rgb), 0.08);
}

.collab-suggest-username {
  font-family: "JetBrains Mono", monospace;
  color: var(--color-fg-strong);
}

.collab-suggest-name {
  color: var(--color-base-400);
  font-size: 0.75rem;
}
</style>
