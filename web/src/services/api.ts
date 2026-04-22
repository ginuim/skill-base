/**
 * Skill Base - API Service
 * 封装 fetch 请求，处理认证、错误等
 */

import { apiBasePath, withBasePath } from '@/utils/basePath'

const API_BASE = apiBasePath

export interface ApiOptions {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
}

export interface ApiError extends Error {
  status?: number
  data?: any
}

/**
 * 封装 fetch 请求
 */
export async function api<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
  const url = path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`

  const headers: Record<string, string> = {
    ...options.headers,
  }

  // 如果不是 FormData，添加 JSON content-type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })

  // 处理 204 No Content
  if (response.status === 204) {
    return null as T
  }

  // 解析响应
  const contentType = response.headers.get('content-type')
  let data: any

  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  // 处理错误响应
  if (!response.ok) {
    const error = new Error(data?.detail || data?.error || data?.message || `请求失败 (${response.status})`) as ApiError
    error.status = response.status
    error.data = data
    throw error
  }

  return data as T
}

/**
 * GET 请求
 */
export function apiGet<T = any>(path: string): Promise<T> {
  return api<T>(path, { method: 'GET' })
}

/**
 * POST 请求
 */
export function apiPost<T = any>(path: string, body?: any): Promise<T> {
  return api<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

/**
 * PUT 请求
 */
export function apiPut<T = any>(path: string, body?: any): Promise<T> {
  return api<T>(path, {
    method: 'PUT',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

/**
 * PATCH 请求
 */
export function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  return api<T>(path, {
    method: 'PATCH',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

/**
 * DELETE 请求
 */
export function apiDelete<T = any>(path: string): Promise<T> {
  return api<T>(path, { method: 'DELETE' })
}

/**
 * 检查系统是否已初始化
 */
export async function checkSystemInit(): Promise<boolean> {
  const setupPath = withBasePath('/setup')
  // setup 页面不需要检查
  if (window.location.pathname === setupPath) {
    return true
  }

  try {
    const res = await fetch(`${API_BASE}/init/status`)
    const data = await res.json()

    if (!data.initialized) {
      window.location.href = setupPath
      return false
    }
    return true
  } catch (err) {
    console.error('Failed to check system init status:', err)
    return true
  }
}

// ===== Auth API =====

export interface LoginRequest {
  username: string
  password: string
}

export interface User {
  id: number
  username: string
  name: string | null
  email: string | null
  role: 'admin' | 'developer'
  is_super_admin?: number
  /** 账号状态；列表/详情接口返回，登录响应可能省略 */
  status?: 'active' | 'disabled'
  created_at: string
  updated_at?: string | null
}

export interface Tag {
  id: number
  name: string
  usage_count?: number
}

export const authApi = {
  login: (data: LoginRequest) => apiPost<{ user: User }>('/auth/login', data),
  logout: () => apiPost('/auth/logout'),
  me: () => apiGet<User>('/auth/me'),
}

// ===== Skills API =====

/** 技能详情里除所有者外的协作者（与 GET /skills/:id 的 collaborators 一致） */
export interface SkillCollaboratorUser {
  id: number
  username: string
  name: string | null
  email?: string | null
}

export interface Skill {
  id: string
  name: string
  description: string
  visibility: 'public' | 'private'
  owner: User
  created_at: string
  updated_at: string
  latest_version?: string
  permission?: 'owner' | 'collaborator' | 'user'
  /** 仅所有者/协作者可见 */
  webhook_url?: string | null
  favorite_count: number
  download_count: number
  is_favorited?: boolean
  tags: Tag[]
}

export interface SkillVersion {
  id: number
  skill_id: string
  version: string
  changelog: string
  description?: string
  file_count: number
  total_size: number
  created_by: number
  uploader?: User
  created_at: string
  download_count: number
}

export interface SkillDetail extends Skill {
  versions: SkillVersion[]
  collaborators?: SkillCollaboratorUser[]
}

export interface GithubImportPreview {
  default_skill_id: string
  name: string
  description: string
  conflict: boolean
  can_publish: boolean
  suggested_skill_id: string
  repo: { owner: string; repo: string }
  ref: string
  subpath?: string
}

export interface GithubImportBody {
  source: string
  ref?: string
  subpath?: string
  target_skill_id: string
  changelog?: string
  visibility?: 'public' | 'private'
}

/** GET /skills/import/github/connectivity */
export type GithubConnectivityResult =
  | { reachable: true; latency_ms: number; checked_at: string; http_status?: number }
  | { reachable: false; error: string; detail?: string; checked_at: string }

export const skillsApi = {
  list: (query?: string) => apiGet<{ skills: Skill[] }>(`/skills${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  get: (id: string) => apiGet<SkillDetail>(`/skills/${id}`),
  create: (data: { name: string; description: string }) => apiPost<Skill>('/skills', data),
  update: (id: string, data: { name?: string; description?: string; webhook_url?: string | null; visibility?: 'public' | 'private' }) =>
    apiPut<Skill>(`/skills/${id}`, data),
  delete: (id: string, confirm: string) => apiDelete(`/skills/${id}?confirm=${encodeURIComponent(confirm)}`),
  upload: (data: FormData) => apiPost('/skills/publish', data),
  importGithubConnectivity: () => apiGet<GithubConnectivityResult>('/skills/import/github/connectivity'),
  importGithubPreview: (body: { source: string; ref?: string; subpath?: string }) =>
    apiPost<GithubImportPreview>('/skills/import/github/preview', body),
  importGithub: (body: GithubImportBody) =>
    apiPost<{ ok: boolean; skill_id: string; version: string; created_at: string }>(
      '/skills/import/github',
      body
    ),
  favorite: (id: string) =>
    apiPost<{ ok: boolean; skill_id: string; favorited: boolean; favorite_count: number }>(`/skills/${id}/favorite`),
  unfavorite: (id: string) =>
    apiDelete<{ ok: boolean; skill_id: string; favorited: boolean; favorite_count: number }>(`/skills/${id}/favorite`),
  updateTags: (id: string, tag_ids: number[]) =>
    apiPut<{ ok: boolean; skill_id: string; tags: Tag[] }>(`/skills/${id}/tags`, { tag_ids }),
  setHead: (id: string, version: string) => apiPut<{ ok: boolean, skill_id: string, latest_version: string }>(`/skills/${id}/head`, { version }),
}

