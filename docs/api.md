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

## 数据模型

### User
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 用户 ID |
| `username` | string | 用户名 |
| `role` | string | 角色 |

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
