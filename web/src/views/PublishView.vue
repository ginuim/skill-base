<template>
  <main class="flat-page publish-page">
    <router-link to="/" class="flat-back">← {{ t('nav.home') }}</router-link>
    <header class="flat-header">
      <h1>{{ t('publish.pageHeading') }}</h1>
      <p>{{ t('publish.pageHint') }}</p>
    </header>
    <div
      class="publish-mode-tabs"
      role="group"
      :aria-label="t('publish.modeTablistLabel')"
    >
      <button
        v-for="mode in ['upload', 'write', 'github'] as const"
        :key="mode"
        type="button"
        :aria-pressed="publishMode === mode"
        :class="{ active: publishMode === mode }"
        :disabled="isPublishing || isPreviewLoading"
        @click="setPublishMode(mode)"
      >
        {{
          t(
            mode === 'upload'
              ? 'publish.tabUpload'
              : mode === 'write'
                ? 'publish.tabWrite'
                : 'publish.tabGithub',
          )
        }}
      </button>
    </div>
    <form @submit.prevent="handlePublish" class="flat-form publish-form">
      <div v-if="error" ref="errorBannerRef" class="flat-error" role="alert">
        {{ error }}
      </div>
      <section class="source-section">
        <h2 class="publish-step">
          <span>01</span>{{ t('publish.sourceStep') }}
        </h2>
        <div
          v-show="publishMode === 'github'"
          class="flat-form github-import-panel"
        >
          <div class="flat-field">
            <label for="github-source">{{ t('publish.repositoryLabel') }}</label
            ><input
              id="github-source"
              v-model="githubSource"
              :disabled="isPublishing || isPreviewLoading"
              :placeholder="t('publish.githubSourcePlaceholder')"
              autocomplete="off"
            />
            <p class="flat-hint">{{ t('publish.repositoryHint') }}</p>
          </div>
          <details class="github-advanced">
            <summary>{{ t('publish.advancedOptions') }}</summary>
            <div class="publish-two-fields">
              <div class="flat-field">
                <label for="github-ref">{{ t('publish.githubRef') }}</label
                ><input
                  id="github-ref"
                  v-model="githubRef"
                  :disabled="isPublishing || isPreviewLoading"
                  :placeholder="t('publish.githubRefPlaceholder')"
                />
              </div>
              <div class="flat-field">
                <label for="github-subpath">{{
                  t('publish.githubSubpath')
                }}</label
                ><input
                  id="github-subpath"
                  v-model="githubSubpath"
                  :disabled="isPublishing || isPreviewLoading"
                  :placeholder="t('publish.githubSubpathPlaceholder')"
                />
              </div>
            </div>
          </details>
          <div class="github-actions">
            <button
              type="button"
              :class="githubPreview ? 'flat-secondary' : 'flat-primary'"
              :disabled="
                isPublishing || isPreviewLoading || !githubSource.trim()
              "
              :aria-busy="isPreviewLoading"
              @click="runGithubPreview"
            >
              <span v-if="isPreviewLoading" class="spinner spinner-sm"></span
              >{{
                isPreviewLoading
                  ? t('publish.githubPreviewing')
                  : t('publish.readRepository')
              }}</button
            ><button
              v-if="githubPreview"
              type="button"
              class="flat-secondary"
              :disabled="isPublishing || isPreviewLoading"
              @click="clearGithubImport"
            >
              {{ t('publish.githubClear') }}
            </button>
          </div>
          <div
            class="github-connection"
            :class="githubConnectBannerClass"
            role="status"
          >
            <span>{{ githubConnectTitle }}</span
            ><button
              type="button"
              class="flat-link"
              :disabled="githubConnect.state === 'checking'"
              @click="fetchGithubConnectivity"
            >
              {{ t('publish.githubConnectRetry') }}
            </button>
            <p v-if="githubConnect.state === 'fail'">
              {{ githubConnectDetailLine }}
              {{ t('publish.githubConnectHintNetwork') }}
            </p>
          </div>
        </div>
        <div v-show="publishMode === 'upload'">
          <div
            id="drop-zone"
            class="drop-zone"
            :class="{ 'drag-over': isDragging }"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="handleDragLeave"
            @drop.prevent="handleDrop"
          >
            <Upload :size="28" :stroke-width="1.5" aria-hidden="true" />
            <h3>{{ t('publish.dropZoneText') }}</h3>
            <p class="flat-hint">{{ t('publish.dropZoneHint') }}</p>
            <div class="upload-actions">
              <button
                type="button"
                class="flat-primary"
                :disabled="isPublishing"
                @click="triggerFileInput"
              >
                {{ t('publish.chooseFolder') }}</button
              ><button
                type="button"
                class="flat-secondary"
                :disabled="isPublishing"
                @click="zipInput?.click()"
              >
                {{ t('publish.selectZip') }}
              </button>
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            webkitdirectory
            directory
            multiple
            class="hidden"
            @change="handleFileSelect"
          />
          <input
            ref="zipInput"
            type="file"
            accept=".zip"
            class="hidden"
            @change="handleZipSelect"
          />
          <details v-if="selectedFiles.length" class="file-preview">
            <summary>
              {{ t('publish.totalFiles', { count: selectedFiles.length }) }}
            </summary>
            <div class="file-preview-list">
              <div v-for="file in selectedFiles.slice(0, 20)" :key="file.name">
                {{ file.name }} <span>{{ formatFileSize(file.size) }}</span>
              </div>
              <p v-if="selectedFiles.length > 20">
                {{
                  t('publish.moreFiles', { count: selectedFiles.length - 20 })
                }}
              </p>
            </div>
            <button
              type="button"
              class="flat-link"
              @click="clearFiles"
              :disabled="isPublishing"
            >
              {{ t('publish.clearSelection') }}
            </button>
          </details>
        </div>
        <div v-show="publishMode === 'write'" class="flat-form">
          <div class="write-header">
            <label for="skill-md-editor">SKILL.md</label
            ><button
              type="button"
              class="flat-link"
              :disabled="isPublishing"
              @click="resetSkillMdTemplate"
            >
              {{ t('publish.writeResetTemplate') }}
            </button>
          </div>
          <p class="flat-hint">{{ t('publish.writeHint') }}</p>
          <textarea
            id="skill-md-editor"
            v-model="skillMdDraft"
            rows="15"
            class="write-skill-editor"
            :disabled="isPublishing"
            :placeholder="t('publish.writePlaceholder')"
            spellcheck="false"
          ></textarea>
        </div>
      </section>
      <section v-if="showConfirmation" class="confirmation-section">
        <h2 class="publish-step">
          <span>02</span>{{ t('publish.confirmStep') }}
        </h2>
        <p
          v-if="githubRepoLabel && publishMode === 'github'"
          class="flat-hint source-repo"
        >
          {{ githubRepoLabel }}
        </p>
        <p
          v-if="githubConflictMessage && publishMode === 'github'"
          class="flat-error"
        >
          {{ githubConflictMessage }}
        </p>
        <div class="flat-form">
          <div v-if="publishMode !== 'github'" class="flat-field">
            <label for="skill-select">{{ t('publish.selectSkill') }}</label
            ><select
              id="skill-select"
              v-model="selectedExistingId"
              :disabled="isPublishing"
            >
              <option value="">{{ t('publish.createNewSkill') }}</option>
              <option
                v-for="skill in mySkills"
                :key="skill.id"
                :value="skill.id"
              >
                {{ skill.name }}
              </option>
            </select>
            <p class="flat-hint">{{ t('publish.skillSelectHint') }}</p>
          </div>
          <div class="flat-field">
            <label for="skill-id">{{
              publishMode === 'github'
                ? t('publish.targetSkillId')
                : t('publish.skillId')
            }}</label
            ><input
              id="skill-id"
              v-model="activeSkillIdModel"
              :readonly="publishMode !== 'github'"
              :disabled="isPublishing"
              pattern="[a-z0-9\-_]+"
            />
            <p v-if="publishMode === 'github'" class="flat-hint">
              {{ t('publish.targetSkillIdHint') }}
            </p>
          </div>
          <dl class="skill-summary">
            <div>
              <dt>{{ t('publish.skillName') }}</dt>
              <dd>{{ form.name }}</dd>
            </div>
            <div>
              <dt>{{ t('publish.description') }}</dt>
              <dd>{{ form.description || t('state.noDesc') }}</dd>
            </div>
          </dl>
          <div v-if="showVisibilitySelector" class="flat-field">
            <label for="skill-visibility">{{
              t('publish.visibilityLabel')
            }}</label
            ><select
              id="skill-visibility"
              v-model="newSkillVisibility"
              :disabled="isPublishing"
            >
              <option value="public">{{ t('visibility.public') }}</option>
              <option value="private">{{ t('visibility.private') }}</option>
            </select>
            <p class="flat-hint">{{ t('publish.visibilityHint') }}</p>
          </div>
          <div class="flat-field">
            <label for="changelog">{{ t('publish.changelog') }}</label
            ><textarea
              id="changelog"
              v-model="form.changelog"
              rows="3"
              :disabled="isPublishing"
              :placeholder="t('publish.changelogPlaceholder')"
            ></textarea>
          </div>
          <p v-if="parseNotice" class="flat-hint" role="status">
            {{ parseNotice }}
          </p>
        </div>
      </section>
      <div v-if="isPublishing" class="progress-container" role="status">
        <progress
          :value="progress"
          max="100"
          :aria-label="t('publish.publishing')"
        ></progress>
        <p class="flat-hint">{{ progressText }}</p>
      </div>
      <div v-if="showConfirmation" class="publish-footer">
        <p class="flat-hint">{{ t('publish.reviewHint') }}</p>
        <div>
          <router-link to="/" class="flat-secondary">{{
            t('common.cancel')
          }}</router-link
          ><button
            type="submit"
            id="submit-btn"
            :disabled="!canPublish || isPublishing || isPreviewLoading"
            class="flat-primary"
          >
            <span v-if="isPublishing" class="spinner spinner-sm"></span
            >{{
              isPublishing ? t('publish.publishing') : t('publish.publishBtn')
            }}
          </button>
        </div>
      </div>
    </form>
  </main>
