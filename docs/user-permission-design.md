# 用户管理与权限控制设计文档

> **版本**：v1.1
> **日期**：2026-03-25
> **状态**：设计稿，待实现

---

## 一、需求概述

### 1.1 背景

当前 Skill Base 系统已支持基础的用户认证（登录/登出/CLI Token），但缺少完善的用户管理和 Skill 权限控制机制。随着团队规模扩大，需要引入以下能力：

1. **用户管理**：管理员可添加、编辑、禁用用户账号
2. **Skill 协作权限**：Skill 所有者可邀请其他用户共同管理 Skill
3. **发布权限控制**：仅 Skill 所有者和协作者可发布该 Skill 的新版本

### 1.2 核心需求

| 需求 | 说明 |
|------|------|
| 管理员添加用户 | 管理员可创建新用户账号，设置初始密码 |
| 管理员管理用户 | 管理员可查看用户列表、编辑用户信息、禁用/启用账号 |
| Skill 协作者管理 | Skill 所有者可添加/移除协作者 |
| 发布权限控制 | 仅所有者和协作者可发布新版本，其他用户发布时返回 403 |
| 权限角色 | 协作者拥有发布权限，所有者额外拥有协作者管理权限 |

### 1.3 角色定义

| 角色 | 权限范围 |
|------|---------|
| `admin` | 系统管理员，可管理所有用户，可管理所有 Skill |
| `developer` | 普通用户，可浏览所有 Skill，仅可发布自己拥有或协作的 Skill |

### 1.4 Skill 权限层级

| 权限层级 | 说明 | 能力 |
|---------|------|------|
| **owner** | 所有者（创建者） | 发布、管理协作者、转移所有权、删除 Skill |
| **collaborator** | 协作者 | 发布新版本 |
| **viewer** | 普通用户 | 浏览、下载 |

---

## 二、数据库设计

### 2.1 ER 图（新增部分）

```
┌─────────────────┐                    ┌──────────────────────────────┐
│     users        │                    │         skills               │
├─────────────────┤                    ├──────────────────────────────┤
│ id      INTEGER │◄───────────────────│ owner_id      INTEGER FK     │
│ username TEXT   │        1:N         └──────────────────────────────┘
│ password_hash   │                                  │
│ role    TEXT    │                                  │ 1:N
│ status  TEXT    │ ← 新增：active/disabled         │
│ created_at      │                                  ▼
│ updated_at      │ ← 新增              ┌──────────────────────────────┐
└─────────────────┘                    │    skill_collaborators       │
         │                             ├──────────────────────────────┤
         │ 1:N                         │ id            INTEGER PK     │
         └─────────────────────────────│ skill_id      TEXT FK        │
                                       │ user_id       INTEGER FK ────┼──→ users.id
                                       │ role          TEXT           │  ← owner/collaborator
                                       │ created_at    DATETIME       │
                                       │ created_by    INTEGER FK ────┼──→ users.id
                                       └──────────────────────────────┘
```

### 2.2 表结构变更

#### 2.2.1 users 表（修改）

```sql
-- 新增字段
ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active';     -- active / disabled
ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN created_by INTEGER REFERENCES users(id);  -- 创建者（管理员）
```

