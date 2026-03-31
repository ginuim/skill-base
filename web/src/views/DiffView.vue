<template>
  <div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="spinner"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="text-center py-20">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-base-800 flex items-center justify-center">
          <svg class="w-10 h-10 text-base-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">{{ t('diff.loadFailed') }}</h3>
        <p class="text-base-400 mb-6">{{ error }}</p>
        <router-link to="/" class="btn-primary px-6 py-3 rounded-lg">
          {{ t('diff.backToHome') }}
        </router-link>
      </div>

      <!-- Diff Content -->
      <template v-else>
        <!-- Breadcrumb -->
        <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
          <span class="text-neon-400">~</span>
          <span class="opacity-50">/</span>
          <router-link to="/" class="hover:text-white transition-colors">home</router-link>
          <span class="opacity-50">/</span>
          <router-link :to="`/skills/${skillId}`" class="hover:text-white transition-colors">{{ skill?.name || skillId }}</router-link>
          <span class="opacity-50">/</span>
          <span class="text-white">diff</span>
        </div>

        <!-- Controls -->
        <div class="card p-6 mb-6 relative">
          <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">GIT-DIFF</div>
          
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-base-400">{{ t('diff.old') }}</span>
              <select v-model="currentVersionA" class="bg-base-950 border border-base-800 text-white font-mono text-xs rounded-lg px-3 py-2 focus:border-neon-500 focus:outline-none w-48">
                <option value="">{{ t('diff.selectVersion') }}</option>
                <option v-for="(v, index) in versions" :key="v.version" :value="v.version">
                  {{ v.version }} {{ index === 0 ? t('skill.latestTag') : '' }}
                </option>
              </select>
            </div>
            <span class="font-mono text-base-600">-></span>
            <div class="flex items-center gap-2">
              <span class="text-xs font-mono text-base-400">{{ t('diff.new') }}</span>
              <select v-model="currentVersionB" class="bg-base-950 border border-base-800 text-white font-mono text-xs rounded-lg px-3 py-2 focus:border-neon-500 focus:outline-none w-48">
                <option value="">{{ t('diff.selectVersion') }}</option>
                <option v-for="(v, index) in versions" :key="v.version" :value="v.version">
                  {{ v.version }} {{ index === 0 ? t('skill.latestTag') : '' }}
                </option>
              </select>
            </div>
            <button 
              @click="performDiff"
              class="btn-primary flex items-center gap-2 ml-2 text-xs px-4 py-2"
              :disabled="isComputing"
            >
              <svg v-if="!isComputing" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              <div v-else class="spinner spinner-sm"></div>
              {{ isComputing ? t('diff.computingDiff') : 'Diff' }}
            </button>
          </div>

          <div class="flex flex-wrap items-center justify-between mt-6 pt-6 border-t border-base-800 gap-4">
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-base-400">{{ t('diff.file') }}</span>
              <span class="text-xs font-mono px-2 py-1 rounded bg-base-950 border border-base-800 text-neon-400">
                {{ currentFilePath || t('diff.allFiles') }}
              </span>
              <button v-if="currentFilePath" @click="clearFileSelection" class="text-xs text-base-400 hover:text-white">
                {{ t('diff.clearSelection') }}
              </button>
            </div>

            <div class="flex rounded-lg overflow-hidden border border-base-800">
              <button 
                @click="outputFormat = 'side-by-side'"
                class="px-4 py-1.5 text-xs font-mono transition-colors"
                :class="outputFormat === 'side-by-side' ? 'bg-neon-400/10 border-neon-500 text-neon-400 border' : 'bg-transparent text-base-400 hover:text-white'"
              >
                {{ t('diff.split') }}
              </button>
              <button 
                @click="outputFormat = 'line-by-line'"
                class="px-4 py-1.5 text-xs font-mono transition-colors border-l border-base-800"
                :class="outputFormat === 'line-by-line' ? 'bg-neon-400/10 border-neon-500 text-neon-400 border' : 'bg-transparent text-base-400 hover:text-white'"
              >
                {{ t('diff.unifiedView') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div v-if="diffStats.added > 0 || diffStats.removed > 0" class="flex items-center gap-6 py-3 px-4 mb-6 text-xs bg-base-950 border border-base-800 rounded-lg">
          <span class="text-green-400 font-mono">+{{ diffStats.added }} {{ t('diff.linesAdded') }}</span>
          <span class="text-red-400 font-mono">-{{ diffStats.removed }} {{ t('diff.linesRemoved') }}</span>
          <span class="text-base-400 font-mono">{{ changedFiles.length }}{{ t('diff.filesChanged') }}</span>
        </div>

        <!-- Changed Files List -->
        <div v-if="changedFiles.length > 0 && !currentFilePath" class="card mb-6">
          <div class="px-4 py-3 bg-base-950/50 border-b border-base-800 flex items-center gap-2 text-xs">
            <span class="text-neon-400">ls</span>
            <span class="opacity-50">--changed</span>
          </div>
          <div class="max-h-64 overflow-y-auto">
            <div 
              v-for="(change, index) in changedFiles" 
              :key="change.file"
              @click="selectChangedFile(change.file, index)"
              class="flex items-center gap-3 px-4 py-3 border-b border-base-800 cursor-pointer hover:bg-white/5 transition-colors"
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
              <span class="text-sm font-mono text-base-400">{{ change.file }}</span>
            </div>
          </div>
        </div>

        <!-- Diff Output -->
        <div class="card overflow-hidden min-h-[300px]">
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
          <router-link :to="`/skills/${skillId}`" class="btn-secondary flex items-center gap-2 text-sm px-4 py-2 w-fit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            {{ t('diff.back') }}
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
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
    // Download both versions
    const [bufA, bufB] = await Promise.all([
      fetch(versionsApi.downloadUrl(skillId.value, currentVersionA.value), { credentials: 'include' }).then(r => {
        if (!r.ok) throw new Error(`${t('diff.loadFailed')} ${currentVersionA.value}`)
        return r.arrayBuffer()
      }),
      fetch(versionsApi.downloadUrl(skillId.value, currentVersionB.value), { credentials: 'include' }).then(r => {
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
.diff-output :deep(.d2h-wrapper) {
  background-color: #131419;
}

.diff-output :deep(.d2h-file-wrapper) {
  background-color: #131419;
  border: none;
}

.diff-output :deep(.d2h-file-header) {
  background-color: #09090b;
  border-bottom: 1px solid #27272a;
}

.diff-output :deep(.d2h-file-name) {
  color: #00FFA3;
  font-family: 'JetBrains Mono', monospace;
}

.diff-output :deep(.d2h-tag) {
  background-color: rgba(0, 255, 163, 0.1);
  color: #00FFA3;
  border: 1px solid #00E592;
}

.diff-output :deep(.d2h-code-wrapper),
.diff-output :deep(.d2h-diff-table) {
  background-color: #131419;
}

.diff-output :deep(.d2h-code-line),
.diff-output :deep(.d2h-code-side-line) {
  background-color: #131419;
  color: #e4e4e7;
}

.diff-output :deep(.d2h-code-line-ctn) {
  color: #e4e4e7;
  font-family: 'JetBrains Mono', monospace;
}

.diff-output :deep(.d2h-ins) {
  background-color: rgba(34, 197, 94, 0.15);
}

.diff-output :deep(.d2h-del) {
  background-color: rgba(248, 113, 113, 0.15);
}

.diff-output :deep(.d2h-code-line ins),
.diff-output :deep(.d2h-code-side-line ins) {
  color: #15803d;
}

.diff-output :deep(.d2h-code-line del),
.diff-output :deep(.d2h-code-side-line del) {
  color: #be123c;
}

.diff-output :deep(.d2h-info) {
  background-color: #09090b;
  color: #a1a1aa;
  border-color: #27272a;
}

.diff-output :deep(.d2h-code-linenumber),
.diff-output :deep(.d2h-code-side-linenumber) {
  background-color: #1a1b23;
  color: #9ca3af;
  border-color: #27272a;
}

.diff-output :deep(.d2h-cntx) {
  background-color: #131419;
}
</style>