</template>

<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  reactive,
  watch,
  nextTick,
} from 'vue'
import { useRouter } from 'vue-router'
import JSZip from 'jszip'
import { skillsApi } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'
import type { Skill, GithubImportPreview } from '@/services/api'
import {
  buildSkillMdTemplate,
  skillIdFromParsedName,
  slugifySkillId,
} from '@/utils/publish-skill-md'

const router = useRouter()
const { t } = useI18n()

const fileInput = ref<HTMLInputElement>()
const zipInput = ref<HTMLInputElement>()
const mySkills = ref<Skill[]>([])

const selectedFiles = ref<{ name: string; size: number }[]>([])
const selectedZipBlob = ref<Blob | null>(null)
const selectedFileName = ref('')

const isDragging = ref(false)
const isPublishing = ref(false)
const progress = ref(0)
const progressText = ref('')
const error = ref('')
const errorBannerRef = ref<HTMLElement | null>(null)
const parseNotice = ref('')

watch(error, async (msg) => {
  if (!msg) return
  await nextTick()
  errorBannerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

const selectedExistingId = ref('') // 下拉框选择的已存在 Skill ID

type PublishMode = 'upload' | 'write' | 'github'
const publishMode = ref<PublishMode>('upload')
const skillMdDraft = ref('')
let skillMdParseTimer: ReturnType<typeof setTimeout> | null = null

function clearSkillMdParseTimer() {
  if (skillMdParseTimer != null) {
    clearTimeout(skillMdParseTimer)
    skillMdParseTimer = null
  }
}

onUnmounted(() => {
  clearSkillMdParseTimer()
})

const githubConnect = reactive({
  state: 'idle' as 'idle' | 'checking' | 'ok' | 'fail',
  latency_ms: undefined as number | undefined,
  error: '' as string | undefined,
  detail: '' as string | undefined,
})

const githubSource = ref('')
const githubRef = ref('')
const githubSubpath = ref('')
const githubPreview = ref<GithubImportPreview | null>(null)
const githubTargetId = ref('')
const isPreviewLoading = ref(false)

const form = ref({
  skillId: '',
  name: '',
  description: '',
  changelog: '',
})
const newSkillVisibility = ref<'public' | 'private'>('public')
const showConfirmation = computed(() =>
  publishMode.value === 'github'
    ? !!githubPreview.value
    : !!form.value.name && !!form.value.skillId,
)
watch([githubSource, githubRef, githubSubpath], () => {
  githubPreview.value = null
  githubTargetId.value = ''
})

const isNewSkill = computed(() => selectedExistingId.value === '')
const isGithubTargetExisting = computed(() => {
  const target = githubTargetId.value.trim()
  if (!target) return false
  return mySkills.value.some((s) => s.id === target)
})
const showVisibilitySelector = computed(() => {
  if (publishMode.value === 'github') {
    return !!githubPreview.value && !isGithubTargetExisting.value
  }
  return isNewSkill.value
})

const activeSkillIdModel = computed({
  get() {
    if (publishMode.value === 'github' && githubPreview.value)
      return githubTargetId.value
    return form.value.skillId
  },
  set(v: string) {
    if (publishMode.value === 'github' && githubPreview.value)
      githubTargetId.value = v
    else form.value.skillId = v
  },
})

const githubConnectBannerClass = computed(() => {
  if (githubConnect.state === 'checking') return 'github-connect-checking'
  if (githubConnect.state === 'ok') return 'github-connect-ok'
  if (githubConnect.state === 'fail') return 'github-connect-fail'
  return 'github-connect-idle'
})

const githubConnectTitle = computed(() => {
  if (githubConnect.state === 'checking')
    return t('publish.githubConnectChecking')
  if (githubConnect.state === 'ok') {
    return t('publish.githubConnectOk', { ms: githubConnect.latency_ms ?? 0 })
  }
  if (githubConnect.state === 'fail') return t('publish.githubConnectFail')
  return t('publish.githubConnectIdle')
})

const githubConnectDetailLine = computed(() => {
  if (githubConnect.state === 'fail' && githubConnect.detail)
    return githubConnect.detail
  if (githubConnect.state === 'fail' && githubConnect.error)
    return githubConnect.error
  return ''
})

const githubRepoLabel = computed(() => {
  const p = githubPreview.value
  if (!p) return ''
  const sub = p.subpath ? ` / ${p.subpath}` : ''
  return `${p.repo.owner}/${p.repo.repo} @ ${p.ref}${sub}`
})

const githubConflictMessage = computed(() => {
  const p = githubPreview.value
  if (!p || !p.conflict) return ''
  return t('publish.githubConflictHint', {
    id: p.default_skill_id,
    suggested: p.suggested_skill_id,
  })
})

const canPublish = computed(() => {
  if (publishMode.value === 'github') {
    if (!githubPreview.value) return false
    const tId = githubTargetId.value.trim()
    if (!/^[a-z0-9\-_]+$/.test(tId)) return false
    if (
      githubPreview.value.conflict &&
      tId === githubPreview.value.default_skill_id
    )
      return false
    const mine = mySkills.value.some((s) => s.id === tId)
    if (!mine && !(form.value.name || '').trim()) return false
    return true
  }
  if (publishMode.value === 'write') {
    if (!skillMdDraft.value.trim()) return false
    const parsed = parseSkillMdText(skillMdDraft.value)
    const skillId = skillIdFromParsedName(
      parsed.name,
      form.value.skillId,
    ).trim()
    if (!/^[a-z0-9\-_]+$/.test(skillId)) return false
    if (selectedExistingId.value && selectedExistingId.value !== skillId)
      return false
    if (isNewSkill.value) {
      return !!(parsed.name || form.value.name).trim()
    }
    return true
  }
  if (isNewSkill.value) {
    return !!(form.value.name && selectedFiles.value.length > 0)
  }
  return selectedFiles.value.length > 0
})

onMounted(async () => {
  try {
    const response = await skillsApi.list()
    mySkills.value = response.skills.filter(
      (s: Skill) => s.permission === 'owner' || s.permission === 'collaborator',
    )
  } catch (err) {
    console.error('Failed to load skills:', err)
  }
})

function setPublishMode(mode: PublishMode) {
  if (
    isPublishing.value ||
    isPreviewLoading.value ||
    mode === publishMode.value
  )
    return
  error.value = ''
  if (mode === 'upload') {
    clearGithubImport()
  }
  publishMode.value = mode
  if (mode === 'github') {
    fetchGithubConnectivity()
  }
  if (mode === 'write') {
    githubPreview.value = null
    githubTargetId.value = ''
    if (!skillMdDraft.value.trim()) fillSkillMdTemplate()
    else applySkillMdParse(skillMdDraft.value)
  }
}

async function fetchGithubConnectivity() {
  githubConnect.state = 'checking'
  githubConnect.latency_ms = undefined
  githubConnect.error = undefined
  githubConnect.detail = undefined
  try {
    const r = await skillsApi.importGithubConnectivity()
    if (r.reachable) {
      githubConnect.state = 'ok'
      githubConnect.latency_ms = r.latency_ms
    } else {
      githubConnect.state = 'fail'
      githubConnect.error = r.error
      githubConnect.detail = r.detail
    }
  } catch (e: any) {
    githubConnect.state = 'fail'
    githubConnect.error = 'request_failed'
    githubConnect.detail = e?.message || ''
  }
}

function clearGithubImport() {
  githubPreview.value = null
  githubTargetId.value = ''
  githubSource.value = ''
  githubRef.value = ''
  githubSubpath.value = ''
  form.value.skillId = ''
  form.value.name = ''
  form.value.description = ''
  newSkillVisibility.value = 'public'
  clearParseNotice()
}

async function runGithubPreview() {
  const src = githubSource.value.trim()
  if (!src) return
  isPreviewLoading.value = true
  error.value = ''
  clearParseNotice()
  try {
    const body: { source: string; ref?: string; subpath?: string } = {
      source: src,
    }
    if (githubRef.value.trim()) body.ref = githubRef.value.trim()
    if (githubSubpath.value.trim()) body.subpath = githubSubpath.value.trim()
    const p = await skillsApi.importGithubPreview(body)
    githubPreview.value = p
    githubTargetId.value = p.conflict
      ? p.suggested_skill_id
      : p.default_skill_id
    form.value.skillId = githubTargetId.value
    form.value.name = (p.name || '').trim()
    form.value.description = (p.description || '').trim().slice(0, DESC_MAX)
    selectedZipBlob.value = null
    selectedFileName.value = ''
    selectedFiles.value = []
    selectedExistingId.value = ''
    if (fileInput.value) fileInput.value.value = ''
    if (zipInput.value) zipInput.value.value = ''
    globalToast.success(
      t('publish.githubPreviewOk', { id: githubTargetId.value }),
    )
  } catch (err: any) {
    githubPreview.value = null
    error.value = err.message || t('publish.githubPreviewFailed')
  } finally {
    isPreviewLoading.value = false
  }
}

async function handleGithubImport() {
  if (!githubPreview.value) return
  const skillId = githubTargetId.value.trim()
  if (!/^[a-z0-9\-_]+$/.test(skillId)) {
    error.value = t('publish.invalidSkillId')
    return
  }
  if (
    githubPreview.value.conflict &&
    skillId === githubPreview.value.default_skill_id
  ) {
    error.value = t('publish.githubMustChangeId')
    return
  }
  const mine = mySkills.value.some((s) => s.id === skillId)
  if (!mine) {
    const name = form.value.name.trim()
    if (!name) {
      error.value = t('publish.githubNameRequired')
      return
    }
  }

  isPublishing.value = true
  progress.value = 0
  progressText.value = t('publish.preparing')
  error.value = ''

  try {
    progressText.value = t('publish.uploading')
    const progressInterval = setInterval(() => {
      if (progress.value < 90) progress.value += Math.random() * 15
    }, 200)

    const body = {
      source: githubSource.value.trim(),
      target_skill_id: skillId,
      changelog: form.value.changelog.trim(),
      ...(!mine ? { visibility: newSkillVisibility.value } : {}),
      ...(githubRef.value.trim() ? { ref: githubRef.value.trim() } : {}),
      ...(githubSubpath.value.trim()
        ? { subpath: githubSubpath.value.trim() }
        : {}),
    }
    await skillsApi.importGithub(body)
    clearInterval(progressInterval)
    progress.value = 100
    progressText.value = t('publish.completed')
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (err: any) {
    if (err.status === 409 && err.data?.suggested_skill_id) {
      githubTargetId.value = err.data.suggested_skill_id
      error.value =
        (err.message || t('publish.githubConflictPublish')) +
        ' ' +
        t('publish.githubSuggestedId', { id: err.data.suggested_skill_id })
    } else {
      error.value = err.message || t('publish.uploadFailed')
    }
    isPublishing.value = false
  }
}

// === 工具函数 ===
const DESC_MAX = 500

function currentWriteTemplate(): string {
  const bodyPlaceholder = t('publish.writeBodyPlaceholder')
  if (selectedExistingId.value) {
    const skill = mySkills.value.find((s) => s.id === selectedExistingId.value)
    const name = (
      skill?.name ||
      skill?.id ||
      t('publish.writeDefaultName')
    ).trim()
    const description = (
      skill?.description || t('publish.writeDefaultDescription')
    ).trim()
    return buildSkillMdTemplate({ name, description, bodyPlaceholder })
  }
  return buildSkillMdTemplate({
    name: t('publish.writeDefaultName'),
    description: t('publish.writeDefaultDescription'),
    bodyPlaceholder,
  })
}

function applySkillMdParse(text: string) {
  const parsed = parseSkillMdText(text)
  if (parsed.name) {
    form.value.skillId = skillIdFromParsedName(parsed.name, form.value.skillId)
    form.value.name = parsed.name
  }
  if (parsed.description) {
    form.value.description = parsed.description.slice(0, DESC_MAX)
  }
}

function fillSkillMdTemplate(opts?: { toast?: boolean }) {
  skillMdDraft.value = currentWriteTemplate()
  applySkillMdParse(skillMdDraft.value)
  if (opts?.toast) globalToast.success(t('publish.writeResetToast'))
}

function resetSkillMdTemplate() {
  fillSkillMdTemplate({ toast: true })
}

watch(skillMdDraft, (text) => {
  if (publishMode.value !== 'write') return
  clearSkillMdParseTimer()
  skillMdParseTimer = setTimeout(() => {
    skillMdParseTimer = null
    if (!text.trim()) return
    applySkillMdParse(text)
  }, 300)
})

watch(selectedExistingId, () => {
  if (publishMode.value !== 'write') return
  fillSkillMdTemplate()
})

function pickSkillMdPath(paths: string[]) {
  const matches = paths.filter((p) => /(^|\/)SKILL\.md$/i.test(p))
  if (!matches.length) return null
  return matches.slice().sort((a, b) => a.length - b.length)[0]
}

function parseYamlFrontmatterBlock(yaml: string) {
  const out: Record<string, string> = {}
  const lines = yaml.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line === undefined) {
      i += 1
      continue
    }
    const m = line.match(/^([\w-]+):\s*(.*)$/)
    if (!m || !m[1]) {
      i += 1
      continue
    }
    const key = m[1]
    let rest = m[2]?.trimEnd() || ''
    const blockStarter = ['>', '|', '>-', '>+', '|-', '|+'].includes(rest)
    if (blockStarter) {
      i += 1
      const buf: string[] = []
      const folded = rest === '>' || rest === '>-' || rest === '>+'
      while (i < lines.length) {
        const L = lines[i]
        if (L === undefined) break
        const nextKey = L.match(/^([\w-]+):\s/)
        if (nextKey && !L.startsWith('  ') && buf.length) break
        if (L.startsWith('  ') || (L === '' && buf.length)) {
          buf.push(L.startsWith('  ') ? L.slice(2) : '')
        } else if (buf.length) break
        else if (L === '') {
          i += 1
          continue
        } else break
        i += 1
      }
      out[key] = folded
        ? buf.join(' ').replace(/\s+/g, ' ').trim()
        : buf.join('\n').trim()
      continue
    }
    out[key] = rest.replace(/^["'](.+)["']$/, '$1').trim()
    i += 1
  }
  return out
}

function parseSkillMdText(full: string) {
  let rest = full
  let name = ''
  let description = ''
  const fmMatch = full.match(/^---\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/)
  if (fmMatch && fmMatch[1]) {
    const y = parseYamlFrontmatterBlock(fmMatch[1])
    name = (y.name || '').trim()
    description = (y.description || '').trim()
    rest = full.slice(fmMatch[0].length)
  }
  if (!name) {
    const h1 = rest.match(/^#\s+(.+)$/m)
    if (h1 && h1[1]) name = h1[1].trim()
  }
  if (!description) {
    const afterH1 = rest.replace(/^#\s+.+$/m, '').trim()
    const para = afterH1.split(/\n\n+/).find((p) => {
      const t = p.trim()
      return t && !t.startsWith('#') && !t.startsWith('```')
    })
    if (para) description = para.replace(/\s*\n\s*/g, ' ').trim()
  }
  if (description.length > DESC_MAX)
    description = description.slice(0, DESC_MAX)
  return { name, description }
}

function applyAutofillFromSkill(
  slugFromPackage: string,
  parsed: { name: string; description: string },
) {
  if (slugFromPackage) form.value.skillId = slugFromPackage
  form.value.name = parsed.name || ''
  form.value.description = parsed.description || ''
}

function clearParseNotice() {
  parseNotice.value = ''
}

function showParseSuccessNotice() {
  parseNotice.value = t('publish.parseSuccessDetail', {
    count: selectedFiles.value.length,
    skillId: form.value.skillId || '-',
    name: form.value.name || '-',
  })
  globalToast.success(
    t('publish.parseSuccessToast', {
      skillId: form.value.skillId || '-',
    }),
  )
}

async function readSkillMdFromZipInstance(zip: JSZip, fileList: string[]) {
  const skillPath = pickSkillMdPath(fileList)
  if (!skillPath) return null
  const f = zip.file(skillPath)
  if (!f) return null
  return f.async('string')
}

/** Safari：直接把 File 塞进 JSZip 再 async('string') 会报 unsupported data；先读成 ArrayBuffer 再写入即可 */
async function addFileToZip(zip: JSZip, path: string, file: File) {
  const buf = await file.arrayBuffer()
  zip.file(path, buf)
}

// === 文件操作事件 ===

function triggerFileInput() {
  fileInput.value?.click()
}

// input directory select
async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  error.value = ''
  clearParseNotice()
  githubPreview.value = null
  githubTargetId.value = ''
  selectedFiles.value = []
  let totalSize = 0

  const zip = new JSZip()
  const paths: string[] = []

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      const path = file.webkitRelativePath
      await addFileToZip(zip, path, file)
      paths.push(path)
      selectedFiles.value.push({ name: path, size: file.size })
      totalSize += file.size
    }

    if (!pickSkillMdPath(paths)) {
      error.value = '上传的目录中未找到 SKILL.md 文件'
      return
    }

    const skillText = await readSkillMdFromZipInstance(zip, paths)
    const parsed =
      skillText != null
        ? parseSkillMdText(skillText)
        : { name: '', description: '' }
    const firstFile = files[0]
    const rootSlug = firstFile
      ? slugifySkillId(firstFile.webkitRelativePath.split('/')[0] || '')
      : ''

    selectedZipBlob.value = await zip.generateAsync({ type: 'blob' })
    selectedFileName.value = 'skill-package.zip'

    applyAutofillFromSkill(rootSlug, parsed)
    showParseSuccessNotice()
  } catch (err: any) {
    error.value = '处理文件失败: ' + err.message
  }
}

// .zip file select
async function handleZipSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  error.value = ''
  clearParseNotice()
  githubPreview.value = null
  githubTargetId.value = ''
  if (!file.name.toLowerCase().endsWith('.zip')) {
    error.value = '请选择 .zip 文件'
    return
  }

  const slug = slugifySkillId(file.name)
  await processZipFile(file, slug)
  if (zipInput.value) zipInput.value.value = ''
}

async function processZipFile(file: File, slug: string) {
  try {
    const zip = await JSZip.loadAsync(file)
    const paths: string[] = []
    zip.forEach((relPath, zf) => {
      if (!zf.dir) paths.push(relPath)
    })

    if (!pickSkillMdPath(paths)) {
      error.value = 'zip 中未找到 SKILL.md'
      return
    }

    const text = await readSkillMdFromZipInstance(zip, paths)
    const parsed =
      text != null ? parseSkillMdText(text) : { name: '', description: '' }

    selectedZipBlob.value = file
    selectedFileName.value = file.name
    selectedFiles.value = paths.map((p) => ({ name: p, size: 0 }))
    applyAutofillFromSkill(slug, parsed)
    showParseSuccessNotice()
  } catch (err: any) {
    error.value = '读取 zip 失败: ' + err.message
  }
}

// drop zone
function handleDragLeave(event: DragEvent) {
  const zone = event.currentTarget as HTMLElement
  if (event.relatedTarget instanceof Node && zone.contains(event.relatedTarget)) return
  isDragging.value = false
}

async function handleDrop(event: DragEvent) {
  if (isPublishing.value) return
  isDragging.value = false
  error.value = ''
  clearParseNotice()
  githubPreview.value = null
  githubTargetId.value = ''
  const items = event.dataTransfer?.items

  if (!items || items.length === 0) return

  const first = items[0]
  if (!first || first.kind !== 'file') {
    error.value = '请拖拽文件夹或 zip 文件'
    return
  }

  const entry = first.webkitGetAsEntry()
  if (!entry) {
    error.value = '无法读取拖拽项'
    return
  }

  if (entry.isFile && entry.name.toLowerCase().endsWith('.zip')) {
    const file = await new Promise<File>((resolve, reject) => {
      ;(entry as FileSystemFileEntry).file(resolve, reject)
    })
    const slug = slugifySkillId(file.name)
    await processZipFile(file, slug)
    return
  }

  let rootSlug = ''
  if (entry.isDirectory) {
    rootSlug = slugifySkillId(entry.name)
  }

  const zip = new JSZip()
  const paths: string[] = []
  selectedFiles.value = []
  let totalSize = 0

  try {
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item && item.kind === 'file') {
        const e = item.webkitGetAsEntry()
        if (e) {
          await traverseEntry(e, zip, '', paths, (size, fullPath) => {
            selectedFiles.value.push({ name: fullPath, size })
            totalSize += size
          })
        }
      }
    }

    if (!pickSkillMdPath(paths)) {
      error.value = '上传的目录中未找到 SKILL.md 文件'
      return
    }

    const skillText = await readSkillMdFromZipInstance(zip, paths)
    const parsed =
      skillText != null
        ? parseSkillMdText(skillText)
        : { name: '', description: '' }

    selectedZipBlob.value = await zip.generateAsync({ type: 'blob' })
    selectedFileName.value = 'skill-package.zip'
    applyAutofillFromSkill(rootSlug, parsed)
    showParseSuccessNotice()
  } catch (err: any) {
    error.value = '处理文件失败: ' + err.message
  }
}