// ===== Versions API =====

export const versionsApi = {
  list: (skillId: string) => apiGet<{ versions: SkillVersion[] }>(`/skills/${skillId}/versions`),
  viewUrl: (skillId: string, version: string) => `${API_BASE}/skills/${skillId}/versions/${version}/view`,
  downloadUrl: (skillId: string, version: string) => `${API_BASE}/skills/${skillId}/versions/${version}/download`,
  update: (skillId: string, version: string, data: { description?: string; changelog?: string }) => apiPatch<SkillVersion>(`/skills/${skillId}/versions/${version}`, data),
}

export const tagsApi = {
  list: () => apiGet<{ tags: Tag[] }>('/tags'),
  create: (name: string) => apiPost<{ ok: boolean; tag: Tag }>('/tags', { name }),
  update: (id: number, name: string) => apiPatch<{ ok: boolean; tag: Tag }>(`/tags/${id}`, { name }),
  delete: (id: number) => apiDelete<{ ok: boolean }>(`/tags/${id}`),
}

// ===== Collaborators API =====

export interface SkillCollaboratorEntry {
  id: number
  user: { id: number; username: string; name: string | null; status?: string }
  role: 'owner' | 'collaborator'
  created_at: string
  created_by?: { id: number; username: string }
}

export const collaboratorsApi = {
  list: (skillId: string) =>
    apiGet<{ skill_id: string; collaborators: SkillCollaboratorEntry[] }>(`/skills/${skillId}/collaborators`),
  add: (skillId: string, username: string) => apiPost(`/skills/${skillId}/collaborators`, { username }),
  remove: (skillId: string, userId: number) => apiDelete(`/skills/${skillId}/collaborators/${userId}`),
}

// ===== Users API =====

export const usersApi = {
  /** 省略 q 或空字符串：全部活跃用户（服务端上限 2000）；有 q：模糊搜索（上限 100） */
  search: (q?: string) => {
    const qs = q != null && q.trim() !== '' ? `?q=${encodeURIComponent(q.trim())}` : ''
    return apiGet<{ users: User[] }>(`/users/search${qs}`)
  },
  list: () => apiGet<{ users: User[] }>('/users'),
  create: (data: { username: string; password: string; name?: string; email?: string; role?: string }) =>
    apiPost<User>('/users', data),
  update: (id: number, data: { name?: string; email?: string; role?: string; status?: string }) =>
    apiPatch<User>(`/users/${id}`, data),
  resetPassword: (id: number, new_password: string) =>
    apiPost(`/users/${id}/reset-password`, { new_password }),
  delete: (id: number) => apiDelete(`/users/${id}`),
}

// ===== Init API =====

export const initApi = {
  status: () => apiGet<{ initialized: boolean }>('/init/status'),
  setup: (data: { admin_username: string; admin_password: string }) =>
    apiPost('/init/setup', data),
}
