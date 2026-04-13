import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { skillsApi, versionsApi, collaboratorsApi, type Skill, type SkillDetail, type SkillVersion } from '@/services/api'

export const useSkillsStore = defineStore('skills', () => {
  // State
  const skills = ref<Skill[]>([])
  const currentSkill = ref<SkillDetail | null>(null)
  const isLoading = ref(false)
  const isLoadingDetail = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  // Getters
  const sortedSkills = computed(() => {
    return [...skills.value].sort((a, b) => {
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  })

  const filteredSkills = computed(() => {
    if (!searchQuery.value.trim()) return sortedSkills.value
    const query = searchQuery.value.toLowerCase()
    return sortedSkills.value.filter(skill =>
      skill.name.toLowerCase().includes(query) ||
      skill.description.toLowerCase().includes(query)
    )
  })

  const canEditCurrentSkill = computed(() => {
    if (!currentSkill.value) return false
    return currentSkill.value.permission === 'owner' || currentSkill.value.permission === 'collaborator'
  })

  const isOwner = computed(() => {
    return currentSkill.value?.permission === 'owner'
  })

  const currentVersions = computed(() => {
    return currentSkill.value?.versions || []
  })

  // Actions
  async function fetchSkills(query?: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await skillsApi.list(query)
      skills.value = response.skills
      return true
    } catch (err: any) {
      error.value = err.message || '获取 Skill 列表失败'
      return false
    } finally {
      isLoading.value = false
    }
  }

  async function fetchSkill(id: string) {
    isLoadingDetail.value = true
    error.value = null
    currentSkill.value = null

    try {
      const response = await skillsApi.get(id)
      currentSkill.value = { ...response, collaborators: response.collaborators ?? [] }
      return true
    } catch (err: any) {
      error.value = err.message || '获取 Skill 详情失败'
      currentSkill.value = null
      return false
    } finally {
      isLoadingDetail.value = false
    }
  }

  async function createSkill(data: { name: string; description: string }) {
    error.value = null

    try {
      const response = await skillsApi.create(data)
      skills.value.unshift(response)
      return response
    } catch (err: any) {
      error.value = err.message || '创建 Skill 失败'
      throw err
    }
  }

  async function updateSkill(id: string, data: { name?: string; description?: string; webhook_url?: string | null }) {
    error.value = null

    try {
      const response = await skillsApi.update(id, data)
      // Update in list
      const index = skills.value.findIndex(s => s.id === id)
      if (index !== -1) {
        skills.value[index] = { ...skills.value[index], ...response }
      }
      // Update current skill if matches
      if (currentSkill.value?.id === id) {
        currentSkill.value = { ...currentSkill.value, ...response }
      }
      return response
    } catch (err: any) {
      error.value = err.message || '更新 Skill 失败'
      throw err
    }
  }

  async function deleteSkill(id: string, confirm: string) {
    error.value = null

    try {
      await skillsApi.delete(id, confirm)
      skills.value = skills.value.filter(s => s.id !== id)
      if (currentSkill.value?.id === id) {
        currentSkill.value = null
      }
      return true
    } catch (err: any) {
      error.value = err.message || '删除 Skill 失败'
      return false
    }
  }

  async function fetchVersions(skillId: string) {
    try {
      const response = await versionsApi.list(skillId)
      if (currentSkill.value?.id === skillId) {
        currentSkill.value.versions = response.versions
      }
      return response.versions
    } catch (err: any) {
      error.value = err.message || '获取版本列表失败'
      return []
    }
  }

  async function addCollaborator(skillId: string, username: string) {
    try {
      await collaboratorsApi.add(skillId, username)
      // Refresh skill to get updated collaborators
      await fetchSkill(skillId)
      return true
    } catch (err: any) {
      error.value = err.message || '添加协作者失败'
      return false
    }
  }

  async function removeCollaborator(skillId: string, userId: number) {
    try {
      await collaboratorsApi.remove(skillId, userId)
      // Refresh skill to get updated collaborators
      await fetchSkill(skillId)
      return true
    } catch (err: any) {
      error.value = err.message || '移除协作者失败'
      return false
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function clearCurrentSkill() {
    currentSkill.value = null
  }

  function clearError() {
    error.value = null
  }

  return {
    // State
    skills,
    currentSkill,
    isLoading,
    isLoadingDetail,
    error,
    searchQuery,
    // Getters
    sortedSkills,
    filteredSkills,
    canEditCurrentSkill,
    isOwner,
    currentVersions,
    // Actions
    fetchSkills,
    fetchSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    fetchVersions,
    addCollaborator,
    removeCollaborator,
    setSearchQuery,
    clearCurrentSkill,
    clearError,
  }
})
