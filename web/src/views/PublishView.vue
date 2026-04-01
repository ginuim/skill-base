<template>
    <main class="page-content">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 pb-16" style="max-width: 720px;">
        <!-- 面包屑 -->
        <div class="text-sm text-base-400 font-mono mb-6 flex items-center gap-2">
          <span class="text-neon-400">~</span>
          <span class="opacity-50">/</span>
          <router-link to="/" class="hover:text-white transition-colors">home</router-link>
          <span class="opacity-50">/</span>
          <span class="text-white">publish</span>
        </div>

        <div class="card publish-card relative overflow-hidden p-8">
          <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">CMD-PUB</div>

          <h1 class="text-2xl font-bold text-white mb-8 flex items-center gap-3">
            <span class="text-neon-400 font-mono font-normal opacity-70">></span>
            <span>{{ t('publish.title') }}</span>
          </h1>

          <form @submit.prevent="handlePublish" class="space-y-6">
            <!-- 文件上传 -->
            <div class="form-group">
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
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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

            <!-- Skill 选择 -->
            <div class="form-group">
              <label for="skill-select" class="form-label font-mono text-base-400 mb-2 block">{{ t('publish.selectSkill') }}</label>
              <select
                id="skill-select"
                v-model="selectedExistingId"
                class="rounded-lg px-4 py-2.5 w-full"
                :disabled="isPublishing"
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
                <label for="skill-id" class="form-label font-mono text-base-400 mb-2 block required">{{ t('publish.skillId') }}</label>
                <input
                  type="text"
                  id="skill-id"
                  v-model="form.skillId"
                  readonly
                  :placeholder="t('publish.skillIdPlaceholder')"
                  pattern="[a-z0-9\-_]+"
                  class="rounded-lg px-4 py-2.5 w-full"
                >
                <p class="form-hint">{{ t('publish.skillIdHint') }}</p>
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

            <!-- 错误信息 -->
            <div v-if="error" class="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {{ error }}
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
                <svg v-if="!isPublishing" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import JSZip from 'jszip'
import { skillsApi } from '@/services/api'
import { useI18n } from '@/composables/useI18n'
import type { Skill } from '@/services/api'

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

const selectedExistingId = ref('') // 下拉框选择的已存在 Skill ID

const form = ref({
  skillId: '',
  name: '',
  description: '',
  changelog: '',
})

const isNewSkill = computed(() => selectedExistingId.value === '')

const canPublish = computed(() => {
  if (isNewSkill.value) {
    return form.value.name && selectedFiles.value.length > 0
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

// === 工具函数 ===
const DESC_MAX = 500

function slugToSkillId(raw: string) {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim().replace(/\.zip$/i, '')
  s = s.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9\-]+/g, '')
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!s || !/^[a-z0-9\-_]+$/.test(s)) return ''
  return s
}

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
      out[key] = buf.join('\n').trim()
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

async function readSkillMdFromZipInstance(zip: JSZip, fileList: string[]) {
  const skillPath = pickSkillMdPath(fileList)
  if (!skillPath) return null
  const f = zip.file(skillPath)
  if (!f) return null
  return f.async('string')
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
  selectedFiles.value = []
  let totalSize = 0

  const zip = new JSZip()
  const paths: string[] = []

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      const path = file.webkitRelativePath
      zip.file(path, file)
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
    const rootSlug = firstFile ? slugToSkillId(firstFile.webkitRelativePath.split('/')[0] || '') : ''

    selectedZipBlob.value = await zip.generateAsync({ type: 'blob' })
    selectedFileName.value = 'skill-package.zip'

    applyAutofillFromSkill(rootSlug, parsed)
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
  if (!file.name.toLowerCase().endsWith('.zip')) {
    error.value = '请选择 .zip 文件'
    return
  }

  const slug = slugToSkillId(file.name)
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
  } catch (err: any) {
    error.value = '读取 zip 失败: ' + err.message
  }
}

