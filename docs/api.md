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
  "role": "string",
  "is_super_admin": 0
}
```

`is_super_admin` 为 `1` 时表示 **超级管理员**（首个迁移的管理员或初始化时创建的首个管理员），可管理全局标签库；普通管理员不能创建/重命名/删除全局标签，但可为所管理的 Skill 分配已有标签。

---

## Skill 模块 `/api/v1/skills`

### 1. 获取 Skill 列表

**GET** `/api/v1/skills`

获取所有 Skill 列表，支持搜索。

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 可选，搜索关键词 |
| `visibility` | string | 可选，`public` 或 `private`；用于按可见性过滤 |

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

### 5. 预览版本 ZIP（不计下载）

**GET** `/api/v1/skills/:skill_id/versions/:version/view`

返回与 **download** 相同的 ZIP 二进制流，但**不会**增加 Skill 与版本的下载统计。适用于 Web 端内联预览等场景。

**路径参数:** 与 **下载版本文件** 相同；`version` 可使用 `latest`。

**响应:** ZIP 文件流（`Content-Type: application/zip`）

**错误码:**
- `404` - Version not found

---

### 6. 更新 Skill 元数据

**PUT** `/api/v1/skills/:skill_id`

更新名称、描述，以及可选的 **Webhook URL**（用于在 Skill 变更时接收服务端通知）。

**认证:** 需要 Session；更新 `name` / `description` 需对该 Skill 有管理权限。更新 `webhook_url` 仅允许 **所有者或管理员**。

**请求体 (JSON，字段均可选；未出现的字段不修改):**

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | Skill 名称 |
| `description` | string | Skill 描述 |
| `visibility` | string | `public` 或 `private` |
| `webhook_url` | string \| null | `http` 或 `https` URL，最长 2048；传 `null` 或空字符串表示清空 |

**响应:** 与 **GET** `/api/v1/skills/:skill_id` 结构一致。`webhook_url` 仅当调用者是 **所有者或管理员** 时在 JSON 中返回；协作者和普通访客不返回该字段。

**错误码:**
- `400` - `webhook_url` 非法（非 http(s)）
- `403` - 无管理权限
- `404` - Skill 不存在

---

### 7. Skill Webhook 投递说明

当某 Skill 配置了非空的 `webhook_url` 时，服务端在下列时机 **异步** 向该 URL 发送 **POST**，`Content-Type: application/json`。请求失败（超时、非 2xx 等）**不会**影响 API 主流程，也不会重试。发送前会做最小目标校验：允许 `localhost` / `127.0.0.1` / `::1`，拒绝私有网段、链路本地和常见云元数据地址。

**环境变量:** `SKILL_BASE_WEBHOOK_TIMEOUT_MS` — 单次投递超时毫秒数，默认 `10000`，上限 `60000`。

**请求体结构:**

```json
{
  "event": "skill.updated | skill.deleted",
  "skill_id": "string",
  "timestamp": "ISO8601",
  "actor": { "id": 1, "username": "string" },
  "data": {}
}
```

`actor` 在无用户信息时为 `null`。

**`event`: `skill.updated`** — 在以下情况触发，`data` 含 `kind` 区分场景：

| `data.kind` | 触发操作 |
|-------------|----------|
| `metadata` | **PUT** `/api/v1/skills/:skill_id` 且 `name` 或 `description` 相对原值有变化 |
| `version_published` | **POST** `/api/v1/skills/publish` 或 GitHub 导入成功写入新版本；`data` 含 `version`、`created_at` |
| `head` | **PUT** `/api/v1/skills/:skill_id/head` 修改最新版本指针；`data` 含 `latest_version` |
| `version_metadata` | **PATCH** `/api/v1/skills/:skill_id/versions/:version` 修改版本说明或 changelog；`data` 含 `version` |

**`event`: `skill.deleted`** — **DELETE** `/api/v1/skills/:skill_id` 在数据库删除成功后投递；`data` 含删除前的 `name`、`versions_count`。

仅修改 `webhook_url` 本身 **不会** 触发 Webhook。

---

### 8. 收藏 / 取消收藏 Skill

**POST** `/api/v1/skills/:skill_id/favorite` — 当前用户收藏该 Skill（幂等）。

**DELETE** `/api/v1/skills/:skill_id/favorite` — 取消收藏（幂等）。

**认证:** 需要 Session。

**响应示例:**
```json
{
  "ok": true,
  "skill_id": "string",
  "favorited": true,
  "favorite_count": 0
}
```

**错误码:**
- `404` - Skill not found

---

### 9. 替换 Skill 标签

**PUT** `/api/v1/skills/:skill_id/tags`

用全局标签 ID 列表**整体替换**该 Skill 上的标签（非增量）。

**认证:** 需要 Session；需为该 Skill 的 **所有者、协作者或平台管理员**（`canManageSkill`）。

**请求体:**
```json
{
  "tag_ids": [1, 2, 3]
}
```

**响应:** `{ "ok": true, "skill_id": "string", "tags": [ { "id": 1, "name": "string" } ] }`

**错误码:**
- `400` - `tag_ids` 不是数组
- `403` - 无管理权限
- `404` - Skill not found

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
| `visibility` | string | 否 | 仅新 Skill 生效，`public` 或 `private`，默认 `public` |

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
| `q` | string | 可选。省略或为空时返回全部 `active` 用户（最多 2000 条，按 `username` 升序）；有值时按用户名或姓名模糊匹配（最多 100 条） |

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

## 标签模块 `/api/v1/tags`

全局标签库由 **超级管理员** 维护；任意已登录用户可 **GET** 列表（供 Skill 详情分配标签时选择）。创建、重命名、删除仅 **超级管理员** 可调用。

### 1. 标签列表（含使用次数）

**GET** `/api/v1/tags`

**认证:** 需要 Session

**响应:**
```json
{
  "tags": [
    { "id": 1, "name": "string", "usage_count": 0 }
  ]
}
```

---

### 2. 创建标签

**POST** `/api/v1/tags`

**认证:** 需要 Session，且为 **超级管理员**

**请求体:** `{ "name": "string" }`

**响应:** `201`，`{ "ok": true, "tag": { "id", "name", ... } }`

**错误码:**
- `400` - 名称为空
- `403` - 非超级管理员

---

### 3. 重命名标签

**PATCH** `/api/v1/tags/:tag_id`

**认证:** 需要 Session，且为 **超级管理员**

**请求体:** `{ "name": "string" }`

---

### 4. 删除标签

**DELETE** `/api/v1/tags/:tag_id`

**认证:** 需要 Session，且为 **超级管理员**

删除后，各 Skill 上的该标签关联会被一并移除。

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
| `is_super_admin` | number | `1` 为超级管理员，`0` 为否 |

### Skill
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | Skill ID |
| `name` | string | Skill 名称 |
| `description` | string | Skill 描述 |
| `latest_version` | string | 最新版本号 |
| `favorite_count` | number | 被收藏次数 |
| `download_count` | number | 版本下载累计次数（仅统计 **download** 接口） |
| `is_favorited` | boolean | 当前登录用户是否已收藏（未登录为 `false`） |
| `tags` | array | `{ id, name }[]`，全局标签 |
| `owner` | object | 所有者信息 `{id, username}` |
| `visibility` | string | `public` 或 `private` |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

### Version
| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 版本 ID |
| `skill_id` | string | 所属 Skill ID |
| `version` | string | 版本号（格式：`vYYYYMMDD.HHMMSS`） |
| `changelog` | string | 更新日志 |
| `download_count` | number | 该版本通过 **download** 接口的下载次数 |
| `zip_path` | string | ZIP 文件路径 |
| `uploader` | object | 上传者信息 `{id, username}` |
| `created_at` | string | 创建时间 |
