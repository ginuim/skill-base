<template>
    <main class="page-content">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 pb-16" style="max-width: 720px;">
        <!-- 面包屑 -->
        <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
          <span class="text-neon-400">~</span>
          <span class="opacity-50">/</span>
          <router-link to="/" class="hover:text-fg-strong transition-colors">home</router-link>
          <span class="opacity-50">/</span>
          <span class="text-fg-strong">publish</span>
        </div>

        <div class="card publish-card relative overflow-hidden p-8">
          <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">CMD-PUB</div>

          <h1 class="text-2xl font-bold text-fg-strong mb-6 flex items-center gap-3">
            <span class="text-neon-400 font-mono font-normal opacity-70">></span>
            <span>{{ t('publish.title') }}</span>
          </h1>

          <div class="publish-mode-tabs" role="tablist" :aria-label="t('publish.modeTablistLabel')">
            <button
              type="button"
              role="tab"
              :aria-selected="publishMode === 'upload'"
              class="publish-mode-tab"
              :class="{ active: publishMode === 'upload' }"
              @click="setPublishMode('upload')"
            >
              {{ t('publish.tabUpload') }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="publishMode === 'write'"
              class="publish-mode-tab"
              :class="{ active: publishMode === 'write' }"
              @click="setPublishMode('write')"
            >
              {{ t('publish.tabWrite') }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="publishMode === 'github'"
              class="publish-mode-tab"
              :class="{ active: publishMode === 'github' }"
              @click="setPublishMode('github')"
            >
              {{ t('publish.tabGithub') }}
            </button>
          </div>

          <form @submit.prevent="handlePublish" class="space-y-6">
            <div
              v-if="error"
              ref="errorBannerRef"
              class="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              role="alert"
              aria-live="assertive"
            >
              {{ error }}
            </div>
            <!-- GitHub 导入 -->
            <div v-show="publishMode === 'github'" class="github-import-panel form-group">
              <div class="github-import-header">
                <div class="min-w-0">
                  <label class="form-label font-mono text-neon-400 mb-1 block">{{ t('publish.githubHeading') }}</label>
                  <p class="github-import-hint">{{ t('publish.githubHint') }}</p>
                </div>
                <button
                  type="button"
                  class="github-connect-action"
                  :disabled="githubConnect.state === 'checking'"
                  @click="fetchGithubConnectivity"
                >
                  {{ githubConnect.state === 'checking' ? t('publish.githubConnectChecking') : t('publish.githubConnectRetry') }}
                </button>
              </div>

              <div
                class="github-connect-banner font-mono text-sm rounded-lg border"
                :class="githubConnectBannerClass"
              >
                <p class="font-medium leading-snug">{{ githubConnectTitle }}</p>
                <p v-if="githubConnectDetailLine" class="text-xs opacity-90 break-all">{{ githubConnectDetailLine }}</p>
                <p v-if="publishMode === 'github' && githubConnect.state === 'fail'" class="text-xs opacity-80 mt-2">
                  {{ t('publish.githubConnectHintNetwork') }}
                </p>
              </div>

              <div class="github-source-card">
                <div>
                  <label for="github-source" class="github-field-label required">{{ t('publish.tabGithub') }}</label>
                  <input
                    id="github-source"
                    v-model="githubSource"
                    type="text"
                    class="rounded-lg px-4 py-2.5 w-full github-source-input"
                    :disabled="isPublishing || isPreviewLoading"
                    :placeholder="t('publish.githubSourcePlaceholder')"
                    autocomplete="off"
                  >
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="github-field-label">{{ t('publish.githubRef') }}</label>
                    <input
                      v-model="githubRef"
                      type="text"
                      class="rounded-lg px-4 py-2.5 w-full"
                      :disabled="isPublishing || isPreviewLoading"
                      :placeholder="t('publish.githubRefPlaceholder')"
                      autocomplete="off"
                    >
                  </div>
                  <div>
                    <label class="github-field-label">{{ t('publish.githubSubpath') }}</label>
                    <input
                      v-model="githubSubpath"
                      type="text"
                      class="rounded-lg px-4 py-2.5 w-full"
                      :disabled="isPublishing || isPreviewLoading"
                      :placeholder="t('publish.githubSubpathPlaceholder')"
                      autocomplete="off"
                    >
                  </div>
                </div>

                <div class="github-import-actions">
                  <button
                    type="button"
                    class="btn btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
                    :disabled="isPublishing || isPreviewLoading || !githubSource.trim()"
                    :aria-busy="isPreviewLoading"
                    @click="runGithubPreview"
                  >
                    <span v-if="isPreviewLoading" class="spinner spinner-sm" aria-hidden="true"></span>
                    {{ isPreviewLoading ? t('publish.githubPreviewing') : t('publish.githubPreview') }}
                  </button>
                  <button
                    v-if="githubPreview"
                    type="button"
                    class="github-clear-action"
                    @click="clearGithubImport"
                  >
                    {{ t('publish.githubClear') }}
                  </button>
                </div>
              </div>

              <div v-if="githubPreview" class="github-preview-card">
                <div class="github-preview-kicker">{{ t('publish.githubPreviewOk', { id: githubTargetId }) }}</div>
                <p v-if="githubRepoLabel" class="github-preview-repo">{{ githubRepoLabel }}</p>
                <p v-if="githubConflictMessage" class="github-conflict-message">{{ githubConflictMessage }}</p>
              </div>
            </div>

            <!-- 文件上传 -->
            <div v-show="publishMode === 'upload'" class="form-group">
              <label class="form-label font-mono text-base-400 mb-2 block required">{{ t('publish.uploadFile') }}</label>
              <div
                id="drop-zone"
                class="drop-zone"
                :class="{ 'drag-over': isDragging }"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
                @click="triggerFileInput"
              >
                <div class="drop-zone-icon">
                  <Upload :size="32" :stroke-width="2" aria-hidden="true" />
                </div>
                <div class="drop-zone-text">{{ t('publish.dropZoneText') }}</div>
                <div class="drop-zone-subtitle">{{ t('publish.dropZoneSubtitle') }}</div>
                <div class="drop-zone-hint">{{ t('publish.dropZoneHint') }}</div>
              </div>

              <input
                ref="fileInput"
                type="file"
                webkitdirectory
                directory
                multiple
                class="hidden"
                @change="handleFileSelect"
              >

              <div class="divider">
                <span>OR</span>
              </div>

              <div class="text-center">
                <label class="btn btn-secondary zip-select-btn px-4 py-2 rounded-lg cursor-pointer">
                  <span class="text-neon-400">📎</span>
                  <span>{{ t('publish.selectZip') }}</span>
                  <input type="file" ref="zipInput" class="hidden" accept=".zip" @change="handleZipSelect">
                </label>
              </div>

              <div id="file-preview" class="file-preview" :class="{ 'visible': selectedFiles.length > 0 }">
                <div class="file-preview-header">
                  <span>{{ t('publish.selectedFiles') }}</span>
                  <button type="button" class="file-preview-clear" @click="clearFiles">[ clear ]</button>
                </div>
                <div id="file-preview-list" class="file-preview-list">
                  <div v-for="file in selectedFiles.slice(0, 20)" :key="file.name" class="file-item">
                    {{ file.name }} ({{ formatFileSize(file.size) }})
                  </div>
                  <div v-if="selectedFiles.length > 20" class="mt-2 text-neon-400">
                    {{ t('publish.moreFiles', { count: selectedFiles.length - 20 }) }}
                  </div>
                </div>
                <div id="file-preview-summary" class="file-preview-summary">
                  {{ t('publish.totalFiles', { count: selectedFiles.length }) }}
                </div>
              </div>
            </div>

            <!-- 在线编写 -->
            <div v-show="publishMode === 'write'" class="form-group write-skill-panel">
              <div class="write-skill-header">
                <div class="min-w-0">
                  <label for="skill-md-editor" class="form-label font-mono text-neon-400 mb-1 block">
                    {{ t('publish.writeHeading') }}
                  </label>
                  <p class="write-skill-hint">{{ t('publish.writeHint') }}</p>
                </div>
                <button
                  type="button"
                  class="write-reset-action"
                  :disabled="isPublishing"
                  @click="resetSkillMdTemplate"
                >
                  {{ t('publish.writeResetTemplate') }}
                </button>
              </div>
              <textarea
                id="skill-md-editor"
                v-model="skillMdDraft"
                rows="18"
                class="rounded-lg px-4 py-2.5 w-full write-skill-editor"
                :disabled="isPublishing"
                :placeholder="t('publish.writePlaceholder')"
                spellcheck="false"
              ></textarea>
            </div>

            <!-- Skill 选择 -->
            <div class="form-group">
              <label for="skill-select" class="form-label font-mono text-base-400 mb-2 block">{{ t('publish.selectSkill') }}</label>
              <select
                id="skill-select"
                v-model="selectedExistingId"
                class="rounded-lg px-4 py-2.5 w-full"
                :disabled="isPublishing || publishMode === 'github'"
              >
                <option value="">-- {{ t('publish.createNewSkill') }} --</option>
                <option
                  v-for="skill in mySkills"
                  :key="skill.id"
                  :value="skill.id"
                >
                  {{ skill.name }}
                </option>
              </select>
              <p class="form-hint">{{ t('publish.skillSelectHint') }}</p>
            </div>

            <!-- Skill 元信息 (只读) -->
            <div class="skill-meta-readonly space-y-4 pt-4 border-t border-base-800">
              <div class="form-group">
                <label for="skill-id" class="form-label font-mono text-base-400 mb-2 block required">{{ publishMode === 'github' && githubPreview ? t('publish.targetSkillId') : t('publish.skillId') }}</label>
                <input
                  type="text"
                  id="skill-id"
                  v-model="activeSkillIdModel"
                  :readonly="!(publishMode === 'github' && githubPreview)"
                  :placeholder="t('publish.skillIdPlaceholder')"
                  pattern="[a-z0-9\-_]+"
                  class="rounded-lg px-4 py-2.5 w-full"
                >
                <p class="form-hint">{{ publishMode === 'github' && githubPreview ? t('publish.targetSkillIdHint') : t('publish.skillIdHint') }}</p>
              </div>

              <div class="form-group">
                <label for="skill-name" class="form-label font-mono text-base-400 mb-2 block required">{{ t('publish.skillName') }}</label>
                <input
                  type="text"
                  id="skill-name"
                  v-model="form.name"
                  readonly
                  :placeholder="t('publish.skillNamePlaceholder')"
                  class="rounded-lg px-4 py-2.5 w-full"
                >
              </div>

              <div class="form-group">
                <label for="skill-description" class="form-label font-mono text-base-400 mb-2 block required">{{ t('publish.description') }}</label>
                <textarea
                  id="skill-description"
                  v-model="form.description"
                  rows="3"
                  readonly
                  maxlength="500"
                  :placeholder="t('publish.descriptionPlaceholder')"
                  class="rounded-lg px-4 py-2.5 w-full"
                ></textarea>
                <p class="form-hint"><span class="text-neon-400">{{ form.description.length }}</span> / 500 chars</p>
              </div>

              <div v-if="showVisibilitySelector" class="form-group">
                <label for="skill-visibility" class="form-label font-mono text-base-400 mb-2 block">{{ t('publish.visibilityLabel') }}</label>
                <select
                  id="skill-visibility"
                  v-model="newSkillVisibility"
                  class="rounded-lg px-4 py-2.5 w-full"
                >
                  <option value="public">{{ t('visibility.public') }}</option>
                  <option value="private">{{ t('visibility.private') }}</option>
                </select>
                <p class="form-hint">{{ t('publish.visibilityHint') }}</p>
              </div>
            </div>

            <!-- 更新说明 -->
            <div class="form-group pt-4 border-t border-base-800">
              <label for="changelog" class="form-label font-mono text-base-400 mb-2 block">{{ t('publish.changelog') }}</label>
              <textarea
                id="changelog"
                v-model="form.changelog"
                rows="4"
                :disabled="isPublishing"
                :placeholder="t('publish.changelogPlaceholder')"
                class="rounded-lg px-4 py-2.5 w-full"
              ></textarea>
            </div>

            <!-- 解析成功提示 -->
            <div
              v-if="parseNotice"
              class="parse-success"
              role="status"
              aria-live="polite"
            >
              <div class="parse-success-title">{{ t('publish.parseSuccessTitle') }}</div>
              <div class="parse-success-text">{{ parseNotice }}</div>
            </div>

            <!-- 进度条 -->
            <div v-if="isPublishing" class="progress-container visible">
              <div class="progress-bar-wrapper">
                <div class="progress-bar" :style="{ width: progress + '%' }"></div>
              </div>
              <p class="progress-text">{{ progressText }}</p>
            </div>

            <!-- 提交按钮 -->
            <div class="flex gap-4 justify-end pt-6 border-t border-base-800 mt-8">
              <router-link to="/" class="btn btn-secondary px-6 py-2.5 rounded-lg">{{ t('common.cancel') }}</router-link>
              <button
                type="submit"
                id="submit-btn"
                :disabled="!canPublish || isPublishing"
                class="btn btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2"
              >
                <Upload v-if="!isPublishing" :size="16" :stroke-width="2" aria-hidden="true" />
                <span v-if="isPublishing" class="spinner spinner-sm"></span>
                {{ isPublishing ? t('publish.publishing') : t('publish.publishBtn') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
</template>

<script setup lang="ts">
import { Upload } from 'lucide-vue-next'
import { ref, computed, onMounted, onUnmounted, reactive, watch, nextTick } from 'vue'
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

const selectedFiles = ref<{name: string, size: number}[]>([])
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
    if (publishMode.value === 'github' && githubPreview.value) return githubTargetId.value
    return form.value.skillId
  },
  set(v: string) {
    if (publishMode.value === 'github' && githubPreview.value) githubTargetId.value = v
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
  if (githubConnect.state === 'checking') return t('publish.githubConnectChecking')
  if (githubConnect.state === 'ok') {
    return t('publish.githubConnectOk', { ms: githubConnect.latency_ms ?? 0 })
  }
  if (githubConnect.state === 'fail') return t('publish.githubConnectFail')
  return t('publish.githubConnectIdle')
})

const githubConnectDetailLine = computed(() => {
  if (githubConnect.state === 'fail' && githubConnect.detail) return githubConnect.detail
  if (githubConnect.state === 'fail' && githubConnect.error) return githubConnect.error
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
    if (githubPreview.value.conflict && tId === githubPreview.value.default_skill_id) return false
    const mine = mySkills.value.some((s) => s.id === tId)
    if (!mine && !(form.value.name || '').trim()) return false
    return true
  }
  if (publishMode.value === 'write') {
    if (!skillMdDraft.value.trim()) return false
    const parsed = parseSkillMdText(skillMdDraft.value)
    const skillId = skillIdFromParsedName(parsed.name, form.value.skillId).trim()
    if (!/^[a-z0-9\-_]+$/.test(skillId)) return false
    if (selectedExistingId.value && selectedExistingId.value !== skillId) return false
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
    mySkills.value = response.skills.filter((s: Skill) => s.permission === 'owner' || s.permission === 'collaborator')
  } catch (err) {
    console.error('Failed to load skills:', err)
  }
})

function setPublishMode(mode: PublishMode) {
  if (mode === publishMode.value) return
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
    const body: { source: string; ref?: string; subpath?: string } = { source: src }
    if (githubRef.value.trim()) body.ref = githubRef.value.trim()
    if (githubSubpath.value.trim()) body.subpath = githubSubpath.value.trim()
    const p = await skillsApi.importGithubPreview(body)
    githubPreview.value = p
    githubTargetId.value = p.conflict ? p.suggested_skill_id : p.default_skill_id
    form.value.skillId = githubTargetId.value
    form.value.name = (p.name || '').trim()
    form.value.description = (p.description || '').trim().slice(0, DESC_MAX)
    selectedZipBlob.value = null
    selectedFileName.value = ''
    selectedFiles.value = []
    selectedExistingId.value = ''
    if (fileInput.value) fileInput.value.value = ''
    if (zipInput.value) zipInput.value.value = ''
    globalToast.success(t('publish.githubPreviewOk', { id: githubTargetId.value }))
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
  if (githubPreview.value.conflict && skillId === githubPreview.value.default_skill_id) {
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
      ...(githubSubpath.value.trim() ? { subpath: githubSubpath.value.trim() } : {}),
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
    const name = (skill?.name || skill?.id || t('publish.writeDefaultName')).trim()
    const description = (skill?.description || t('publish.writeDefaultDescription')).trim()
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
  const matches = paths.filter(p => /(^|\/)SKILL\.md$/i.test(p))
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
  if (description.length > DESC_MAX) description = description.slice(0, DESC_MAX)
  return { name, description }
}

function applyAutofillFromSkill(slugFromPackage: string, parsed: {name: string, description: string}) {
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
  globalToast.success(t('publish.parseSuccessToast', {
    skillId: form.value.skillId || '-',
  }))
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
    const parsed = skillText != null ? parseSkillMdText(skillText) : { name: '', description: '' }
    const firstFile = files[0]
    const rootSlug = firstFile ? slugifySkillId(firstFile.webkitRelativePath.split('/')[0] || '') : ''

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
    const parsed = text != null ? parseSkillMdText(text) : { name: '', description: '' }
    
    selectedZipBlob.value = file
    selectedFileName.value = file.name
    selectedFiles.value = paths.map(p => ({ name: p, size: 0 }))
    applyAutofillFromSkill(slug, parsed)
    showParseSuccessNotice()
  } catch (err: any) {
    error.value = '读取 zip 失败: ' + err.message
  }
}

// drop zone
async function handleDrop(event: DragEvent) {
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
    const parsed = skillText != null ? parseSkillMdText(skillText) : { name: '', description: '' }

    selectedZipBlob.value = await zip.generateAsync({ type: 'blob' })
    selectedFileName.value = 'skill-package.zip'
    applyAutofillFromSkill(rootSlug, parsed)
    showParseSuccessNotice()
  } catch (err: any) {
    error.value = '处理文件失败: ' + err.message
  }
}