完整建表 SQL：
```sql
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role          TEXT DEFAULT 'developer',   -- admin / developer
    status        TEXT DEFAULT 'active',      -- active / disabled
    created_by    INTEGER,                    -- 创建该用户的管理员 ID
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### 2.2.2 skill_collaborators 表（新增）

```sql
-- Skill 协作者表
CREATE TABLE IF NOT EXISTS skill_collaborators (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id      TEXT NOT NULL,
    user_id       INTEGER NOT NULL,
    role          TEXT NOT NULL DEFAULT 'collaborator',  -- owner / collaborator
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by    INTEGER NOT NULL,           -- 添加协作者的用户 ID
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    UNIQUE(skill_id, user_id)                 -- 同一用户对同一 Skill 只能有一条记录
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_collaborators_skill ON skill_collaborators(skill_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user ON skill_collaborators(user_id);
```

### 2.3 SQLite 外键约束配置

> ⚠️ **重要**：SQLite 默认关闭外键约束！必须在数据库连接初始化时显式开启。

```javascript
// src/database.js - 数据库初始化时必须执行
const Database = require('better-sqlite3');
const db = new Database(process.env.DATABASE_PATH || './data/skills.db');

// 强制开启外键约束，否则 ON DELETE CASCADE 不生效
db.pragma('foreign_keys = ON');
```

### 2.4 数据一致性保证

> ⚠️ **重要**：`skills.owner_id` 和 `skill_collaborators` 中的 `role='owner'` 记录存在数据冗余。为保证一致性，所有涉及所有权变更的操作（转移所有权、删除 Skill）必须使用**事务（Transaction）**包裹。

### 2.5 数据迁移

创建 Skill 时，自动在 `skill_collaborators` 表中插入一条 `owner` 记录（使用事务保证原子性）：

```javascript
// 发布新 Skill 时的逻辑（必须使用事务）
function createSkill(skillId, name, ownerId) {
  const createSkillTx = db.transaction(() => {
    // 1. 创建 Skill
    db.prepare(`
      INSERT INTO skills (id, name, owner_id, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).run(skillId, name, ownerId);
    
    // 2. 自动添加 owner 到协作者表
    db.prepare(`
      INSERT INTO skill_collaborators (skill_id, user_id, role, created_by)
      VALUES (?, ?, 'owner', ?)
    `).run(skillId, ownerId, ownerId);
  });
  
  createSkillTx(); // 执行事务
}
```

---

## 三、API 设计

### 3.1 个人信息 API `/api/v1/auth/me`

> 所有登录用户可管理自己的个人信息

#### 3.1.1 获取当前用户信息

**GET** `/api/v1/auth/me`

获取当前登录用户信息（已有接口，无需修改）。

**认证:** 需要 Session 或 PAT

**响应 200:**
```json
{
  "id": 1,
  "username": "zhangsan",
  "role": "developer",
  "status": "active",
  "created_at": "2026-02-01T00:00:00.000Z"
}
```

---

#### 3.1.2 更新个人信息

**PATCH** `/api/v1/auth/me`

更新当前用户的个人信息（用户名等）。

**认证:** 需要 Session 或 PAT

**请求体:**
```json
{
  "username": "zhangsan_new"
}
```

> 支持部分更新。注意：不能通过此接口修改 `role` 和 `status`，这些字段仅管理员可修改。

**响应 200:**
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "username": "zhangsan_new",
    "role": "developer",
    "status": "active",
    "updated_at": "2026-03-25T12:00:00.000Z"
  }
}
```

**错误码:**
- `400` - 用户名已存在 / 参数无效
- `401` - 未认证

---

#### 3.1.3 修改密码

**POST** `/api/v1/auth/me/change-password`

当前用户修改自己的密码（需验证旧密码）。

**认证:** 需要 Session 或 PAT

**请求体:**
```json
{
  "old_password": "current_password",
  "new_password": "new_secure_password"
}
```

**响应 200:**
```json
{
  "ok": true,
  "message": "密码修改成功"
}
```

**错误码:**
- `400` - 新密码格式无效（如长度不足）
- `401` - 未认证 / 旧密码错误

---

### 3.2 用户管理 API `/api/v1/users`

#### 3.2.1 获取用户列表

**GET** `/api/v1/users`

获取系统用户列表（仅管理员可访问）。

**认证:** 需要 Session 或 PAT，且用户角色为 `admin`

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 可选，搜索关键词（匹配用户名） |
| `status` | string | 可选，筛选状态 `active` / `disabled` |
| `page` | number | 可选，页码，默认 1 |
| `limit` | number | 可选，每页数量，默认 20 |

**响应 200:**
```json
{
  "users": [
    {
      "id": 1,
      "username": "admin",
      "role": "admin",
      "status": "active",
      "created_at": "2026-01-01T00:00:00.000Z",
      "updated_at": "2026-03-25T10:00:00.000Z"
    },
    {
      "id": 2,
      "username": "zhangsan",
      "role": "developer",
      "status": "active",
      "created_at": "2026-02-01T00:00:00.000Z",
      "updated_at": "2026-03-25T10:00:00.000Z"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

**错误码:**
- `401` - 未认证
- `403` - 非管理员无权访问

---

#### 3.2.2 创建用户

**POST** `/api/v1/users`

创建新用户（仅管理员可操作）。

**认证:** 需要 Session 或 PAT，且用户角色为 `admin`

**请求体:**
```json
{
  "username": "lisi",
  "password": "initial_password",
  "role": "developer"
}
```

**响应 201:**
```json
{
  "ok": true,
  "user": {
    "id": 3,
    "username": "lisi",
    "role": "developer",
    "status": "active",
    "created_at": "2026-03-25T10:00:00.000Z"
  }
}
```

**错误码:**
- `400` - 用户名已存在 / 参数无效
- `401` - 未认证
- `403` - 非管理员无权操作

---

#### 3.2.3 获取单个用户

**GET** `/api/v1/users/:user_id`

获取指定用户信息（仅管理员可访问）。

**认证:** 需要 Session 或 PAT，且用户角色为 `admin`

**响应 200:**
```json
{
  "id": 2,
  "username": "zhangsan",
  "role": "developer",
  "status": "active",
  "created_at": "2026-02-01T00:00:00.000Z",
  "updated_at": "2026-03-25T10:00:00.000Z",
  "created_by": {
    "id": 1,
    "username": "admin"
  }
}
```

**错误码:**
- `401` - 未认证
- `403` - 非管理员无权访问
- `404` - 用户不存在

---

#### 3.2.4 更新用户

**PATCH** `/api/v1/users/:user_id`

更新用户信息（仅管理员可操作）。

**认证:** 需要 Session 或 PAT，且用户角色为 `admin`

**请求体:**
```json
{
  "role": "admin",
  "status": "disabled"
}
```

> 支持部分更新，仅传递需要修改的字段。
>
> ⚠️ **约束**：管理员不能对自己执行以下操作：
> - 禁用自己的账号（`status: 'disabled'`）
> - 降级自己的角色（`role: 'developer'`）

**响应 200:**
```json
{
  "ok": true,
  "user": {
    "id": 2,
    "username": "zhangsan",
    "role": "admin",
    "status": "disabled",
    "updated_at": "2026-03-25T11:00:00.000Z"
  }
}
```

**错误码:**
- `400` - 参数无效 / 不能禁用或降级自己
- `401` - 未认证
- `403` - 非管理员无权操作
- `404` - 用户不存在

---

#### 3.2.5 重置用户密码

**POST** `/api/v1/users/:user_id/reset-password`

重置用户密码（仅管理员可操作）。

**认证:** 需要 Session 或 PAT，且用户角色为 `admin`

**请求体:**
```json
{
  "new_password": "new_password_123"
}
```

**响应 200:**
```json
{
  "ok": true,
  "message": "密码已重置"
}
```

**错误码:**
- `400` - 密码格式无效
- `401` - 未认证
- `403` - 非管理员无权操作
- `404` - 用户不存在

---

### 3.3 Skill 协作者 API `/api/v1/skills/:skill_id/collaborators`

#### 3.3.1 获取协作者列表

**GET** `/api/v1/skills/:skill_id/collaborators`

获取指定 Skill 的协作者列表。

**认证:** 可选（登录用户可查看完整信息）

**响应 200:**
```json
{
  "skill_id": "vantvox-bio",
  "collaborators": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "username": "zhangsan",
        "status": "active"
      },
      "role": "owner",
      "created_at": "2026-02-28T10:00:00.000Z"
    },
    {
      "id": 2,
      "user": {
        "id": 2,
        "username": "lisi",
        "status": "active"
      },
      "role": "collaborator",
      "created_at": "2026-03-20T15:00:00.000Z",
      "created_by": {
        "id": 1,
        "username": "zhangsan"
      }
    }
  ]
}
```

> 说明：返回用户的 `status` 字段，前端可标识已禁用的协作者。

**错误码:**
- `404` - Skill 不存在

---

#### 3.3.2 添加协作者

**POST** `/api/v1/skills/:skill_id/collaborators`

添加协作者（仅所有者或管理员可操作）。

**认证:** 需要 Session 或 PAT

**请求体:**
```json
{
  "user_id": 3
}
```

或通过用户名添加：
```json
{
  "username": "wangwu"
}
```

**响应 201:**
```json
{
  "ok": true,
  "collaborator": {
    "id": 3,
    "user": {
      "id": 3,
      "username": "wangwu"
    },
    "role": "collaborator",
    "created_at": "2026-03-25T12:00:00.000Z"
  }
}
```

**错误码:**
- `400` - 用户已是协作者 / 参数无效
- `401` - 未认证
- `403` - 无权限（非所有者或管理员）
- `404` - Skill 或用户不存在

---

#### 3.3.3 移除协作者

**DELETE** `/api/v1/skills/:skill_id/collaborators/:user_id`

移除协作者（仅所有者或管理员可操作）。

**认证:** 需要 Session 或 PAT

**响应 200:**
```json
{
  "ok": true,
  "message": "协作者已移除"
}
```

**错误码:**
- `400` - 不能移除所有者
- `401` - 未认证
- `403` - 无权限（非所有者或管理员）
- `404` - Skill 或协作者不存在

---

#### 3.3.4 转移所有权

**POST** `/api/v1/skills/:skill_id/transfer-ownership`

将 Skill 所有权转移给另一用户（仅当前所有者或管理员可操作）。

**认证:** 需要 Session 或 PAT

**请求体:**
```json
{
  "new_owner_id": 2
}
```

**响应 200:**
```json
{
  "ok": true,
  "message": "所有权已转移",
  "new_owner": {
    "id": 2,
    "username": "lisi"
  }
}
```

**后端逻辑（必须使用事务）:**
```javascript
const transferOwnershipTx = db.transaction((skillId, oldOwnerId, newOwnerId) => {
  // 1. 更新 skills 表的 owner_id
  db.prepare('UPDATE skills SET owner_id = ?, updated_at = datetime("now") WHERE id = ?')
    .run(newOwnerId, skillId);
  
  // 2. 原所有者降级为 collaborator
  db.prepare('UPDATE skill_collaborators SET role = "collaborator" WHERE skill_id = ? AND user_id = ?')
    .run(skillId, oldOwnerId);
  
  // 3. 新所有者升级为 owner（如不存在则新增）
  const existing = db.prepare('SELECT id FROM skill_collaborators WHERE skill_id = ? AND user_id = ?')
    .get(skillId, newOwnerId);
  if (existing) {
    db.prepare('UPDATE skill_collaborators SET role = "owner" WHERE skill_id = ? AND user_id = ?')
      .run(skillId, newOwnerId);
  } else {
    db.prepare('INSERT INTO skill_collaborators (skill_id, user_id, role, created_by) VALUES (?, ?, "owner", ?)')
      .run(skillId, newOwnerId, oldOwnerId);
  }
});
```

**错误码:**
- `400` - 新所有者与当前所有者相同
- `401` - 未认证
- `403` - 无权限（非所有者或管理员）
- `404` - Skill 或用户不存在

---

#### 3.3.5 删除 Skill

**DELETE** `/api/v1/skills/:skill_id`

删除指定的 Skill 及其所有版本（仅所有者或管理员可操作）。

**认证:** 需要 Session 或 PAT

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| `confirm` | string | 必须传入 Skill ID 以确认删除 |

**请求示例:**
```
DELETE /api/v1/skills/vantvox-bio?confirm=vantvox-bio
```

**响应 200:**
```json
{
  "ok": true,
  "message": "Skill 已删除",
  "deleted": {
    "skill_id": "vantvox-bio",
    "versions_count": 3
  }
}
```

**后端逻辑（必须使用事务）:**
```javascript
const deleteSkillTx = db.transaction((skillId) => {
  // 1. 删除所有版本记录
  db.prepare('DELETE FROM skill_versions WHERE skill_id = ?').run(skillId);
  
  // 2. 删除协作者记录
  db.prepare('DELETE FROM skill_collaborators WHERE skill_id = ?').run(skillId);
  
  // 3. 删除 Skill 记录
  db.prepare('DELETE FROM skills WHERE id = ?').run(skillId);
  
  // 4. 删除文件系统中的 zip 文件
  // fs.rmSync(`data/${skillId}`, { recursive: true, force: true });
});
```

> ⚠️ **危险操作**：删除后无法恢复，请谨慎操作。前端应显示确认弹窗。

**错误码:**
- `400` - 缺少 confirm 参数或参数不匹配
- `401` - 未认证
- `403` - 无权限（非所有者或管理员）
- `404` - Skill 不存在

---

### 3.4 发布权限变更

#### 3.4.1 POST `/api/v1/skills/publish` 权限增强

现有发布接口增加权限检查：

**权限检查逻辑:**
```javascript
// 在路由中使用，request.user 已由鉴权中间件挂载
function canPublish(request, skillId) {
  // 1. 管理员可发布任何 Skill（直接使用 request.user.role，避免重复查询）
  if (request.user.role === 'admin') return true;
  
  // 2. 检查是否为新 Skill（无需权限）
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId);
  if (!skill) return true;  // 新 Skill，创建时会成为 owner
  
  // 3. 检查是否为所有者或协作者
  const collaborator = db.prepare(`
    SELECT role FROM skill_collaborators
    WHERE skill_id = ? AND user_id = ?
  `).get(skillId, request.user.id);
  
  return collaborator !== undefined;
}
```

**发布接口错误响应变更:**

新增 403 错误码：
```json
{
  "ok": false,
  "error": "permission_denied",
  "detail": "您没有该 Skill 的发布权限"
}
```

---

## 四、权限控制实现

### 4.1 中间件设计

#### 4.1.1 认证中间件（增强版）

> ⚠️ **重要**：除了验证 Token 有效性，还需检查用户账号状态，确保被禁用用户无法操作。

```javascript
// src/middleware/auth.js
function requireAuth(request, reply) {
  // 1. 验证 Token/Session
  const userId = validateToken(request);
  if (!userId) {
    return reply.code(401).send({
      ok: false,
      error: 'unauthorized',
      detail: '请先登录'
    });
  }
  
  // 2. 查询用户信息并检查账号状态
  const user = db.prepare('SELECT id, username, role, status FROM users WHERE id = ?').get(userId);
  
  if (!user || user.status === 'disabled') {
    return reply.code(401).send({
      ok: false,
      error: 'account_disabled',
      detail: '账号已被禁用'
    });
  }
  
  // 3. 将用户信息挂载到 request 上，后续路由直接使用
  request.user = user;
}

module.exports = { requireAuth };
```

#### 4.1.2 管理员权限中间件

```javascript
// src/middleware/admin.js
function requireAdmin(request, reply) {
  // 1. 先验证登录状态（已检查用户状态）
  requireAuth(request, reply);
  if (reply.sent) return; // 如果已发送响应则终止
  
  // 2. 检查管理员角色（直接使用 request.user，无需再查）
  if (request.user.role !== 'admin') {
    return reply.code(403).send({
      ok: false,
      error: 'forbidden',
      detail: '需要管理员权限'
    });
  }
}

module.exports = { requireAdmin };
```

#### 4.1.3 Skill 权限检查工具

```javascript
// src/utils/permission.js

/**
 * 检查用户是否有 Skill 的指定权限
 * @param {object} user - request.user 对象（已由中间件挂载，避免重复查询）
 * @param {string} skillId - Skill ID
 * @param {string} requiredRole - 所需权限：'owner' | 'collaborator' | 'any'
 * @returns {boolean}
 */
function hasSkillPermission(user, skillId, requiredRole = 'any') {
  // 管理员拥有所有权限（直接使用传入的 user.role）
  if (user.role === 'admin') return true;
  
  // 查询协作者角色
  const collaborator = db.prepare(`
    SELECT role FROM skill_collaborators
    WHERE skill_id = ? AND user_id = ?
  `).get(skillId, user.id);
  
  if (!collaborator) return false;
  
  if (requiredRole === 'any') return true;
  if (requiredRole === 'owner') return collaborator.role === 'owner';
  if (requiredRole === 'collaborator') return true; // owner 也有 collaborator 权限
  
  return false;
}

/**
 * 检查用户是否可以发布 Skill
 */
function canPublishSkill(user, skillId) {
  // 检查 Skill 是否存在
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId);
  
  // 新 Skill，任何登录用户都可创建
  if (!skill) return true;
  
  // 已有 Skill，检查协作权限
  return hasSkillPermission(user, skillId, 'any');
}

/**
 * 检查用户是否可以管理协作者/删除 Skill
 */
function canManageSkill(user, skillId) {
  return hasSkillPermission(user, skillId, 'owner');
}

module.exports = {
  hasSkillPermission,
  canPublishSkill,
  canManageSkill
};
};
```

### 4.2 路由结构

```
src/routes/
├── auth.js          # 登录 / CLI 验证码 / PAT Token
├── skills.js        # Skill 列表 / 详情 / 版本
├── publish.js       # 发布新版本（增加权限检查）
├── users.js         # 【新增】用户管理 API
└── collaborators.js # 【新增】协作者管理 API
```

---

## 五、前端页面设计

### 5.1 新增页面清单

| 页面 | URL | 说明 |
|------|-----|------|
| 用户管理页 | `/admin/users` | 管理员查看/添加/编辑用户 |
| 协作者管理弹窗 | Skill 详情页内 | 所有者管理协作者 |

### 5.2 用户管理页（仅管理员可见）

```
┌─────────────────────────────────────────────────────────────────┐
│ 用户管理                                    [+ 添加用户]         │
├─────────────────────────────────────────────────────────────────┤
│ 搜索: [________________] [🔍]    状态: [全部 ▼]                 │
├─────────────────────────────────────────────────────────────────┤
│ 用户名         │ 角色       │ 状态     │ 创建时间     │ 操作    │
├────────────────┼────────────┼──────────┼──────────────┼─────────┤
│ admin          │ 管理员     │ ✅ 启用  │ 2026-01-01  │ [编辑]  │
│ zhangsan       │ 开发者     │ ✅ 启用  │ 2026-02-01  │ [编辑]  │
│ lisi           │ 开发者     │ ⛔ 禁用  │ 2026-03-01  │ [编辑]  │
└────────────────┴────────────┴──────────┴──────────────┴─────────┘
```

### 5.3 添加用户弹窗

```
┌─────────────────────────────────────────────────┐
│                   添加用户                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  用户名：[____________________]                 │
│                                                 │
│  初始密码：[____________________]               │
│                                                 │
│  角色：(•) 开发者                               │
│        ( ) 管理员                               │
│                                                 │
│            [取消]        [创建用户]             │
└─────────────────────────────────────────────────┘
```

### 5.4 协作者管理（Skill 详情页内）

```
┌─────────────────────────────────────────────────────────────────┐
│ vantvox-bio                                   [v20260324.170230]│
├─────────────────────────────────────────────────────────────────┤
│ 描述: VantVox 人物传记栏目写作 Skill                            │
│                                                                 │
│ 管理团队:                                     [+ 添加协作者]    │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 👑 zhangsan (所有者)                                        ││
│ │ 👤 lisi                                         [移除]      ││
│ │ 👤 wangwu                                       [移除]      ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ 版本历史:                                                       │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 5.5 添加协作者弹窗

```
┌─────────────────────────────────────────────────┐
│               添加协作者                         │
├─────────────────────────────────────────────────┤
│                                                 │
│  搜索用户：[____________________] [🔍]          │
│                                                 │
│  搜索结果：                                     │
│  ┌─────────────────────────────────────────┐   │
│  │ ☐ wangwu                                │   │
│  │ ☐ zhaoliu                               │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│            [取消]        [添加选中]             │
└─────────────────────────────────────────────────┘
```

---

## 六、目录结构变更

```
src/
├── routes/
│   ├── auth.js
│   ├── skills.js
│   ├── publish.js
│   ├── users.js          # 【新增】用户管理路由
│   └── collaborators.js  # 【新增】协作者管理路由
├── middleware/
│   ├── auth.js           # 认证中间件
│   ├── admin.js          # 【新增】管理员权限中间件
│   └── error.js
└── utils/
    ├── crypto.js
    ├── zip.js
    └── permission.js     # 【新增】权限检查工具

static/
├── admin/
│   └── users.html        # 【新增】用户管理页
├── js/
│   ├── admin/
│   │   └── users.js      # 【新增】用户管理逻辑
│   └── collaborators.js  # 【新增】协作者管理逻辑
└── ...
```

---

## 七、安全考虑

### 7.1 权限检查清单

| 操作 | 权限要求 |
|------|------|
| 查看/修改自己的个人信息 | 登录用户 |
| 修改自己的密码 | 登录用户 + 验证旧密码 |
| 查看用户列表 | `admin` |
| 创建/编辑/禁用用户 | `admin` |
| 重置他人密码 | `admin` |
| 发布新 Skill | 已登录 |
| 发布已有 Skill 新版本 | `owner` / `collaborator` / `admin` |
| 添加/移除协作者 | `owner` / `admin` |
| 转移所有权 | `owner` / `admin` |
| 删除 Skill | `owner` / `admin` |

### 7.2 防护措施

1. **禁止自我禁用**：管理员不能禁用自己的账号
2. **禁止自我降级**：管理员不能将自己角色降级为 developer
3. **禁止移除所有者**：不能通过移除协作者接口移除所有者
4. **账号状态检查**：认证中间件每次请求检查 `status`，被禁用用户无法操作
5. **删除确认**：删除 Skill 需要 `confirm` 参数二次确认
6. **事务保证**：所有多表操作（转移所有权、删除 Skill）使用事务
7. **日志记录**：所有权限敏感操作记录审计日志

---

## 八、API 汇总

### 8.1 个人信息 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/auth/me` | 获取当前用户信息 | 登录用户 |
| PATCH | `/api/v1/auth/me` | 更新个人信息 | 登录用户 |
| POST | `/api/v1/auth/me/change-password` | 修改自己密码 | 登录用户 |

### 8.2 用户管理 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/users` | 获取用户列表 | admin |
| POST | `/api/v1/users` | 创建用户 | admin |
| GET | `/api/v1/users/:user_id` | 获取用户详情 | admin |
| PATCH | `/api/v1/users/:user_id` | 更新用户 | admin |
| POST | `/api/v1/users/:user_id/reset-password` | 重置密码 | admin |

### 8.3 协作者管理 API

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| GET | `/api/v1/skills/:skill_id/collaborators` | 获取协作者列表 | public |
| POST | `/api/v1/skills/:skill_id/collaborators` | 添加协作者 | owner/admin |
| DELETE | `/api/v1/skills/:skill_id/collaborators/:user_id` | 移除协作者 | owner/admin |
| POST | `/api/v1/skills/:skill_id/transfer-ownership` | 转移所有权 | owner/admin |
| DELETE | `/api/v1/skills/:skill_id` | 删除 Skill | owner/admin |

### 8.4 修改的现有 API

| 方法 | 路径 | 变更说明 |
|------|------|---------|
| POST | `/api/v1/skills/publish` | 增加协作权限检查，非协作者返回 403 |

---

*文档版本：v1.1.0 | 2026-03-25*
