# Skill Base API 文档

## 基础信息

| 项目 | 说明 |
|------|------|
| 基础 URL | `http://localhost:8000` |
| API 前缀 | `/api/v1` |
| 请求格式 | JSON |
| 文件上传 | `multipart/form-data` |

## 认证方式

- **Session Cookie**: 登录后自动设置 `session_id` Cookie
- **PAT (Personal Access Token)**: 通过 CLI 验证码流程获取

---

## 认证模块 `/api/v1/auth`

### 1. 用户登录

**POST** `/api/v1/auth/login`

用户登录并创建 Session。

**请求体:**
```json
{
  "username": "string",
  "password": "string"
}
```

**响应:**
```json
{
  "ok": true,
  "user": {
    "id": "string",
    "username": "string",
    "role": "string"
  }
}
```

**错误码:**
- `400` - 用户名和密码不能为空
- `401` - 用户名或密码错误

---

### 2. 用户登出

**POST** `/api/v1/auth/logout`

用户登出并清除 Session。

**响应:**
```json
{
  "ok": true
}
```

---

### 3. 生成 CLI 验证码

**POST** `/api/v1/auth/cli-code/generate`

生成用于 CLI 登录的临时验证码（有效期 5 分钟）。

**认证:** 需要 Session

**响应:**
```json
{
  "ok": true,
  "code": "string",
  "expires_at": "2026-03-24T12:00:00.000Z"
}
```

---

### 4. 验证 CLI 验证码

**POST** `/api/v1/auth/cli-code/verify`

验证 CLI 验证码并生成 PAT。

**请求体:**
```json
{
  "code": "string"
}
```

**响应:**
```json
{
  "ok": true,
  "token": "string",
  "user": {
    "id": "string",
    "username": "string"
  }
}
```

**错误码:**
- `400` - 验证码不能为空
- `401` - 验证码无效或已过期

---

### 5. 获取当前用户信息

**GET** `/api/v1/auth/me`

获取当前登录用户信息。

**认证:** 需要 Session

**响应:**
```json
{
  "id": "string",
  "username": "string",
  "role": "string"
}
```

---

## Skill 模块 `/api/v1/skills`

### 1. 获取 Skill 列表

**GET** `/api/v1/skills`

获取所有 Skill 列表，支持搜索。

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 可选，搜索关键词 |

**响应:**
```json
{
  "skills": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "latest_version": "string",
      "owner": {
        "id": "string",
        "username": "string"
      },
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "total": 0
}
```

---

### 2. 获取单个 Skill

**GET** `/api/v1/skills/:skill_id`

获取指定 Skill 的详细信息。

**路径参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `skill_id` | string | Skill ID |

