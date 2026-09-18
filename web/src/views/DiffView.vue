<template>
  <div class="diff-page min-h-screen pt-8 pb-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="spinner"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-20">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-base-800 flex items-center justify-center">
          <CircleAlert class="w-10 h-10 text-base-600" :stroke-width="2" aria-hidden="true" />
        </div>
        <h3 class="text-xl font-semibold text-fg-strong mb-2">{{ t('diff.loadFailed') }}</h3>
        <p class="text-base-400 mb-6">{{ error }}</p>
        <router-link to="/" class="btn-primary px-6 py-3 rounded-lg">
          {{ t('diff.backToHome') }}
        </router-link>
      </div>

      <!-- Diff Content -->
      <template v-else>
        <!-- Breadcrumb -->
        <nav class="diff-breadcrumb" :aria-label="t('skill.breadcrumbHome')">
          <router-link to="/">{{ t('skill.breadcrumbHome') }}</router-link>
          <span aria-hidden="true">/</span>
          <router-link :to="`/skills/${skillId}`">{{ skill?.name || skillId }}</router-link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ t('diff.breadcrumbCurrent') }}</span>
        </nav>

        <header class="diff-heading">
          <h1>{{ t('diff.breadcrumbCurrent') }}</h1>
          <p>{{ skill?.name || skillId }}</p>
        </header>

        <!-- Controls -->
        <section class="diff-controls">
          <div class="diff-version-controls">
            <label class="diff-version-field">
              <span class="diff-field-label">{{ t('diff.old') }}</span>
              <select v-model="currentVersionA" class="diff-version-select">
                <option value="">{{ t('diff.selectVersion') }}</option>
                <option v-for="(v, index) in versions" :key="v.version" :value="v.version">
                  {{ v.version }} {{ index === 0 ? t('skill.latestTag') : '' }}
                </option>
              </select>
            </label>
            <span class="diff-version-arrow" aria-hidden="true">→</span>
            <label class="diff-version-field">
              <span class="diff-field-label">{{ t('diff.new') }}</span>
              <select v-model="currentVersionB" class="diff-version-select">
                <option value="">{{ t('diff.selectVersion') }}</option>
                <option v-for="(v, index) in versions" :key="v.version" :value="v.version">
                  {{ v.version }} {{ index === 0 ? t('skill.latestTag') : '' }}
                </option>
              </select>
            </label>
            <button 
              @click="performDiff"
              class="diff-compare-button"
              :disabled="isComputing"
            >
              <RefreshCw v-if="!isComputing" :size="14" :stroke-width="2" aria-hidden="true" />
              <div v-else class="spinner spinner-sm"></div>
              {{ isComputing ? t('diff.computingDiff') : t('diff.recalculate') }}
            </button>
          </div>

          <div class="diff-toolbar">
            <div class="diff-file-selection">
              <span class="diff-field-label">{{ t('diff.file') }}</span>
              <span class="diff-current-path">
                {{ currentFilePath || t('diff.allFiles') }}
              </span>
              <button v-if="currentFilePath" @click="clearFileSelection" class="text-xs text-base-400 hover:text-fg-strong">
                {{ t('diff.clearSelection') }}
              </button>
            </div>

            <div class="diff-view-tabs">
              <button 
                @click="outputFormat = 'side-by-side'"
                class="diff-view-tab"
                :class="{ 'is-active': outputFormat === 'side-by-side' }"
                :aria-pressed="outputFormat === 'side-by-side'"
              >
                {{ t('diff.sideBySide') }}
              </button>
              <button 
                @click="outputFormat = 'line-by-line'"
                class="diff-view-tab"
                :class="{ 'is-active': outputFormat === 'line-by-line' }"
                :aria-pressed="outputFormat === 'line-by-line'"
              >
                {{ t('diff.unified') }}
              </button>
            </div>
          </div>
        </section>

        <!-- Stats -->
        <div v-if="diffStats.added > 0 || diffStats.removed > 0" class="diff-stats">
          <span class="text-green-400 font-mono">+{{ diffStats.added }} {{ t('diff.linesAdded') }}</span>
          <span class="text-red-400 font-mono">-{{ diffStats.removed }} {{ t('diff.linesRemoved') }}</span>
          <span class="text-base-400 font-mono">{{ changedFiles.length }}{{ t('diff.filesChanged') }}</span>
        </div>

        <!-- Changed Files List -->
        <div v-if="changedFiles.length > 0 && !currentFilePath" class="diff-files">
          <div class="diff-section-heading">
            {{ t('diff.changedFiles') }}
          </div>
          <div class="max-h-64 overflow-y-auto">
            <button
              type="button"
              v-for="(change, index) in changedFiles" 
              :key="change.file"
              @click="selectChangedFile(change.file, index)"
              class="diff-file-row"
              :class="{ 'bg-neon-400/5': selectedFileIndex === index }"
            >
              <span 
                class="text-xs px-2 py-0.5 rounded"
                :class="{
                  'bg-green-500/10 text-green-400': change.status === 'added',
                  'bg-red-500/10 text-red-400': change.status === 'deleted',
                  'bg-orange-500/10 text-orange-400': change.status === 'modified'
                }"
              >
                {{ statusLabels[change.status] }}
              </span>
              <span class="diff-file-path">{{ change.file }}</span>
            </button>
          </div>
        </div>

        <!-- Diff Output -->
        <div class="diff-result min-h-[300px]">
          <div v-if="isComputing" class="flex flex-col items-center justify-center py-24">
            <div class="spinner mb-4"></div>
            <p class="text-sm text-base-400 font-mono">{{ t('diff.computing') }}</p>
          </div>
          <div v-else-if="diffHtml" ref="diffOutputRef" class="diff-output" v-html="diffHtml"></div>
          <div v-else class="flex flex-col items-center justify-center py-24 opacity-50">
            <div class="font-mono text-4xl mb-4">_</div>
            <p class="text-xs font-mono text-base-400">{{ t('diff.empty') }}</p>
          </div>
        </div>

        <!-- Back Button -->
        <div class="mt-8 pb-16">
          <router-link :to="`/skills/${skillId}`" class="diff-back">
            <ArrowLeft :size="14" :stroke-width="2" aria-hidden="true" />
            {{ t('diff.back') }}
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, RefreshCw, ArrowLeft } from 'lucide-vue-next'
import { ref, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import JSZip from 'jszip'
import * as Diff from 'diff'
import { Diff2HtmlUI } from 'diff2html/lib-esm/ui/js/diff2html-ui'
import { useSkillsStore } from '@/stores/skills'
import { useI18n } from '@/composables/useI18n'
import { versionsApi } from '@/services/api'
import { globalToast } from '@/composables/useToast'
import type { Skill, SkillVersion } from '@/services/api'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const { t } = useI18n()

// State
const isLoading = ref(true)
const isComputing = ref(false)
const error = ref('')
const skill = ref<Skill | null>(null)
const skillId = ref('')
const versions = ref<SkillVersion[]>([])
const currentVersionA = ref('')
const currentVersionB = ref('')
const currentFilePath = ref('')
const outputFormat = ref<'side-by-side' | 'line-by-line'>('side-by-side')
const diffHtml = ref('')
const changedFiles = ref<{ file: string; status: 'added' | 'deleted' | 'modified' }[]>([])
const selectedFileIndex = ref(-1)
const diffStats = ref({ added: 0, removed: 0 })
const diffOutputRef = ref<HTMLElement | null>(null)

// ZIP caches
let zipA: JSZip | null = null
let zipB: JSZip | null = null

const statusLabels = {
  added: t('diff.added'),
  deleted: t('diff.deleted'),
  modified: t('diff.modified')
}

const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.ttf', '.otf', '.woff', '.woff2',
])