// drop zone
async function handleDrop(event: DragEvent) {
  isDragging.value = false
  error.value = ''
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
    const slug = slugToSkillId(file.name)
    await processZipFile(file, slug)
    return
  }

  let rootSlug = ''
  if (entry.isDirectory) {
    rootSlug = slugToSkillId(entry.name)
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
    zip.file(fullPath, file)
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
  form.value.skillId = ''
  form.value.name = ''
  form.value.description = ''
  if (fileInput.value) fileInput.value.value = ''
  if (zipInput.value) zipInput.value.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function handlePublish() {
  if (!selectedZipBlob.value || isPublishing.value) return

  error.value = ''
  
  const skillId = form.value.skillId.trim()
  if (!skillId) {
    error.value = '无法从上传包得到 Skill ID，请使用合法文件夹名或 zip 文件名'
    return
  }
  if (!/^[a-z0-9\-_]+$/.test(skillId)) {
    error.value = 'Skill ID 只能包含小写字母、数字、下划线和连字符'
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
  background-color: #13141a;
  border: 1px solid #27272a;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  border-radius: 0.75rem;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

input[type="text"],
textarea,
select {
  font-family: 'JetBrains Mono', monospace !important;
  background-color: #09090b !important;
  border-color: #27272a !important;
  color: #fafafa !important;
  -webkit-text-fill-color: #fafafa !important;
}
input::placeholder,
textarea::placeholder {
  color: #71717a !important;
  -webkit-text-fill-color: #71717a !important;
}
input:focus,
textarea:focus,
select:focus {
  border-color: #00FFA3 !important;
  box-shadow: 0 0 0 1px rgba(0,255,163,0.5) !important;
}
input[readonly],
textarea[readonly] {
  background-color: rgba(9, 9, 11, 0.5) !important;
  color: #e4e4e7 !important;
  -webkit-text-fill-color: #e4e4e7 !important;
  border-color: #27272a !important;
}
input:disabled,
textarea:disabled,
select:disabled {
  color: #e4e4e7 !important;
  -webkit-text-fill-color: #e4e4e7 !important;
  opacity: 1 !important;
}

.drop-zone {
  border: 1px dashed #27272a;
  border-radius: 0.5rem;
  background-color: #09090b;
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
  border-color: #00FFA3;
  background-color: rgba(0,255,163,0.02);
}
.drop-zone-icon {
  color: #00FFA3;
  opacity: 0.5;
  margin-bottom: 0.5rem;
}
.drop-zone-text {
  color: #fff;
  font-size: 0.875rem;
  margin-bottom: 0.25rem;
}
.drop-zone-subtitle {
  color: #00FFA3;
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
  color: #64748b;
  margin-top: 1rem;
  max-width: 80%;
  text-align: center;
}

.divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
  color: #27272a;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: #27272a;
}
.divider span {
  padding: 0 1rem;
  color: #64748b;
}

.file-preview {
  background-color: #09090b;
  border: 1px solid #27272a;
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
  color: #00FFA3;
}
.file-preview-clear {
  color: #a1a1aa;
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
  color: #a1a1aa;
  max-height: 150px;
  overflow-y: auto;
}
.file-preview-list .file-item {
  padding: 0.25rem 0;
  border-bottom: 1px dashed #27272a;
}
.file-preview-list .file-item:last-child {
  border-bottom: none;
}
.file-preview-summary {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid #27272a;
  font-size: 0.75rem;
  color: #64748b;
  font-family: 'JetBrains Mono', monospace;
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
  background-color: #09090b;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid #27272a;
}
.progress-bar {
  height: 100%;
  background-color: #00FFA3;
  width: 0%;
  transition: width 0.3s ease;
  box-shadow: 0 0 10px #00FFA3;
}
.progress-text {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #00FFA3;
  text-align: center;
  font-family: 'JetBrains Mono', monospace;
}

.form-hint {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.5rem;
}

.spinner {
  border: 2px solid rgba(0,255,163,0.3);
  border-radius: 50%;
  border-top-color: #00FFA3;
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
</style>