**响应:**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "latest_version": "string",
  "owner": {
    "id": "string",
    "username": "string"
  },
  "created_at": "string",
  "updated_at": "string"
}
```

**错误码:**
- `404` - Skill not found

---

### 3. 获取 Skill 版本列表

**GET** `/api/v1/skills/:skill_id/versions`

获取指定 Skill 的所有版本。

**路径参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `skill_id` | string | Skill ID |

**响应:**
```json
{
  "skill_id": "string",
  "versions": [
    {
      "id": "string",
      "skill_id": "string",
      "version": "string",
      "changelog": "string",
      "zip_path": "string",
      "uploader": {
        "id": "string",
        "username": "string"
      },
      "created_at": "string"
    }
  ]
}
```

**错误码:**
- `404` - Skill not found

---

### 4. 下载版本文件

**GET** `/api/v1/skills/:skill_id/versions/:version/download`

下载指定版本的 ZIP 文件。

**路径参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `skill_id` | string | Skill ID |
| `version` | string | 版本号，可使用 `latest` 获取最新版本 |

**响应:** ZIP 文件流 (`Content-Type: application/zip`)

**错误码:**
- `404` - Version not found

---

## 发布模块 `/api/v1/skills`

### 1. 发布新版本

**POST** `/api/v1/skills/publish`

发布新的 Skill 版本（支持创建新 Skill）。

**认证:** 需要 Session

**请求格式:** `multipart/form-data`

**表单字段:**
| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `zip_file` | file | 是 | Skill 文件 ZIP 包 |
| `skill_id` | string | 是 | Skill ID |
| `name` | string | 条件 | 新 Skill 必需，Skill 名称 |
| `description` | string | 否 | Skill 描述 |
| `changelog` | string | 否 | 版本更新日志 |

**响应:**
```json
{
  "ok": true,
  "skill_id": "string",
  "version": "v20260324.221016",
  "created_at": "string"
}
```

**错误码:**
- `400` - 缺少必需字段
- `401` - 未认证

---

## 用户模块 `/api/v1/users`

管理员相关接口需 **管理员** 权限（`requireAdmin`）。部署时若配置了 `base-path`（如 `/sb`），则完整路径为 `{base-path}/api/v1/users`。

### 1. 用户搜索（协作者等）

**GET** `/api/v1/users/search`

**认证:** 需要 Session（普通登录用户即可）

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 必填，至少 1 个字符 |

**响应:** `{ "users": [ { "id", "username", "name", "status" } ] }`（仅返回 `status` 为 `active` 的用户）

---

### 2. 用户列表

**GET** `/api/v1/users`

**认证:** 管理员

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 可选，用户名或姓名模糊搜索 |
| `status` | string | 可选，`active` / `disabled` |
| `page` | number | 可选，默认 `1` |
| `limit` | number | 可选，默认 `20`，最大 `100` |

**响应:**
```json
{
  "users": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

---

### 3. 创建用户

**POST** `/api/v1/users`

**认证:** 管理员

**请求体:**
```json
{
  "username": "string",
  "password": "string",
  "name": "string",
  "role": "developer"
}
```

| 字段 | 说明 |
|------|------|
| `username` / `password` | 必填；密码至少 6 位 |
| `name` | 可选 |
| `role` | 可选，默认 `developer`；取值仅 `admin` 或 `developer` |

**响应:** `201`，`{ "ok": true, "user": { ... } }`

---

### 4. 用户详情

**GET** `/api/v1/users/:user_id`

**认证:** 管理员

**响应:** 含 `id`, `username`, `name`, `role`, `status`, `created_at`, `updated_at`；若有创建者则含 `created_by: { id, username }`。

---

### 5. 更新用户

**PATCH** `/api/v1/users/:user_id`

**认证:** 管理员

**说明:** 使用 **PATCH**，不要使用 PUT（未注册会返回 `404`）。

**请求体（至少提供其一）:**
```json
{
  "name": "string",
  "role": "admin",
  "status": "active"
}
```

| 字段 | 说明 |
|------|------|
| `role` | `admin` 或 `developer` |
| `status` | `active` 或 `disabled` |

管理员不能禁用自己的账号，也不能把自己的角色降为 `developer`。

**响应:** `{ "ok": true, "user": { ... } }`

---

### 6. 重置密码

**POST** `/api/v1/users/:user_id/reset-password`

**认证:** 管理员

**请求体:**
```json
{
  "new_password": "string"
}
```

密码至少 6 位。**响应:** `{ "ok": true, "message": "Password has been reset" }`

---

## 数据模型

### User
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 用户 ID |
| `username` | string | 用户名 |
| `name` | string | 显示名（可选） |
| `role` | string | `admin` 或 `developer`（普通平台用户为 `developer`） |
| `status` | string | `active` 或 `disabled` |

### Skill
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Skill ID |
| `name` | string | Skill 名称 |
| `description` | string | Skill 描述 |
| `latest_version` | string | 最新版本号 |
| `owner` | object | 所有者信息 `{id, username}` |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

### Version
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 版本 ID |
| `skill_id` | string | 所属 Skill ID |
| `version` | string | 版本号（格式：`vYYYYMMDD.HHMMSS`） |
| `changelog` | string | 更新日志 |
| `zip_path` | string | ZIP 文件路径 |
| `uploader` | object | 上传者信息 `{id, username}` |
| `created_at` | string | 创建时间 |