function isBinaryExt(filePath: string): boolean {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase()
  return BINARY_EXTS.has(ext)
}

async function loadData() {
  isLoading.value = true
  error.value = ''

  try {
    skillId.value = route.query.id as string
    currentVersionA.value = (route.query.version_a as string) || ''
    currentVersionB.value = (route.query.version_b as string) || ''
    currentFilePath.value = (route.query.path as string) || ''

    if (!skillId.value) {
      error.value = t('diff.missingId')
      return
    }

    // Load skill info
    await skillsStore.fetchSkill(skillId.value)
    skill.value = skillsStore.currentSkill

    // Load versions
    const versionsData = await skillsStore.fetchVersions(skillId.value)
    versions.value = versionsData || []

    // Auto perform diff if versions are provided
    if (currentVersionA.value && currentVersionB.value) {
      await performDiff()
    }
  } catch (err: any) {
    error.value = err.message || t('diff.loadFailed')
  } finally {
    isLoading.value = false
  }
}

async function performDiff() {
  if (!currentVersionA.value || !currentVersionB.value) {
    globalToast.warning(t('diff.selectBoth'))
    return
  }

  if (currentVersionA.value === currentVersionB.value) {
    globalToast.warning(t('diff.selectBoth'))
    return
  }

  isComputing.value = true
  diffHtml.value = ''
  changedFiles.value = []
  selectedFileIndex.value = -1

  try {
    // 使用 /view 拉取 ZIP，与 download 相同内容但不计入下载统计
    const [bufA, bufB] = await Promise.all([
      fetch(versionsApi.viewUrl(skillId.value, currentVersionA.value), { credentials: 'include' }).then(r => {
        if (!r.ok) throw new Error(`${t('diff.loadFailed')} ${currentVersionA.value}`)
        return r.arrayBuffer()
      }),
      fetch(versionsApi.viewUrl(skillId.value, currentVersionB.value), { credentials: 'include' }).then(r => {
        if (!r.ok) throw new Error(`${t('diff.loadFailed')} ${currentVersionB.value}`)
        return r.arrayBuffer()
      })
    ])

    // Load ZIPs
    zipA = await JSZip.loadAsync(bufA)
    zipB = await JSZip.loadAsync(bufB)

    if (currentFilePath.value) {
      await diffSingleFile(currentFilePath.value)
    } else {
      await diffAllFiles()
    }

    // Update URL
    updateUrl()
  } catch (err: any) {
    console.error('Diff failed:', err)
    diffHtml.value = `<div class="flex flex-col items-center justify-center py-24"><div class="text-4xl mb-4">❌</div><p class="text-base-400">${err.message}</p></div>`
  } finally {
    isComputing.value = false
  }
}