async function traverseEntry(entry: any, zip: JSZip, path: string, fileList: string[], onFile: (size: number, fullPath: string) => void) {
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
    error.value = '上传包的 Skill ID 与下拉框所选已有 Skill 不一致，请重新选择或更换压缩包'
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
  if (isPublishing.value) return
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
    error.value = '上传包的 Skill ID 与下拉框所选已有 Skill 不一致，请重新选择或更换压缩包'
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
.page-content {
  background-image: none;
  padding-top: 2rem;
  min-height: calc(100vh - 64px);
}

.card {
  background-color: var(--color-base-900);
  border: 1px solid var(--color-base-800);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border-radius: 0.75rem;
}

html[data-theme="light"] .card {
  box-shadow: 0 12px 32px -12px rgba(0, 0, 0, 0.12);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="text"],
textarea,
select {
  font-family: 'JetBrains Mono', monospace !important;
  background-color: var(--color-base-950) !important;
  border-color: var(--color-base-800) !important;
  color: var(--color-fg-strong) !important;
  -webkit-text-fill-color: var(--color-fg-strong) !important;
}
input::placeholder,
textarea::placeholder {
  color: var(--color-base-400) !important;
  -webkit-text-fill-color: var(--color-base-400) !important;
}
input:focus,
textarea:focus,
select:focus {
  border-color: var(--color-neon-400) !important;
  box-shadow: 0 0 0 1px rgba(var(--color-neon-rgb), 0.45) !important;
}
input[readonly],
textarea[readonly] {
  background-color: color-mix(in srgb, var(--color-base-950) 50%, transparent) !important;
  color: var(--color-fg) !important;
  -webkit-text-fill-color: var(--color-fg) !important;
  border-color: var(--color-base-800) !important;
}
input:disabled,
textarea:disabled,
select:disabled {
  color: var(--color-fg) !important;
  -webkit-text-fill-color: var(--color-fg) !important;
  opacity: 1 !important;
}

.drop-zone {
  border: 1px dashed var(--color-base-800);
  border-radius: 0.5rem;
  background-color: var(--color-base-950);
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  font-family: 'JetBrains Mono', monospace;
}
.drop-zone:hover,
.drop-zone.drag-over {
  border-color: var(--color-neon-400);
  background-color: rgba(var(--color-neon-rgb), 0.04);
}
.drop-zone-icon {
  color: var(--color-neon-400);
  opacity: 0.5;
  margin-bottom: 0.5rem;
}
.drop-zone-text {
  color: var(--color-fg-strong);
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}
.drop-zone-subtitle {
  color: var(--color-neon-400);
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0.8;
}
.drop-zone-subtitle:hover {
  opacity: 1;
  text-decoration: underline;
}
.drop-zone-hint {
  font-size: 0.6875rem;
  color: var(--color-base-400);
  margin-top: 1rem;
  max-width: 80%;
  text-align: center;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  color: var(--color-base-800);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: var(--color-base-800);
}
.divider span {
  padding: 0 1rem;
  color: var(--color-base-400);
}

.file-preview {
  background-color: var(--color-base-950);
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  margin-top: 1rem;
  padding: 1rem;
  display: none;
}
.file-preview.visible {
  display: block;
}
.file-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  color: var(--color-neon-400);
}
.file-preview-clear {
  color: var(--color-base-400);
  background: none;
  border: none;
  font-size: 0.75rem;
  cursor: pointer;
  transition: color 0.2s;
}
.file-preview-clear:hover {
  color: #ef4444;
}
.file-preview-list {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-base-400);
  max-height: 150px;
  overflow-y: auto;
}
.file-preview-list .file-item {
  padding: 0.25rem 0;
  border-bottom: 1px dashed var(--color-base-800);
}
.file-preview-list .file-item:last-child {
  border-bottom: none;
}
.file-preview-summary {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-base-800);
  font-size: 0.75rem;
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
}

