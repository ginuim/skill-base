<template>
    <div class="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div class="container mx-auto max-w-5xl">
      <!-- Loading State -->
      <div v-if="skillsStore.isLoadingDetail" class="flex items-center justify-center py-20">
        <div class="spinner"></div>
      </div>

      <!-- Error State -->
      <div v-else-if="!skill" class="text-center py-20">
        <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-base-800 flex items-center justify-center">
          <svg class="w-10 h-10 text-base-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-2">Skill 不存在</h3>
        <p class="text-base-400 mb-6">该 Skill 可能已被删除或你没有访问权限</p>
        <router-link to="/" class="btn-primary px-6 py-3 rounded-lg">
          返回首页
        </router-link>
      </div>

      <!-- Skill Detail -->
      <template v-else>
        <!-- Back Button -->
        <router-link
          to="/"
          class="inline-flex items-center gap-2 text-base-400 hover:text-white mb-6 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
          返回列表
        </router-link>

        <!-- Skill Info Card -->
        <div class="card p-6 mb-6">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h1 class="text-2xl font-bold text-white flex items-center gap-3">
                <span class="text-neon-400">></span>
                {{ skill.name }}
              </h1>
              <p class="text-base-400 mt-2">{{ skill.description || '暂无描述' }}</p>
            </div>
            <div class="flex items-center gap-2">
              <span
                v-if="skill.permission"
                class="px-3 py-1 rounded-full text-xs font-mono border"
                :class="{
                  'bg-neon-400/10 text-neon-400 border-neon-400/20': skill.permission === 'owner',
                  'bg-blue-400/10 text-blue-400 border-blue-400/20': skill.permission === 'collaborator',
                  'bg-base-800 text-base-400 border-base-700': skill.permission === 'user'
                }"
              >
                {{ skill.permission }}
              </span>
            </div>
          </div>

          <!-- Meta Info -->
          <div class="flex flex-wrap items-center gap-4 text-sm text-base-500 border-t border-base-800 pt-4">
            <div class="flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-base-800 flex items-center justify-center text-xs">
                {{ (skill.owner?.name || skill.owner?.username || 'U').charAt(0).toUpperCase() }}
              </span>
              <span>{{ skill.owner?.name || skill.owner?.username || '未知' }}</span>
            </div>
            <span class="text-base-700">|</span>
            <span>创建于 {{ formatDate(skill.created_at) }}</span>
            <span class="text-base-700">|</span>
            <span>更新于 {{ formatDate(skill.updated_at) }}</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="border-b border-base-800 mb-6">
          <div class="flex gap-6">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="pb-4 text-sm font-medium transition-colors relative"
              :class="activeTab === tab.id ? 'text-neon-400' : 'text-base-400 hover:text-white'"
            >
              {{ tab.name }}
              <span
                v-if="tab.id === 'versions' && skill.versions?.length"
                class="ml-2 px-2 py-0.5 rounded-full text-xs bg-base-800 text-base-400"
              >
                {{ skill.versions.length }}
              </span>
              <div
                v-if="activeTab === tab.id"
                class="absolute bottom-0 left-0 right-0 h-0.5 bg-neon-400"
              ></div>
            </button>
          </div>
        </div>

        <!-- Versions Tab -->
        <div v-if="activeTab === 'versions'" class="space-y-4">
          <div
            v-for="version in skill.versions"
            :key="version.id"
            class="card p-4 flex items-center justify-between group hover:border-neon-400/30 transition-colors"
          >
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-lg bg-neon-400/10 flex items-center justify-center">
                <svg class="w-5 h-5 text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-neon-400">{{ version.version }}</span>
                  <span v-if="version.id === skill.latest_version?.id" class="px-2 py-0.5 rounded text-xs bg-neon-400/10 text-neon-400 border border-neon-400/20">
                    latest
                  </span>
                </div>
                <p class="text-sm text-base-400 mt-1">{{ version.changelog || '无更新日志' }}</p>
                <div class="flex items-center gap-4 mt-2 text-xs text-base-500">
                  <span>{{ version.file_count }} 个文件</span>
                  <span>{{ formatFileSize(version.total_size) }}</span>
                  <span>by {{ version.creator?.name || version.creator?.username || '未知' }}</span>
                  <span>{{ formatDate(version.created_at) }}</span>
                </div>
              </div>
            </div>
            <button
              @click="downloadVersion(version.id)"
              class="btn-secondary px-4 py-2 rounded-lg text-sm flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              下载
            </button>
          </div>

          <div v-if="!skill.versions?.length" class="text-center py-12">
            <p class="text-base-400">暂无版本</p>
          </div>
        </div>

        <!-- Collaborators Tab -->
        <div v-if="activeTab === 'collaborators'" class="space-y-4">
          <div v-if="skillsStore.isOwner" class="card p-4">
            <h3 class="text-sm font-medium text-white mb-4">添加协作者</h3>
            <div class="flex gap-4">
              <input
                v-model="newCollaborator"
                type="text"
                placeholder="输入用户名"
                class="flex-1 px-4 py-2 rounded-lg"
                @keyup.enter="addCollaborator"
              />
              <button
                @click="addCollaborator"
                :disabled="!newCollaborator || isAddingCollaborator"
                class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
              >
                <span v-if="isAddingCollaborator" class="spinner spinner-sm"></span>
                <template v-else>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                  </svg>
                  添加
                </template>
              </button>
            </div>
          </div>

          <div class="grid gap-4">
            <!-- Owner -->
            <div class="card p-4 flex items-center justify-between">
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-full bg-neon-400/20 flex items-center justify-center text-neon-400 font-bold">
                  {{ (skill.owner?.name || skill.owner?.username || 'U').charAt(0).toUpperCase() }}
                </span>
                <div>
                  <div class="font-medium text-white">{{ skill.owner?.name || skill.owner?.username }}</div>
                  <div class="text-sm text-base-400">{{ skill.owner?.email || '' }}</div>
                </div>
              </div>
              <span class="px-3 py-1 rounded-full text-xs font-mono bg-neon-400/10 text-neon-400 border border-neon-400/20">
                owner
              </span>
            </div>

            <!-- Collaborators -->
            <div
              v-for="collaborator in skill.collaborators"
              :key="collaborator.id"
              class="card p-4 flex items-center justify-between group"
            >
              <div class="flex items-center gap-4">
                <span class="w-10 h-10 rounded-full bg-blue-400/20 flex items-center justify-center text-blue-400 font-bold">
                  {{ (collaborator.name || collaborator.username || 'U').charAt(0).toUpperCase() }}
                </span>
                <div>
                  <div class="font-medium text-white">{{ collaborator.name || collaborator.username }}</div>
                  <div class="text-sm text-base-400">{{ collaborator.email || '' }}</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="px-3 py-1 rounded-full text-xs font-mono bg-blue-400/10 text-blue-400 border border-blue-400/20">
                  collaborator
                </span>
                <button
                  v-if="skillsStore.isOwner"
                  @click="removeCollaborator(collaborator.id)"
                  class="p-2 text-base-400 hover:text-red-400 transition-colors"
                  title="移除协作者"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="space-y-6">
          <div v-if="skillsStore.canEditCurrentSkill" class="card p-6">
            <h3 class="text-lg font-medium text-white mb-4">基本信息</h3>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-base-200 mb-2">名称</label>
                <input
                  v-model="editForm.name"
                  type="text"
                  class="w-full px-4 py-3 rounded-lg"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-base-200 mb-2">描述</label>
                <textarea
                  v-model="editForm.description"
                  rows="4"
                  class="w-full px-4 py-3 rounded-lg resize-none"
                ></textarea>
              </div>
              <div class="flex gap-4">
                <button
                  @click="saveSkill"
                  :disabled="isSaving"
                  class="btn-primary px-6 py-2 rounded-lg flex items-center gap-2"
                >
                  <span v-if="isSaving" class="spinner spinner-sm"></span>
                  <template v-else>保存</template>
                </button>
                <button
                  @click="resetForm"
                  class="btn-secondary px-6 py-2 rounded-lg"
                >
                  重置
                </button>
              </div>
            </div>
          </div>

          <div v-if="skillsStore.isOwner" class="card p-6 border-red-500/20">
            <h3 class="text-lg font-medium text-red-400 mb-4">危险操作</h3>
            <p class="text-base-400 text-sm mb-4">删除 Skill 后无法恢复，所有版本数据将被永久删除。</p>
            <button
              @click="confirmDelete"
              class="px-6 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              删除 Skill
            </button>
          </div>
        </div>
      </template>
      </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSkillsStore } from '@/stores/skills'