async function diffSingleFile(filePath: string) {
  if (isBinaryExt(filePath)) {
    diffHtml.value = `<div class="flex flex-col items-center justify-center py-24"><div class="text-4xl mb-4">📦</div><p class="text-base-400">${t('diff.binaryDiff')}: ${filePath}</p></div>`
    diffStats.value = { added: 0, removed: 0 }
    return
  }

  const fileA = zipA!.file(filePath)
  const fileB = zipB!.file(filePath)

  const contentA = fileA ? await fileA.async('string') : ''
  const contentB = fileB ? await fileB.async('string') : ''

  if (contentA === contentB) {
    diffHtml.value = `<div class="flex flex-col items-center justify-center py-24"><div class="text-4xl mb-4">✅</div><p class="text-base-400">${t('state.noData')}</p></div>`
    diffStats.value = { added: 0, removed: 0 }
    return
  }

  // Create unified diff
  const patch = Diff.createPatch(
    filePath,
    contentA,
    contentB,
    `Version ${currentVersionA.value}`,
    `Version ${currentVersionB.value}`
  )

  renderDiff(patch)
  updateDiffStats(patch, 1)
}

async function diffAllFiles() {
  const filesA = new Set<string>()
  const filesB = new Set<string>()

  zipA!.forEach((path, entry) => {
    if (!entry.dir) filesA.add(path)
  })

  zipB!.forEach((path, entry) => {
    if (!entry.dir) filesB.add(path)
  })

  const allFiles = new Set([...filesA, ...filesB])
  const changes: { file: string; status: 'added' | 'deleted' | 'modified' }[] = []

  for (const file of allFiles) {
    const inA = filesA.has(file)
    const inB = filesB.has(file)

    let status: 'added' | 'deleted' | 'modified'
    if (!inA && inB) {
      status = 'added'
    } else if (inA && !inB) {
      status = 'deleted'
    } else {
      const contentA = await zipA!.file(file)?.async('string') ?? ''
      const contentB = await zipB!.file(file)?.async('string') ?? ''
      if (contentA !== contentB) {
        status = 'modified'
      } else {
        continue
      }
    }

    changes.push({ file, status })
  }

  changes.sort((a, b) => {
    const statusOrder = { added: 0, deleted: 1, modified: 2 }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    return a.file.localeCompare(b.file)
  })

  changedFiles.value = changes

  if (changes.length === 0) {
    diffHtml.value = `<div class="flex flex-col items-center justify-center py-24"><div class="text-4xl mb-4">✅</div><p class="text-base-400">${t('state.noData')}</p></div>`
    diffStats.value = { added: 0, removed: 0 }
    return
  }

  // Generate combined patch
  let combinedPatch = ''
  for (const change of changes) {
    if (isBinaryExt(change.file)) {
      combinedPatch += `diff --git a/${change.file} b/${change.file}\n`
      combinedPatch += `Binary files differ\n`
      continue
    }

    const contentA = await zipA!.file(change.file)?.async('string') ?? ''
    const contentB = await zipB!.file(change.file)?.async('string') ?? ''

    const patch = Diff.createPatch(
      change.file,
      contentA,
      contentB,
      `Version ${currentVersionA.value}`,
      `Version ${currentVersionB.value}`
    )
    combinedPatch += patch
  }

  renderDiff(combinedPatch)
  updateDiffStats(combinedPatch, changes.length)
}