async function traverseEntry(
  entry: any,
  zip: JSZip,
  path: string,
  fileList: string[],
  onFile: (size: number, fullPath: string) => void,
) {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file(resolve, reject)
    })
    const fullPath = path + entry.name
    await addFileToZip(zip, fullPath, file)
    fileList.push(fullPath)
    if (onFile) onFile(file.size, fullPath)
  } else if (entry.isDirectory) {
    const dirPath = path + entry.name + '/'
    const reader = entry.createReader()

    const entries = await new Promise<any[]>((resolve, reject) => {
      const results: any[] = []
      const readEntries = () => {
        reader.readEntries((items: any[]) => {
          if (items.length === 0) {
            resolve(results)
          } else {
            results.push(...items)
            readEntries()
          }
        }, reject)
      }
      readEntries()
    })

    for (const child of entries) {
      await traverseEntry(child, zip, dirPath, fileList, onFile)
    }
  }
}

function clearFiles() {
  selectedFiles.value = []
  selectedZipBlob.value = null
  selectedFileName.value = ''
  clearParseNotice()
  form.value.skillId = ''
  form.value.name = ''
  form.value.description = ''
  newSkillVisibility.value = 'public'
  githubPreview.value = null
  githubTargetId.value = ''
  if (fileInput.value) fileInput.value.value = ''
  if (zipInput.value) zipInput.value.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function handleWritePublish() {
  const draft = skillMdDraft.value.trim()
  if (!draft) {
    error.value = t('publish.writeEmpty')
    return
  }
  applySkillMdParse(draft)
  const skillId = form.value.skillId.trim()
  if (!skillId) {
    error.value = t('publish.writeMissingId')
    return
  }
  if (!/^[a-z0-9\-_]+$/.test(skillId)) {
    error.value = t('publish.invalidSkillId')
    return
  }
  if (selectedExistingId.value && selectedExistingId.value !== skillId) {
    error.value =
      '上传包的 Skill ID 与下拉框所选已有 Skill 不一致，请重新选择或更换压缩包'
    return
  }
  if (isNewSkill.value) {
    const name = form.value.name.trim()
    if (!name) {
      error.value = 'SKILL.md 中缺少可用的 Skill 名称'
      return
    }
    const desc = form.value.description.trim()
    if (!desc) {
      error.value = 'SKILL.md 中缺少描述'
      return
    }
    if (desc.length > DESC_MAX) {
      error.value = `描述不能超过 ${DESC_MAX} 字`
      return
    }
  }

  isPublishing.value = true
  progress.value = 0
  progressText.value = t('publish.preparing')
  error.value = ''

  try {
    const zip = new JSZip()
    zip.file('SKILL.md', skillMdDraft.value)
    const blob = await zip.generateAsync({ type: 'blob' })
    selectedZipBlob.value = blob
    selectedFileName.value = 'skill-package.zip'

    progressText.value = t('publish.uploading')
    const progressInterval = setInterval(() => {
      if (progress.value < 90) progress.value += Math.random() * 15
    }, 200)

    const formData = new FormData()
    formData.append('zip_file', blob, 'skill-package.zip')
    formData.append('skill_id', skillId)
    if (isNewSkill.value) {
      formData.append('name', form.value.name.trim())
      formData.append('description', form.value.description.trim())
      formData.append('visibility', newSkillVisibility.value)
    }
    if (form.value.changelog.trim()) {
      formData.append('changelog', form.value.changelog.trim())
    }

    await skillsApi.upload(formData)
    clearInterval(progressInterval)
    progress.value = 100
    progressText.value = t('publish.completed')
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (err: any) {
    error.value = err.message || t('publish.uploadFailed')
    isPublishing.value = false
  }
}

async function handlePublish() {
  if (isPublishing.value || isPreviewLoading.value || !canPublish.value) return
  if (publishMode.value === 'github') {
    await handleGithubImport()
    return
  }
  if (publishMode.value === 'write') {
    await handleWritePublish()
    return
  }
  if (!selectedZipBlob.value) return

  error.value = ''

  const skillId = form.value.skillId.trim()
  if (!skillId) {
    error.value = '无法从上传包得到 Skill ID，请使用合法文件夹名或 zip 文件名'
    return
  }
  if (!/^[a-z0-9\-_]+$/.test(skillId)) {
    error.value = t('publish.invalidSkillId')
    return
  }

  if (selectedExistingId.value && selectedExistingId.value !== skillId) {
    error.value =
      '上传包的 Skill ID 与下拉框所选已有 Skill 不一致，请重新选择或更换压缩包'
    return
  }

  if (isNewSkill.value) {
    const name = form.value.name.trim()
    if (!name) {
      error.value = 'SKILL.md 中缺少可用的 Skill 名称'
      return
    }
    const desc = form.value.description.trim()
    if (!desc) {
      error.value = 'SKILL.md 中缺少描述'
      return
    }
    if (desc.length > DESC_MAX) {
      error.value = `描述不能超过 ${DESC_MAX} 字`
      return
    }
  }

  isPublishing.value = true
  progress.value = 0
  progressText.value = t('publish.preparing')

  try {
    progressText.value = t('publish.uploading')
    // 模拟进度条
    const progressInterval = setInterval(() => {
      if (progress.value < 90) progress.value += Math.random() * 15
    }, 200)

    const formData = new FormData()
    formData.append('zip_file', selectedZipBlob.value, selectedFileName.value)
    formData.append('skill_id', skillId)

    if (isNewSkill.value) {
      formData.append('name', form.value.name.trim())
      formData.append('description', form.value.description.trim())
      formData.append('visibility', newSkillVisibility.value)
    }

    if (form.value.changelog.trim()) {
      formData.append('changelog', form.value.changelog.trim())
    }

    const response = await skillsApi.upload(formData)
    clearInterval(progressInterval)

    progress.value = 100
    progressText.value = t('publish.completed')

    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (err: any) {
    error.value = err.message || t('publish.uploadFailed')
    isPublishing.value = false
  }
}
</script>

<style scoped>
.publish-page {
  max-width: 960px;
}
.publish-mode-tabs {
  display: flex;
  gap: 28px;
  margin-bottom: 32px;
  border-bottom: 1px solid var(--color-base-800);
}
.publish-mode-tabs button {
  padding: 12px 0;
  margin-bottom: -1px;
  border-bottom: 2px solid transparent;
  color: var(--color-base-400);
  font-size: 14px;
  cursor: pointer;
}
.publish-mode-tabs button.active {
  color: var(--color-fg-strong);
  border-bottom-color: var(--color-fg-strong);
  font-weight: 600;
}
.publish-form {
  gap: 32px;
}
.publish-step {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-size: 17px;
  color: var(--color-fg-strong);
  font-weight: 600;
  margin-bottom: 24px;
}
.publish-step span {
  color: var(--color-base-400);
  font-size: 12px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
}
.publish-two-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-top: 20px;
}
.github-actions,
.upload-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.github-connection {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
  font-size: 12px;
  color: var(--color-base-400);
}
.github-connection p {
  width: 100%;
  overflow-wrap: anywhere;
}
.github-connect-fail {
  color: var(--color-danger, #dc2626);
}
.drop-zone {
  padding: 28px;
  border: 1px dashed var(--color-base-400);
  border-radius: 8px;
  background: color-mix(in srgb, var(--color-base-900) 55%, transparent);
  transition: background 150ms, border-color 150ms;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
}
.drop-zone > svg {
  color: var(--color-base-400);
}
.drop-zone h3 {
  color: var(--color-fg-strong);
  font-size: 18px;
  font-weight: 500;
}
.drop-zone.drag-over {
  background: var(--color-base-900);
  outline: 2px dashed var(--color-neon-400);
  outline-offset: -2px;
  border-color: var(--color-neon-400);
}
.file-preview {
  margin-top: 24px;
}
.file-preview-list {
  max-height: 180px;
  overflow-y: auto;
  margin: 16px 0;
  font: 12px/1.8 var(--font-mono);
  overflow-wrap: anywhere;
}
.file-preview-list span {
  color: var(--color-base-400);
  margin-left: 8px;
}
.write-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.write-skill-editor {
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  resize: vertical;
}
.confirmation-section {
  border-top: 1px solid var(--color-base-800);
  padding-top: 32px;
}
.source-repo {
  margin-bottom: 24px;
  font-family: var(--font-mono);
}
.skill-summary {
  display: grid;
  gap: 20px;
}
.skill-summary div {
  display: grid;
  grid-template-columns: 100px minmax(0, 1fr);
  gap: 16px;
}
.skill-summary dt {
  font-size: 13px;
  color: var(--color-base-400);
}
.skill-summary dd {
  font-size: 14px;
  color: var(--color-fg-strong);
  overflow-wrap: anywhere;
  line-height: 1.7;
}
.publish-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  border-top: 1px solid var(--color-base-800);
  padding-top: 24px;
}
.publish-footer > div {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}
.progress-container progress {
  width: 100%;
  height: 6px;
  accent-color: var(--color-neon-400);
}
@media (max-width: 640px) {
  .publish-mode-tabs {
    gap: 24px;
  }
  .publish-mode-tabs button {
    font-size: 13px;
  }
  .publish-two-fields {
    grid-template-columns: 1fr;
  }
  .publish-footer {
    align-items: stretch;
    flex-direction: column;
  }
  .publish-footer > div {
    justify-content: flex-end;
  }
  .skill-summary div {
    grid-template-columns: 1fr;
    gap: 6px;
  }
}
</style>