import { useAuthStore } from '@/stores/auth'
import { versionsApi } from '@/services/api'
import SkillBaseNav from '@/components/SkillBaseNav.vue'

const route = useRoute()
const router = useRouter()
const skillsStore = useSkillsStore()
const authStore = useAuthStore()

const skillId = computed(() => parseInt(route.params.id as string))
const skill = computed(() => skillsStore.currentSkill)

const activeTab = ref('versions')
const tabs = [
  { id: 'versions', name: '版本' },
  { id: 'collaborators', name: '协作者' },
  { id: 'settings', name: '设置' },
]

// Edit form
const editForm = ref({
  name: '',
  description: '',
})
const isSaving = ref(false)

// Collaborators
const newCollaborator = ref('')
const isAddingCollaborator = ref(false)

onMounted(async () => {
  // Check auth
  const isAuth = await authStore.fetchUser()
  if (!isAuth) {
    router.push('/login')
    return
  }

  // Load skill
  await skillsStore.fetchSkill(skillId.value)
  resetForm()
})

watch(skill, (newSkill) => {
  if (newSkill) {
    resetForm()
  }
})

function resetForm() {
  if (skill.value) {
    editForm.value = {
      name: skill.value.name,
      description: skill.value.description,
    }
  }
}

async function saveSkill() {
  isSaving.value = true
  try {
    await skillsStore.updateSkill(skillId.value, editForm.value)
    showToast('保存成功')
  } catch (err) {
    showToast('保存失败', 'error')
  } finally {
    isSaving.value = false
  }
}

async function addCollaborator() {
  if (!newCollaborator.value) return
  isAddingCollaborator.value = true
  try {
    await skillsStore.addCollaborator(skillId.value, newCollaborator.value)
    newCollaborator.value = ''
    showToast('添加成功')
  } catch (err) {
    showToast('添加失败', 'error')
  } finally {
    isAddingCollaborator.value = false
  }
}

async function removeCollaborator(userId: number) {
  if (!confirm('确定要移除该协作者吗？')) return
  try {
    await skillsStore.removeCollaborator(skillId.value, userId)
    showToast('移除成功')
  } catch (err) {
    showToast('移除失败', 'error')
  }
}

async function downloadVersion(versionId: number) {
  try {
    const response = await versionsApi.download(skillId.value, versionId)
    if (response.download_url) {
      window.open(response.download_url, '_blank')
    }
  } catch (err) {
    showToast('下载失败', 'error')
  }
}

function confirmDelete() {
  if (!confirm('确定要删除这个 Skill 吗？此操作不可恢复。')) return
  skillsStore.deleteSkill(skillId.value).then(() => {
    router.push('/')
  })
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Simple toast function
function showToast(message: string, type: 'success' | 'error' = 'success') {
  // You can implement a proper toast system here
  alert(message)
}
</script>