.parse-success {
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(var(--color-neon-rgb), 0.3);
  background: rgba(var(--color-neon-rgb), 0.08);
}

.parse-success-title {
  color: var(--color-neon-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  font-weight: 700;
  margin-bottom: 0.375rem;
}

.parse-success-text {
  color: var(--color-fg);
  font-size: 0.875rem;
  line-height: 1.6;
}

.progress-container {
  margin-top: 1.5rem;
  display: none;
}
.progress-container.visible {
  display: block;
}
.progress-bar-wrapper {
  height: 6px;
  background-color: var(--color-base-950);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--color-base-800);
}
.progress-bar {
  height: 100%;
  background-color: var(--color-neon-400);
  width: 0%;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px var(--color-neon-400);
}
.progress-text {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: var(--color-neon-400);
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
}

.form-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-base-400);
  margin-top: 0.5rem;
}

.spinner {
  border: 2px solid rgba(var(--color-neon-rgb),0.3);
  border-radius: 50%;
  border-top-color: var(--color-neon-400);
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  display: inline-block;
}
.spinner-sm {
  width: 14px;
  height: 14px;
  border-width: 2px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.publish-mode-tabs {
  display: inline-flex;
  padding: 4px;
  border-radius: 9999px;
  background-color: var(--color-base-950);
  border: 1px solid var(--color-base-800);
  gap: 2px;
  margin-bottom: 1.5rem;
}
.publish-mode-tab {
  border: none;
  border-radius: 9999px;
  padding: 0.5rem 1.15rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  background: transparent;
  color: var(--color-base-400);
}
.publish-mode-tab:hover {
  color: var(--color-fg);
}
.publish-mode-tab.active {
  background: rgba(var(--color-neon-rgb), 0.12);
  color: var(--color-neon-400);
  box-shadow: 0 0 0 1px rgba(var(--color-neon-rgb), 0.35);
}

.write-skill-panel {
  border: 1px solid var(--color-base-800);
  border-radius: 1rem;
  padding: 1.25rem;
  background: color-mix(in srgb, var(--color-base-900) 82%, transparent);
}
.write-skill-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.write-skill-hint {
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.65;
}
.write-reset-action {
  flex-shrink: 0;
  border: 1px solid var(--color-base-700);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  background: color-mix(in srgb, var(--color-base-950) 72%, transparent);
  color: var(--color-base-300);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  cursor: pointer;
}
.write-reset-action:hover:not(:disabled) {
  border-color: rgba(var(--color-neon-rgb), 0.45);
  color: var(--color-fg-strong);
}
.write-reset-action:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.write-skill-editor {
  min-height: 18rem;
  resize: vertical;
  line-height: 1.55;
}
@media (max-width: 640px) {
  .write-skill-header {
    display: grid;
  }
  .write-reset-action {
    width: 100%;
  }
}

.github-import-panel {
  border: 1px solid var(--color-base-800);
  border-radius: 1rem;
  padding: 1.25rem;
  background:
    radial-gradient(circle at top right, rgba(var(--color-neon-rgb), 0.08), transparent 36%),
    color-mix(in srgb, var(--color-base-900) 82%, transparent);
}

.github-import-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.github-import-hint {
  max-width: 38rem;
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.65;
}

.github-connect-action {
  flex-shrink: 0;
  border: 1px solid var(--color-base-700);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  background: color-mix(in srgb, var(--color-base-950) 72%, transparent);
  color: var(--color-base-300);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;
}

.github-connect-action:hover:not(:disabled) {
  border-color: rgba(var(--color-neon-rgb), 0.45);
  color: var(--color-fg-strong);
  background: rgba(var(--color-neon-rgb), 0.06);
}

.github-connect-action:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.github-connect-banner {
  margin-bottom: 1rem;
  padding: 0.75rem 0.875rem;
}

.github-source-card {
  display: grid;
  gap: 1rem;
  border: 1px solid rgba(var(--color-neon-rgb), 0.24);
  border-radius: 0.875rem;
  padding: 1rem;
  background: color-mix(in srgb, var(--color-base-950) 72%, transparent);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.github-field-label {
  display: block;
  margin-bottom: 0.375rem;
  color: var(--color-base-300);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  font-weight: 600;
}

.github-field-label.required::after {
  content: ' *';
  color: var(--color-neon-400);
}

.github-source-input {
  min-height: 2.875rem;
}

.github-import-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.github-clear-action {
  border: none;
  background: transparent;
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.15s ease;
}

.github-clear-action:hover {
  color: var(--color-fg-strong);
}

.github-preview-card {
  margin-top: 1rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.875rem;
  padding: 0.875rem 1rem;
  background: color-mix(in srgb, var(--color-base-950) 52%, transparent);
}

.github-preview-kicker {
  color: var(--color-neon-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.5;
}

.github-preview-repo {
  margin-top: 0.375rem;
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}

.github-conflict-message {
  margin-top: 0.75rem;
  color: #fcd34d;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.65;
}
.github-connect-idle {
  border-color: var(--color-base-800);
  background: color-mix(in srgb, var(--color-base-950) 60%, transparent);
  color: var(--color-base-400);
}
.github-connect-checking {
  border-color: var(--color-base-700);
  background: color-mix(in srgb, var(--color-base-800) 35%, transparent);
  color: var(--color-base-400);
}
.github-connect-ok {
  border-color: rgba(var(--color-neon-rgb), 0.35);
  background: rgba(var(--color-neon-rgb), 0.06);
  color: #86efac;
}
.github-connect-fail {
  border-color: rgba(251, 191, 36, 0.4);
  background: rgba(251, 191, 36, 0.08);
  color: #fcd34d;
}

html[data-theme="light"] .github-import-panel {
  border-color: #d4d4d8;
  background:
    radial-gradient(circle at top right, rgba(5, 150, 105, 0.08), transparent 34%),
    #ffffff;
  box-shadow: 0 14px 34px -24px rgba(15, 23, 42, 0.35);
}

html[data-theme="light"] .github-import-hint {
  color: #52525b;
}

html[data-theme="light"] .github-connect-action {
  border-color: #d4d4d8;
  background: #fafafa;
  color: #3f3f46;
}

html[data-theme="light"] .github-connect-action:hover:not(:disabled) {
  border-color: #059669;
  background: #ecfdf5;
  color: #065f46;
}

html[data-theme="light"] .github-source-card {
  border-color: #d4d4d8;
  background: #ffffff;
  box-shadow: 0 10px 28px -24px rgba(15, 23, 42, 0.45);
}

html[data-theme="light"] .github-field-label {
  color: #3f3f46;
}

html[data-theme="light"] .github-preview-card {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

html[data-theme="light"] .github-preview-kicker {
  color: #047857;
}

html[data-theme="light"] .github-preview-repo {
  color: #52525b;
}

html[data-theme="light"] .github-connect-idle,
html[data-theme="light"] .github-connect-checking {
  border-color: #d4d4d8;
  background: #fafafa;
  color: #52525b;
}

html[data-theme="light"] .github-connect-ok {
  border-color: #34d399;
  background: #ecfdf5;
  color: #047857;
}

html[data-theme="light"] .github-connect-fail {
  border-color: #f59e0b;
  background: #fffbeb;
  color: #92400e;
}

@media (max-width: 640px) {
  .github-import-header {
    display: grid;
  }

  .github-connect-action {
    width: 100%;
  }
}
</style>