function renderDiff(patch: string) {
  // Use a temporary div to render diff2html
  const tempDiv = document.createElement('div')
  const configuration: import('diff2html/lib-esm/ui/js/diff2html-ui').Diff2HtmlUIConfig = {
    drawFileList: false,
    matching: 'lines',
    outputFormat: outputFormat.value,
    renderNothingWhenEmpty: false
  }
  
  const diff2htmlUi = new Diff2HtmlUI(tempDiv, patch, configuration)
  diff2htmlUi.draw()
  
  diffHtml.value = tempDiv.innerHTML
}

function updateDiffStats(patch: string, fileCount: number) {
  let added = 0
  let removed = 0

  patch.split('\n').forEach(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      removed++
    }
  })

  diffStats.value = { added, removed }
}

async function selectChangedFile(filePath: string, index: number) {
  selectedFileIndex.value = index
  currentFilePath.value = filePath
  updateUrl()
  await diffSingleFile(filePath)
}

function clearFileSelection() {
  currentFilePath.value = ''
  selectedFileIndex.value = -1
  updateUrl()
  if (zipA && zipB) {
    diffAllFiles()
  }
}

function updateUrl() {
  const query: Record<string, string> = {
    id: skillId.value,
    version_a: currentVersionA.value,
    version_b: currentVersionB.value
  }
  if (currentFilePath.value) {
    query.path = currentFilePath.value
  }
  router.replace({ path: '/diff', query })
}

