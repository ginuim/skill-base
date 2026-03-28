<template>
  <div>
    <!-- 导航栏 -->
    <SkillBaseNav :current-path="'/publish'"></SkillBaseNav>

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
            <span>发布新版本</span>
          </h1>

          <form @submit.prevent="handlePublish" class="space-y-6">
            <!-- 文件上传 -->
            <div class="form-group">
              <label class="form-label font-mono text-base-400 mb-2 block required">上传文件</label>
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
                <div class="drop-zone-text">拖拽 Skill 文件夹或 zip 到此处</div>
                <div class="drop-zone-subtitle">或点击选择文件夹</div>
                <div class="drop-zone-hint">// Skill ID、名称、描述均从包内读取，不可手改</div>
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
                  <span>选择 zip 文件...</span>
                  <input type="file" ref="zipInput" class="hidden" accept=".zip" @change="handleZipSelect">
                </label>
              </div>

              <div id="file-preview" class="file-preview" :class="{ 'visible': selectedFiles.length > 0 }">
                <div class="file-preview-header">
                  <span>已选择文件</span>
                  <button type="button" class="file-preview-clear" @click="clearFiles">[ clear ]</button>
                </div>
                <div id="file-preview-list" class="file-preview-list">
                  <div v-for="file in selectedFiles.slice(0, 20)" :key="file.name" class="file-item">
                    {{ file.name }} ({{ formatFileSize(file.size) }})
                  </div>
                  <div v-if="selectedFiles.length > 20" class="mt-2 text-neon-400">
                    ...还有 {{ selectedFiles.length - 20 }} 个文件
                  </div>
                </div>
                <div id="file-preview-summary" class="file-preview-summary">
                  共 {{ selectedFiles.length }} 个文件
                </div>
              </div>
            </div>

            <!-- Skill 选择 -->
            <div class="form-group">
              <label for="skill-select" class="form-label font-mono text-base-400 mb-2 block">选择 Skill</label>
              <select
                id="skill-select"
                v-model="form.skillId"
                class="rounded-lg px-4 py-2.5 w-full"
                :disabled="isPublishing"
              >
                <option value="">-- 创建新 Skill --</option>
                <option
                  v-for="skill in mySkills"
                  :key="skill.id"
                  :value="skill.id"
                >
                  {{ skill.name }}
                </option>
              </select>
              <p class="form-hint">// 更新已有 Skill 时请选择与包内 Skill ID 一致的一项；新建则保持「创建新 Skill」</p>
            </div>

            <!-- Skill 元信息 (只读) -->
            <div class="skill-meta-readonly space-y-4 pt-4 border-t border-base-800">
              <div class="form-group">
                <label for="skill-id" class="form-label font-mono text-base-400 mb-2 block required">Skill ID</label>
                <input
                  type="text"
                  id="skill-id"
                  v-model="form.skillId"
                  readonly
                  placeholder="上传文件夹或 zip 后自动填入"
                  pattern="[a-z0-9\-_]+"
                  class="rounded-lg px-4 py-2.5 w-full"
                >
                <p class="form-hint">// 由文件夹名或 zip 文件名推导（小写字母、数字、连字符、下划线）</p>
              </div>

              <div class="form-group">
                <label for="skill-name" class="form-label font-mono text-base-400 mb-2 block required">Skill 名称</label>
                <input
                  type="text"
                  id="skill-name"
                  v-model="form.name"
                  readonly
                  placeholder="上传后从 SKILL.md 读取"
                  class="rounded-lg px-4 py-2.5 w-full"
                >
              </div>

              <div class="form-group">
                <label for="skill-description" class="form-label font-mono text-base-400 mb-2 block required">描述</label>
                <textarea
                  id="skill-description"
                  v-model="form.description"
                  rows="3"
                  readonly
                  maxlength="500"
                  placeholder="上传后从 SKILL.md 读取"
                  class="rounded-lg px-4 py-2.5 w-full"
                ></textarea>
                <p class="form-hint"><span class="text-neon-400">{{ form.description.length }}</span> / 500 chars</p>
              </div>
            </div>

            <!-- 更新说明 -->
            <div class="form-group pt-4 border-t border-base-800">
              <label for="changelog" class="form-label font-mono text-base-400 mb-2 block">更新说明</label>
              <textarea
                id="changelog"
                v-model="form.changelog"
                rows="4"
                :disabled="isPublishing"
                placeholder="描述本次更新的内容...
- feat: add new feature
- fix: resolve issue"
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
              <router-link to="/" class="btn btn-secondary px-6 py-2.5 rounded-lg">取消</router-link>
              <button
                type="submit"
                id="submit-btn"
                :disabled="!canPublish || isPublishing"
                class="btn btn-primary px-6 py-2.5 rounded-lg flex items-center gap-2"
              >
                <svg v-if="!isPublishing" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <span v-if="isPublishing" class="spinner spinner-sm"></span>
                {{ isPublishing ? '发布中...' : '发布新版本' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import JSZip from 'jszip'
import { useAuthStore } from '@/stores/auth'
import { skillsApi } from '@/services/api'
import SkillBaseNav from '@/components/SkillBaseNav.vue'
import type { Skill } from '@/services/api'

const router = useRouter()
const authStore = useAuthStore()

const fileInput = ref<HTMLInputElement>()
const zipInput = ref<HTMLInputElement>()
const mySkills = ref<Skill[]>([])
const selectedFiles = ref<File[]>([])
const isDragging = ref(false)
const isPublishing = ref(false)
const progress = ref(0)
const progressText = ref('')
const error = ref('')

const form = ref({
  skillId: '',
  name: '',
  description: '',
  changelog: '',
})

const canPublish = computed(() => {
  return form.value.name && selectedFiles.value.length > 0
})

onMounted(async () => {
  const isAuth = await authStore.fetchUser()
  if (!isAuth) {
    router.push('/login')
    return
  }

  try {
    const response = await skillsApi.list()
    mySkills.value = response.skills.filter((s: Skill) => s.permission === 'owner' || s.permission === 'collaborator')
  } catch (err) {
    console.error('Failed to load skills:', err)
  }
})

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    selectedFiles.value = Array.from(target.files)
    extractSkillInfo(target.files)
  }
}

function handleZipSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    loadZipFile(target.files[0])
  }
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  const items = event.dataTransfer?.items
  if (items) {
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item && item.kind === 'file') {
        const file = item.getAsFile()
        if (file) {
          if (file.name.endsWith('.zip')) {
            await loadZipFile(file)
            return
          }
          files.push(file)
        }
      }
    }
    if (files.length > 0) {
      selectedFiles.value = files
      extractSkillInfo(files as unknown as FileList)
    }
  }
}

async function loadZipFile(file: File) {
  try {
    const zip = await JSZip.loadAsync(file)
    const files: File[] = []
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        files.push(new File([], zipEntry.name))
      }
    })
    selectedFiles.value = files

    const skillMd = zip.file('SKILL.md')
    if (skillMd) {
      const content = await skillMd.async('string')
      parseSkillMd(content, file.name)
    }
  } catch (err) {
    error.value = '无法读取 zip 文件'
  }
}

function parseSkillMd(content: string, fallbackName: string) {
  const lines = content.split('\n')
  let name = ''
  let description = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() || ''
    if (line.startsWith('# ')) {
      name = line.substring(2).trim()
    } else if (name && !description && line && !line.startsWith('#')) {
      description = line
      break
    }
  }

  if (!name) {
    name = fallbackName.replace(/\.(zip|git|hg)/g, '').replace(/[_-]/g, ' ')
  }

  form.value.name = name
  form.value.description = description.substring(0, 500)
  form.value.skillId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function extractSkillInfo(files: FileList) {
  const fileArray = Array.from(files)
  const firstFile = fileArray[0]
  const skillMdFile = fileArray.find(f => f.name === 'SKILL.md')

  if (skillMdFile) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      parseSkillMd(content, firstFile?.webkitRelativePath || firstFile?.name || 'new-skill')
    }
    reader.readAsText(skillMdFile)
  } else {
    const folderName = firstFile?.webkitRelativePath?.split('/')[0] || firstFile?.name || 'new-skill'
    form.value.skillId = folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    form.value.name = folderName.replace(/[_-]/g, ' ')
  }
}

function clearFiles() {
  selectedFiles.value = []
  if (fileInput.value) fileInput.value.value = ''
  if (zipInput.value) zipInput.value.value = ''
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function handlePublish() {
  if (!canPublish.value || isPublishing.value) return

  error.value = ''
  isPublishing.value = true
  progress.value = 0
  progressText.value = '准备上传...'

  try {
    const zip = new JSZip()

    for (const file of selectedFiles.value) {
      const path = file.webkitRelativePath || file.name
      zip.file(path, file)
    }

    progressText.value = '压缩文件...'
    progress.value = 30

    const zipBlob = await zip.generateAsync({ type: 'blob' })

    progressText.value = '上传中...'
    progress.value = 60

    const formData = new FormData()
    formData.append('file', zipBlob, 'skill.zip')
    if (form.value.skillId) formData.append('skill_id', form.value.skillId)
    if (form.value.changelog) formData.append('changelog', form.value.changelog)

    const response = await fetch('/api/v1/skills/upload', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    })

    progress.value = 100
    progressText.value = '完成!'

    if (response.ok) {
      setTimeout(() => {
        router.push('/')
      }, 500)
    } else {
      const data = await response.json()
      error.value = data.detail || '上传失败'
      isPublishing.value = false
    }
  } catch (err: any) {
    error.value = err.message || '上传失败'
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

.btn-primary {
  background-color: transparent !important;
  border: 1px solid #00E592 !important;
  color: #00FFA3 !important;
  box-shadow: 0 0 15px rgba(0,255,163,0.1) !important;
  font-family: 'JetBrains Mono', monospace;
}
.btn-primary:hover {
  background-color: rgba(0,255,163,0.1) !important;
  box-shadow: 0 0 20px rgba(0,255,163,0.2) !important;
  color: #00FFA3 !important;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-secondary {
  background-color: transparent !important;
  border: 1px solid #27272a !important;
  color: #e4e4e7 !important;
  font-family: 'JetBrains Mono', monospace;
}
.btn-secondary:hover {
  background-color: #27272a !important;
  color: #fff !important;
}

input[type="text"],
textarea,
select {
  font-family: 'JetBrains Mono', monospace !important;
  background-color: #09090b !important;
  border-color: #27272a !important;
  color: #fff !important;
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
  color: #a1a1aa !important;
  border-color: #27272a !important;
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