// Watch for format changes
watch(outputFormat, () => {
  if (zipA && zipB) {
    if (currentFilePath.value) {
      diffSingleFile(currentFilePath.value)
    } else if (changedFiles.value.length > 0) {
      performDiff()
    }
  }
})

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.diff-breadcrumb { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 24px; font-size: 13px; color: var(--color-base-400); overflow-wrap: anywhere; }
.diff-breadcrumb a:hover, .diff-back:hover { color: var(--color-fg-strong); }
.diff-heading { margin-bottom: 28px; }
.diff-heading h1 { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 700; letter-spacing: -0.035em; line-height: 1.25; color: var(--color-fg-strong); }
.diff-heading p { margin-top: 12px; font-size: 14px; color: var(--color-base-400); overflow-wrap: anywhere; }
.diff-controls { margin-bottom: 24px; }
.diff-version-controls { display: flex; flex-wrap: wrap; align-items: end; gap: 16px; }
.diff-version-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.diff-field-label { font-size: 12px; color: var(--color-base-400); }
.diff-version-select { width: 240px; max-width: 100%; padding: 10px 12px; border: 1px solid var(--color-base-800); border-radius: 6px; background: var(--color-base-900); color: var(--color-fg-strong); font-family: var(--font-mono); font-size: 12px; }
.diff-version-arrow { padding-bottom: 9px; color: var(--color-base-400); }
.diff-compare-button { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 16px; border: 1px solid var(--color-fg-strong); border-radius: 6px; background: var(--color-fg-strong); color: var(--color-base-950); font-size: 13px; cursor: pointer; }
.diff-compare-button:disabled { opacity: .5; cursor: wait; }
.diff-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px; margin-top: 28px; border-bottom: 1px solid var(--color-base-800); }
.diff-file-selection { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; min-width: 0; padding-bottom: 10px; }
.diff-current-path, .diff-file-path { min-width: 0; overflow-wrap: anywhere; font-family: var(--font-mono); font-size: 12px; color: var(--color-fg); }
.diff-view-tabs { display: flex; gap: 8px; }
.diff-view-tab { padding: 10px 16px; border-bottom: 2px solid transparent; font-size: 14px; color: var(--color-base-400); cursor: pointer; }
.diff-view-tab:hover { color: var(--color-fg-strong); }
.diff-view-tab.is-active { color: var(--color-neon-400); border-bottom-color: var(--color-neon-500); }
.diff-stats { display: flex; flex-wrap: wrap; gap: 12px 24px; margin-bottom: 24px; font-size: 12px; }
.diff-files { margin-bottom: 28px; }
.diff-section-heading { padding-bottom: 12px; font-size: 14px; font-weight: 600; color: var(--color-fg-strong); border-bottom: 1px solid var(--color-base-800); }
.diff-file-row { display: flex; align-items: start; gap: 12px; width: 100%; padding: 12px 0; text-align: left; border-bottom: 1px solid var(--color-base-800); cursor: pointer; }
.diff-file-row > span:first-child { flex-shrink: 0; }
.diff-file-row:hover { background: var(--color-base-900); }
.diff-result { min-width: 0; overflow: hidden; }
.diff-back { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--color-base-400); }
.diff-page :is(button, select, a):focus-visible { outline: 2px solid var(--color-neon-500); outline-offset: 3px; }
@media (max-width: 600px) {
  .diff-version-controls { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
  .diff-version-select { width: 100%; }
  .diff-version-arrow { display: none; }
  .diff-toolbar { align-items: stretch; }
  .diff-file-selection, .diff-view-tabs { width: 100%; }
  .diff-view-tab { flex: 1; }
}

.diff-output :deep(.d2h-wrapper) {
  background-color: var(--color-base-900);
}

.diff-output :deep(.d2h-file-wrapper) {
  background-color: var(--color-base-900);
  border: none;
  border-radius: 0;
}

.diff-output :deep(.d2h-file-header) {
  background-color: var(--color-base-950);
  border-bottom: 1px solid var(--color-base-800);
}

.diff-output :deep(.d2h-file-name) {
  color: var(--color-neon-400);
  font-family: 'JetBrains Mono', monospace;
}

.diff-output :deep(.d2h-tag) {
  background-color: rgba(var(--color-neon-rgb), 0.1);
  color: var(--color-neon-400);
  border: 1px solid var(--color-neon-500);
}

.diff-output :deep(.d2h-code-wrapper),
.diff-output :deep(.d2h-diff-table) {
  background-color: var(--color-base-900);
}

.diff-output :deep(.d2h-code-line),
.diff-output :deep(.d2h-code-side-line) {
  background-color: transparent;
  color: var(--color-fg);
}

.diff-output :deep(.d2h-code-line-ctn) {
  color: var(--color-fg);
  font-family: 'JetBrains Mono', monospace;
}

.diff-output :deep(.d2h-ins),
.diff-output :deep(.d2h-file-diff .d2h-ins.d2h-change) {
  background-color: rgba(34, 197, 94, 0.18);
}

.diff-output :deep(.d2h-del),
.diff-output :deep(.d2h-file-diff .d2h-del.d2h-change) {
  background-color: rgba(248, 113, 113, 0.18);
}

:global(html[data-theme="light"] .diff-page .diff-output .d2h-ins) {
  background-color: rgba(34, 197, 94, 0.22);
}

:global(html[data-theme="light"] .diff-page .diff-output .d2h-del) {
  background-color: rgba(248, 113, 113, 0.15);
}

.diff-output :deep(.d2h-code-line ins),
.diff-output :deep(.d2h-code-side-line ins) {
  background-color: rgba(34, 197, 94, 0.28);
  color: inherit;
}

.diff-output :deep(.d2h-code-line del),
.diff-output :deep(.d2h-code-side-line del) {
  background-color: rgba(248, 113, 113, 0.28);
  color: inherit;
}

.diff-output :deep(.d2h-info) {
  background-color: var(--color-base-950);
  color: var(--color-base-400);
  border-color: var(--color-base-800);
}

.diff-output :deep(.d2h-code-linenumber),
.diff-output :deep(.d2h-code-side-linenumber) {
  background-color: var(--color-base-950);
  color: var(--color-base-400);
  border-color: var(--color-base-800);
}

.diff-output :deep(.d2h-cntx) {
  background-color: var(--color-base-900);
}
</style>
