---
AIGC:
    ContentProducer: Minimax Agent AI
    ContentPropagator: Minimax Agent AI
    Label: AIGC
    ProduceID: adb44dcf33485f1e41d4b42c4ad688c8
    PropagateID: adb44dcf33485f1e41d4b42c4ad688c8
    ReservedCode1: 304502204410a99fd962419d1d6216d306bae42f1943b7204ee5090ba4b00ff554e942b4022100fd0c0d2e5bd7e97d1cd845776348894da3d624f47f8f4fab3bedfa91611f103b
    ReservedCode2: 30460221009518f1a89bb73c510d73944b3a19870321455d65dffc7cb2458fa84ce04e036902210085918daa45d1ff1ef20b7a7a5a0b2d3c719b40e8a4065ce6d1aad0acb26cc2b4
---

# Skill Base 技术设计文档

> **项目名称**：Skill Base（内网轻量版）
> **版本**：v2.1
> **日期**：2026-03-24
> **状态**：设计稿，待实现
> **核心思想**：重前端、轻后端、免运维的 Edge 风格架构

---

## 一、项目概述

### 1.1 背景与目标

公司在内网部署一个中心化的 Skill 管理站点，让团队成员无需使用 Git 即可完成以下操作：

- 像使用 npm 包一样安装、升级 Skill
- 在网页端浏览 Skill 的目录结构和文件内容
- 对比同一 Skill 不同版本之间的文件差异（diff）
- 由非开发人员发布新版本（通过网页上传 zip 包）

### 1.2 核心重构思想

将系统从"重度依赖后端的传统 Web 架构"转型为"**重前端、轻后端、免运维的 Edge 风格架构**"。服务器降级为"纯粹的静态资源与元数据仓库"，解压、Diff 计算全部卸载至客户端（Browser/CLI），并补齐完整的鉴权体系。

### 1.3 核心体验优化

#### 1.3.1 零认知负担的全自动版本号 (Auto-Versioning)

废弃由用户手动输入 Semantic Versioning（如 `1.0.0`）的机制，**改为系统基于时间戳自动生成**。

- **规则**：后端在接收到 zip 包时，自动生成 `vYYYYMMDD.HHMMSS` 格式的版本号（例：`v20260324.170230`）。
- **优势**：绝对唯一、天然支持字典排序；非技术人员无需理解版本号规范，只需点击"上传"即可完成发布。

#### 1.3.2 服务端算力卸载 (Server to Client Offloading)

- **服务端完全减负**：后端**不再解压** Zip，**不再读取**文件内容，**不再计算** Diff。彻底免疫"Zip 炸弹"攻击与"目录穿越"漏洞。
- **CLI 端下载体验**：服务器只提供完整 `.zip` 下载，CLI 工具（如 Clawhub）通过接口下载后，在本地终端的临时目录瞬间解压并落盘。
- **Web 端渲染与 Diff 体验**：
  - 前端引入 `JSZip`、`jsdiff`、`diff2html`、`marked` CDN 库。
  - 用户查看文件/对比版本时，浏览器直接并发拉取两个版本的 `.zip`（内网极速）。
  - 由浏览器在内存中解压缩、提取文本、执行 Diff 算法，并渲染高亮 UI，服务器 CPU 零消耗。

### 1.4 核心功能

| 功能 | 说明 |
|------|------|
| Skill 列表与搜索 | 按名称、描述关键词搜索 |
| 版本管理 | 上传新版本，自动保留历史版本（自动生成时间戳版本号） |
| 目录结构预览 | 树形展示文件/文件夹，支持折叠（浏览器端解压渲染） |
| 文件内容预览 | Markdown 渲染、Python/Shell 代码语法高亮、纯文本查看（浏览器端解压渲染） |
| **版本 Diff** | 同一文件在两个版本之间的差异对比，高亮显示增减行（浏览器端计算） |
| CLI 安装 | 与 OpenClaw `clawhub` CLI 无缝对接 |
| 用户鉴权 | 完整的登录体系，支持 Web Cookie 和 CLI Token 双端认证 |

### 1.5 非功能约束

- **存储**：SQLite（零依赖）+ 文件系统存储 zip 包
- **运维**：无需数据库服务器，无需 Redis，纯 Python 可运行
- **用户**：非开发人员可独立完成发布，无需 Git 权限
- **部署**：Docker 单容器或直接 Python 运行
- **安全**：服务端不解析 Zip 内容，免疫 Zip 炸弹和目录穿越攻击

---

## 二、架构设计

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                        客户端（浏览器 / CLI）                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  浏览器端                                                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │   │
│  │  │ JSZip    │  │ jsdiff   │  │ marked   │  │ highlight│    │   │
│  │  │ (解压)   │  │ (Diff)   │  │ (MD渲染) │  │ (高亮)   │    │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CLI 端 (skill-base)                                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │   │
│  │  │ zipfile  │  │ 本地解压  │  │ PAT Token│                   │   │
│  │  └──────────┘  └──────────┘  └──────────┘                   │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTP / REST API (仅元数据 + Zip 下载)
┌─────────────────────────▼───────────────────────────────────────────┐
│                     Python FastAPI 后端（轻量级）                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐     │
│  │  Skill API │  │  Auth API  │  │  Publish   │  │  Download  │     │
│  │  CRUD      │  │  Login/PAT │  │  API       │  │  API       │     │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘     │
│                                                                     │
│  【服务端不解析 Zip，不计算 Diff，纯元数据管理】                      │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
  ┌─────────────────┐           ┌──────────────────────┐
  │  SQLite 元数据库  │           │  /data/  文件系统     │
  │  skills.db      │           │  skill-id/           │
  │                 │           │    v20260324.170230  │
  │  users 表        │           │      .zip            │
  │  skills 表       │           │    v20260325.090000  │
  │  skill_versions  │           │      .zip            │
  │  cli_auth_codes  │           └──────────────────────┘
  │  personal_access │
  │    _tokens       │
  └─────────────────┘
```

### 2.2 技术选型

| 层级 | 技术选型 | 说明 |
|------|---------|------|
| 后端 | **Node.js 18+ + Fastify** | 高性能异步，生态丰富，轻量易部署 |
| 数据库 | **SQLite + better-sqlite3** | 单文件，零运维，同步 API 简单易用 |
| 文件存储 | **本地文件系统** | zip 包存磁盘，SQLite 只存路径和元数据 |
| 前端解压 | **JSZip**（CDN）| 浏览器端解压 zip 文件 |
| 前端 Diff | **jsdiff**（CDN）| 浏览器端计算文本差异 |
| Diff 渲染 | **diff2html**（CDN）| 美观的差异对比视图 |
| Markdown | **marked.js**（CDN）| 渲染 .md 文件 |
| 代码高亮 | **highlight.js**（CDN）| Python、Shell、JS 等语法高亮 |
| 前端 | **原生 HTML + CSS + JS** | 无需构建工具，ESM import 直连 API |
| 部署 | **Docker + Node.js** | 单命令启动，支持热重载 |
### 2.3 目录结构

```
skill-base/
├── src/
│   ├── index.js             # Fastify 入口，路由注册
│   ├── database.js          # SQLite 初始化 + 连接管理
│   ├── models/              # 数据模型定义
│   │   ├── user.js
│   │   ├── skill.js
│   │   └── version.js
│   ├── routes/              # API 路由
│   │   ├── auth.js          # 登录 / CLI 验证码 / PAT Token
│   │   ├── skills.js        # Skill 列表 / 详情 / 版本
│   │   └── publish.js       # 发布新版本
│   ├── middleware/          # 中间件
│   │   ├── auth.js          # 认证中间件
│   │   └── error.js         # 错误处理
│   └── utils/               # 工具函数
│       ├── crypto.js        # 密码/Token 生成
│       └── zip.js           # zip 处理辅助
├── data/                    # zip 包存储 + SQLite 数据库（gitignore）
│   └── .gitkeep
├── static/
│   ├── index.html           # Skill 列表页
│   ├── skill.html           # Skill 详情 + 版本切换
│   ├── file.html            # 文件预览页（浏览器端解压渲染）
│   ├── diff.html            # 版本 diff 对比页（浏览器端计算）
│   ├── publish.html         # 发布新版本页（支持拖拽目录）
│   ├── login.html           # 用户登录页
│   └── css/
│       └── style.css
│   └── js/
│       ├── app.js           # 共享 API 调用逻辑
│       ├── index.js
│       ├── skill.js
│       ├── file.js          # 浏览器端 JSZip 解压
│       ├── diff.js          # 浏览器端 jsdiff 计算
│       ├── publish.js       # 拖拽打包 + 发布逻辑
│       └── auth.js          # 登录与 Token 管理
├── tests/
│   └── auth.test.js
├── package.json
├── Dockerfile
└── README.md
```

---

## 三、数据库设计

### 3.1 ER 图

```
┌─────────────────┐       ┌──────────────────────┐
│     users        │       │    cli_auth_codes     │
├─────────────────┤       ├────────────────────────┤
│ id      INTEGER │───────│ code      TEXT PK      │
│ username TEXT   │  1:N  │ user_id   INTEGER FK   │
│ password_hash   │       │ expires_at DATETIME    │
│ role    TEXT    │       │ used      BOOLEAN      │
│ created_at      │       └────────────────────────┘
└─────────────────┘                │
         │                         │
         │ 1:N                     │ 1:1
         ▼                         ▼
┌─────────────────┐       ┌──────────────────────────────┐
│ personal_access │       │         skills               │
│    _tokens      │       ├──────────────────────────────┤
├─────────────────┤       │ id            TEXT PK        │
│ token   TEXT PK │       │ name          TEXT           │
│ user_id INTEGER │       │ description   TEXT           │
│ description     │       │ latest_version TEXT          │
│ last_used_at    │       │ owner_id      INTEGER FK ────┼──→ users.id
│ created_at      │       │ created_at    DATETIME       │
└─────────────────┘       │ updated_at    DATETIME       │
                          └──────────────────────────────┘
                                       │
                                       │ 1:N
                                       ▼
                          ┌──────────────────────────────┐
                          │      skill_versions          │
                          ├──────────────────────────────┤
                          │ id            INTEGER PK     │
                          │ skill_id      TEXT FK        │
                          │ version       TEXT           │  ← 时间戳格式
                          │ changelog     TEXT           │
                          │ zip_path      TEXT           │──→ 文件系统 .zip
                          │ uploader_id   INTEGER FK ────┼──→ users.id
                          │ created_at    DATETIME       │
                          └──────────────────────────────┘
```

### 3.2 建表 SQL

```sql
-- 用户表（内部系统可对接 LDAP）
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,       -- 域账号/工号
    password_hash TEXT,                       -- 若不接LDAP则自建密码
    role          TEXT DEFAULT 'developer',   -- admin / developer
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CLI 临时验证码表（类似设备码，有效期 5 分钟）
CREATE TABLE IF NOT EXISTS cli_auth_codes (
    code          TEXT PRIMARY KEY,           -- 例："8A2B-9C4F"
    user_id       INTEGER NOT NULL,
    expires_at    DATETIME NOT NULL,
    used          BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 长效访问令牌表 (PAT，用于 CLI 后续的无感 API 请求)
CREATE TABLE IF NOT EXISTS personal_access_tokens (
    token         TEXT PRIMARY KEY,           -- 例："sk-registry-7f8a..."
    user_id       INTEGER NOT NULL,
    description   TEXT,                       -- 例："CLI Login via Web"
    last_used_at  DATETIME,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Skill 主表：增加 owner_id
CREATE TABLE IF NOT EXISTS skills (
    id            TEXT PRIMARY KEY,           -- 唯一标识，如 "vantvox-bio"
    name          TEXT NOT NULL,              -- 显示名称，如 "VantVox Bio"
    description   TEXT,                       -- 简短描述
    latest_version TEXT,                      -- 当前最新版本，如 "v20260324.170230"
    owner_id      INTEGER NOT NULL,           -- Skill的创建者/负责人
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- 版本表（每个版本一行，永不删除）
CREATE TABLE IF NOT EXISTS skill_versions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id     TEXT NOT NULL,
    version      TEXT NOT NULL,               -- 自动生成的时间戳版本号，如 "v20260324.170230"
    changelog    TEXT,                        -- 更新说明
    zip_path     TEXT NOT NULL,               -- 相对路径，如 "vantvox-bio/v20260324.170230.zip"
    uploader_id  INTEGER NOT NULL,            -- 记录当前版本的实际上传人
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    FOREIGN KEY (uploader_id) REFERENCES users(id),
    UNIQUE(skill_id, version)                 -- 同一 skill 的版本号唯一
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_versions_skill_id ON skill_versions(skill_id);
CREATE INDEX IF NOT EXISTS idx_cli_codes_user ON cli_auth_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_pat_tokens_user ON personal_access_tokens(user_id);
```

> **注意**：原设计中的 `file_cache` 表已删除，服务端不再缓存文件内容。`file_tree` 字段也已删除，目录结构由浏览器端解压后动态生成。
>
> **Node.js 实现说明**：使用 `better-sqlite3` 库执行上述 SQL，该库提供同步 API，无需 async/await，代码更简洁。例如：
> ```javascript
> const Database = require('better-sqlite3');
> const db = new Database(process.env.DATABASE_PATH || './data/skills.db');
> 
> // 初始化表结构
> db.exec(`
>   CREATE TABLE IF NOT EXISTS users (
>     id INTEGER PRIMARY KEY AUTOINCREMENT,
>     username TEXT UNIQUE NOT NULL,
>     password_hash TEXT,
>     role TEXT DEFAULT 'developer',
>     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
>   );
>   -- ... 其他建表语句
> `);
> ```

---

## 四、API 设计

> **Base URL**：`/api/v1`

### 4.1 认证与鉴权 (Auth API)

#### POST /auth/login
Web 端用户登录。

**请求体**：
```json
{
  "username": "zhangsan",
  "password": "xxxxxx"
}
```

**响应 200**：
```json
{
  "ok": true,
  "user": {
    "id": 1,
    "username": "zhangsan",
    "role": "developer"
  }
}
```
> 登录成功后，服务端通过 Set-Cookie 设置 Session。

---

#### POST /auth/logout
Web 端用户登出。

**响应 200**：
```json
{ "ok": true }
```

---

#### POST /auth/cli-code/generate
生成 CLI 登录用的临时验证码（需 Web 端已登录）。

**鉴权**：Cookie Session

**响应 200**：
```json
{
  "ok": true,
  "code": "8A2B-9C4F",
  "expires_at": "2026-03-24T17:07:30Z"
}
```
> 验证码有效期 5 分钟，一次性使用。

---

#### POST /auth/cli-code/verify
CLI 端用验证码换取长效 Personal Access Token (PAT)。

**请求体**：
```json
{
  "code": "8A2B-9C4F"
}
```

**响应 200**：
```json
{
  "ok": true,
  "token": "sk-registry-7f8a9b2c3d4e5f6g7h8i9j0k",
  "user": {
    "id": 1,
    "username": "zhangsan"
  }
}
```
> CLI 应将 token 保存到 `~/.openclaw/credentials.json` 中后续使用。

---

#### GET /auth/me
获取当前登录用户信息。

**鉴权**：Cookie Session 或 PAT Token (Header: `Authorization: Bearer <token>`)

**响应 200**：
```json
{
  "id": 1,
  "username": "zhangsan",
  "role": "developer"
}
```

---

### 4.2 Skill 管理

#### GET /skills
获取 Skill 列表，支持搜索。

**Query 参数**：

| 参数 | 类型 | 说明 |
|------|------|------|
| q | string | 搜索关键词（匹配 name 或 description） |

**响应 200**：
```json
{
  "skills": [
    {
      "id": "vantvox-bio",
      "name": "VantVox Bio",
      "description": "VantVox 人物传记栏目写作 Skill",
      "latest_version": "v20260324.170230",
      "owner": {
        "id": 1,
        "username": "zhangsan"
      },
      "created_at": "2026-02-28T10:00:00Z",
      "updated_at": "2026-03-24T17:02:30Z"
    }
  ],
  "total": 1
}
```

---

#### GET /skills/{skill_id}
获取某个 Skill 的详细信息。

**响应 200**：
```json
{
  "id": "vantvox-bio",
  "name": "VantVox Bio",
  "description": "VantVox 人物传记栏目写作 Skill",
  "latest_version": "v20260324.170230",
  "owner": {
    "id": 1,
    "username": "zhangsan"
  },
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-03-24T17:02:30Z"
}
```

> **注意**：不再返回 `file_tree`，目录结构由客户端下载 zip 后自行解析。

**响应 404**：
```json
{ "detail": "Skill not found" }
```

---

#### GET /skills/{skill_id}/versions
获取某个 Skill 的所有版本历史。

**响应 200**：
```json
{
  "skill_id": "vantvox-bio",
  "versions": [
    {
      "version": "v20260324.170230",
      "changelog": "新增跨文化锚点说明章节",
      "uploader": {
        "id": 2,
        "username": "lisi"
      },
      "created_at": "2026-03-24T17:02:30Z"
    },
    {
      "version": "v20260323.090000",
      "changelog": "修复目录结构错误",
      "uploader": {
        "id": 1,
        "username": "zhangsan"
      },
      "created_at": "2026-03-23T09:00:00Z"
    },
    {
      "version": "v20260322.100000",
      "changelog": "初始版本",
      "uploader": {
        "id": 1,
        "username": "zhangsan"
      },
      "created_at": "2026-03-22T10:00:00Z"
    }
  ]
}
```

---

#### GET /skills/{skill_id}/versions/{version}/download
下载指定版本的 Zip 文件。

**路径参数**：
- `version`: 版本号（如 `v20260324.170230`）或 `latest`（自动解析为最新版本）

**响应 200**：直接返回 Zip 文件二进制流 (`Content-Type: application/zip`)

**响应 404**：
```json
{ "detail": "Version not found" }
```

> 这是唯一的文件获取接口。Web 端和 CLI 端都通过此接口下载 zip，然后在本地/浏览器端解压。
> 
> **支持 `latest` 别名**：`/skills/{id}/versions/latest/download` 会自动重定向到最新版本。

---

### 4.3 发布管理

#### POST /skills/publish
发布新版本或创建新 Skill。

**鉴权**：Cookie Session 或 PAT Token (Header: `Authorization: Bearer <token>`)

**Content-Type**：`multipart/form-data`

**表单字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| zip_file | file | ✅ | 完整压缩的 Skill 文件夹（.zip） |
| skill_id | string | 条件必填 | Skill 唯一标识（创建新 Skill 时必填，更新时可选） |
| changelog | string | ❌ | 本次更新说明 |
| name | string | 条件必填 | 新建 Skill 时的显示名称 |

**zip 包格式要求**：
- zip 包内**顶层目录**即为 Skill ID 目录
- 必须包含 `SKILL.md` 文件
- 文件名格式无要求，系统自动从 zip 内部结构获取 Skill ID

**后端逻辑**：
1. 验证 Token 解析出当前 `user_id`
2. 将 zip 落盘到 `data/{skill_id}/{version}.zip`
3. **自动生成** `vYYYYMMDD.HHMMSS` 格式版本号
4. 写入 `skill_versions` 表，记录 `uploader_id = user_id`

**响应 200（成功发布新版本）**：
```json
{
  "ok": true,
  "skill_id": "vantvox-bio",
  "version": "v20260324.170230",
  "created_at": "2026-03-24T17:02:30Z"
}
```

**错误 401（未授权）**：
```json
{ "detail": "Authentication required" }
```

**错误 400（缺少 SKILL.md）**：
```json
{ "detail": "上传的 zip 包中未找到 SKILL.md 文件" }
```

---

## 五、客户端 Diff 引擎设计

> **重要**：Diff 计算已从服务端迁移至**浏览器端**执行。服务端仅提供 Zip 下载，不解压、不计算 Diff。

### 5.1 浏览器端核心流程

```javascript
// 伪代码：浏览器端 Diff 流程
async function diffFiles(skillId, versionA, versionB, filePath) {
  // 1. 并发下载两个版本的 zip
  const [zipA, zipB] = await Promise.all([
    fetch(`/api/v1/skills/${skillId}/versions/${versionA}/download`).then(r => r.arrayBuffer()),
    fetch(`/api/v1/skills/${skillId}/versions/${versionB}/download`).then(r => r.arrayBuffer())
  ]);

  // 2. 使用 JSZip 在内存中解压
  const [archiveA, archiveB] = await Promise.all([
    JSZip.loadAsync(zipA),
    JSZip.loadAsync(zipB)
  ]);

  // 3. 读取目标文件内容
  const contentA = await archiveA.file(filePath)?.async("string") ?? "";
  const contentB = await archiveB.file(filePath)?.async("string") ?? "";

  // 4. 判断是否为二进制文件
  if (isBinaryFile(filePath)) {
    return { is_binary: true, status: "binary" };
  }

  // 5. 使用 jsdiff 计算差异
  const diff = Diff.createPatch(filePath, contentA, contentB, versionA, versionB);

  // 6. 使用 diff2html 渲染 UI
  const diffHtml = Diff2Html.html(diff, {
    drawFileList: false,
    matching: 'lines',
    outputFormat: 'side-by-side' // 或 'line-by-line'
  });

  return { html: diffHtml, stats: calculateStats(diff) };
}
```

### 5.2 前端依赖库（CDN）

```html
<!-- JSZip：浏览器端解压 zip -->
<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>

<!-- jsdiff：文本差异计算 -->
<script src="https://cdn.jsdelivr.net/npm/diff@5.1.0/dist/diff.min.js"></script>

<!-- diff2html：差异可视化渲染 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/diff2html@3.4.47/bundles/css/diff2html.min.css">
<script src="https://cdn.jsdelivr.net/npm/diff2html@3.4.47/bundles/js/diff2html-ui.min.js"></script>

<!-- marked：Markdown 渲染 -->
<script src="https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js"></script>

<!-- highlight.js：代码高亮 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/styles/github.min.css">
<script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/highlight.min.js"></script>
```

### 5.3 二进制文件判断规则（前端）

```javascript
const TEXT_EXTS = new Set([
  '.md', '.py', '.sh', '.bash', '.zsh',
  '.js', '.jsx', '.ts', '.tsx', '.vue',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.txt', '.text', '.log',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.xml', '.sql', '.go', '.rs', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt',
  '.dockerfile', '.gitignore', '.env.example',
  'dockerfile', 'makefile', 'rakefile',
]);

const BINARY_MAGIC = [
  [0x89, 0x50, 0x4E, 0x47], // PNG
  [0xFF, 0xD8, 0xFF],       // JPEG
  [0x47, 0x49, 0x46, 0x38], // GIF
  [0x50, 0x4B, 0x03, 0x04], // ZIP
  [0x25, 0x50, 0x44, 0x46], // PDF
];

function isBinaryFile(filePath, contentBytes) {
  // 1. 按扩展名判断
  const ext = filePath.split('.').pop()?.toLowerCase();
  if (TEXT_EXTS.has('.' + ext) || TEXT_EXTS.has(filePath.toLowerCase())) {
    return false;
  }

  // 2. 检查 Magic Bytes
  const header = Array.from(contentBytes.slice(0, 8));
  for (const magic of BINARY_MAGIC) {
    if (magic.every((b, i) => header[i] === b)) {
      return true;
    }
  }

  // 3. 检查是否包含零字节
  return contentBytes.slice(0, 8192).includes(0);
}
```

### 5.4 目录树生成（浏览器端）

```javascript
// 使用 JSZip 遍历生成目录树
function generateFileTree(zip) {
  const root = { type: 'directory', name: '', children: [] };

  zip.forEach((relativePath, zipEntry) => {
    const parts = relativePath.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const isDir = zipEntry.dir || !isLast;

      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = {
          type: isDir ? 'directory' : 'file',
          name: part,
          path: relativePath,
          ...(isDir ? { children: [] } : { size: zipEntry._data.uncompressedSize })
        };
        current.children.push(child);
      }
      current = child;
    }
  });

  return root.children[0]; // 返回顶层目录
}
```

### 5.5 性能优化

| 场景 | 优化策略 |
|------|---------|
| 大文件 Diff (> 1MB) | 显示警告，建议下载到本地对比 |
| Zip 缓存 | 使用 Cache API 缓存已下载的 zip |
| 并发下载 | 内网环境下并发拉取多个版本 zip |
| 增量渲染 | Diff 结果分页显示，避免 DOM 过大 |

---

## 六、前端页面设计

### 6.1 页面清单

| 页面 | URL | 说明 |
|------|-----|------|
| 登录页 | `/login` | 用户登录 |
| 列表页 | `/` | Skill 卡片列表 + 搜索 |
| 详情页 | `/skill/{id}` | 版本切换、目录树（浏览器端解压生成） |
| 文件预览页 | `/skill/{id}/file/{path}` | Markdown 渲染 / 代码高亮 / 纯文本（浏览器端解压渲染） |
| Diff 对比页 | `/skill/{id}/diff?path=&version_a=&version_b=` | unified 或 split 两种视图（浏览器端计算） |
| 发布页 | `/publish` | 拖拽目录自动打包 / 上传 zip 包发布新版本 |

### 6.2 Diff 对比页交互（浏览器端计算）

```
┌─────────────────────────────────────────────────────────┐
│ vantvox-bio / SKILL.md                   [切换版本 ▼]    │
│ 版本 A: [v20260323.090000 ▼]   版本 B: [v20260324.170230 ▼]  │
│ 视图: [统一|Split]  [🔄 重新计算 Diff]                     │
├─────────────────────────────────────────────────────────┤
│ 文件路径: SKILL.md                                      │
│ +24 行  -8 行  基础 156 行                             │
├─────────────────────────────────────────────────────────┤
│ ┌────────────────────────┬────────────────────────┐    │
│ │ ## 功能说明            │ ## 功能说明            │    │
│ │                        │                        │    │
│ │ - 初始版本结构   [-]   │ + 新增跨文化锚点说明   [+] │
│ │                        │ + 修复目录结构错误     [+] │
│ │ ## 使用方法            │ ## 使用方法            │    │
│ └────────────────────────┴────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

- **绿色背景行**：新增（addition）
- **红色背景行**：删除（deletion）
- **Diff 计算**：浏览器下载两个版本 zip → JSZip 解压 → jsdiff 计算 → diff2html 渲染
- Split 视图：左列旧版本，右列新版本，删除行和新增行左右对齐显示

### 6.3 文件预览页交互（浏览器端解压）

```
┌─────────────────────────────────────────────────────────┐
│ vantvox-bio / SKILL.md                   [v20260324.170230]│
├────────────────┬────────────────────────────────────────┤
│ 📁 vantvox-bio │ # VantVox Bio                          │
│ ├── 📄 SKILL.md│                                        │
│ ├── 📄 writing │ ## 功能说明                             │
│ │   -spec.md   │ ...                                    │
│ ├── 📁 references│                                      │
│ │   └── 📄 exa │ ## 使用方法                             │
│ └── 📁 scripts │ ...                                    │
│       └── 📄 p │                                        │
├────────────────┴────────────────────────────────────────┤
│ [📥 下载当前版本 Zip]                                    │
└─────────────────────────────────────────────────────────┘
```

- 点击左侧目录树中的文件，右侧实时渲染内容
- 使用 JSZip 在浏览器内存中解压，无需服务端参与
- Markdown 使用 marked.js 渲染，代码使用 highlight.js 高亮

### 6.4 发布页交互（支持拖拽目录）

```
┌─────────────────────────────────────────────────────────┐
│                    发布新版本                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │                                                 │  │
│   │     📁 拖拽 Skill 目录到此处                     │  │
│   │         或点击选择文件夹                         │  │
│   │                                                 │  │
│   │     支持直接拖拽文件夹，前端自动打包为 zip        │  │
│   │                                                 │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   或选择 zip 文件： [📎 选择文件...]                     │
│                                                         │
│   更新说明：                                             │
│   ┌─────────────────────────────────────────────────┐  │
│   │ 新增跨文化锚点说明章节                           │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│              [取消]        [发布新版本]                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**拖拽目录功能说明**：
- 非开发人员可直接将本地 Skill 文件夹拖拽到发布页
- 前端使用 `JSZip` 在浏览器端自动打包为 zip 文件
- 自动从目录结构中提取 `SKILL.md` 验证
- 打包完成后自动上传，后端生成时间戳版本号
- 也支持传统方式：选择已打包好的 zip 文件上传

**前端打包实现**：
```javascript
// 使用 File System Access API 读取目录
async function handleDrop(event) {
  const items = event.dataTransfer.items;
  const zip = new JSZip();
  
  for (const item of items) {
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry();
      await traverseDirectory(entry, zip);
    }
  }
  
  // 生成 zip blob 并上传
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  await uploadZip(zipBlob);
}
```

---

## 七、Skill Base CLI 对接

### 7.1 配置私有 Registry

用户在 Skill Base CLI 配置文件中添加：

```json
{
  "skill-base": {
    "registry": "https://skill-base.company.com/api/v1"
  }
}
```

或者通过环境变量：
```bash
export SKILLBASE_REGISTRY=https://skill-base.company.com/api/v1
```

### 7.2 CLI 登录流程

实现类似 `npm login` 的 Web 唤起验证码登录流程：

```bash
# 1. 开发者输入登录命令
$ skill-base login

# 2. 终端提示打开浏览器获取验证码
请在浏览器中打开以下链接并登录：
https://skill-base.company.com/cli-login

# 3. 登录成功后，网页显示 8 位验证码：8A2B-9C4F
# 4. 用户将验证码输入终端
请输入验证码: 8A2B-9C4F

# 5. 终端请求 /auth/cli-code/verify 换取 PAT
✅ 登录成功，当前账号：zhangsan
```

**PAT 存储位置**：
```json
// ~/.skill-base/credentials.json
{
  "skill-base.company.com": {
    "token": "sk-base-7f8a9b2c3d4e5f6g7h8i9j0k",
    "username": "zhangsan"
  }
}
```

### 7.3 CLI 命令映射

| 用户操作 | 对应 API |
|---------|---------|
| `skill-base login` | Web 登录 → `POST /auth/cli-code/verify` |
| `skill-base logout` | 删除本地 `credentials.json` 中的 token |
| `skill-base search vantvox` | `GET /skills?q=vantvox` |
| `skill-base install vantvox-bio` | `GET /skills/vantvox-bio` → `GET /skills/{id}/versions/latest/download` → 本地解压到 `~/.skill-base/skills/` |
| `skill-base install vantvox-bio@v20260324.170230` | `GET /skills/vantvox-bio` → `GET /skills/{id}/versions/v20260324.170230/download` → 本地解压 |
| `skill-base update vantvox-bio` | `GET /skills/vantvox-bio/versions` → 比对最新版本 → 有新版本则下载替换 |
| `skill-base publish ./vantvox-bio.zip` | `POST /skills/publish`（multipart 上传 zip，自动生成版本号）|

> **版本安装说明**：
> - 不指定版本时默认安装 `latest` 最新版本
> - 可通过 `@版本号` 语法安装指定版本，如 `skill-base install vantvox-bio@v20260324.170230`
> - 系统自动解析版本号并下载对应 zip 包

---

## 八、部署方案

### 8.1 Docker 单容器部署

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 安装依赖
COPY package.json .
RUN npm install --production

# 复制源码
COPY src/ ./src/
COPY static/ ./static/

# 数据目录
RUN mkdir -p /data
ENV DATA_DIR=/data
ENV DATABASE_PATH=/data/skills.db
ENV PORT=8000

EXPOSE 8000
CMD ["node", "src/index.js"]
```

```bash
# 构建并运行
docker build -t skill-base .
docker run -d \
  --name skill-base \
  -p 8000:8000 \
  -v /path/to/company-data:/data \
  skill-base

# 或直接本地运行
npm install
npm start
```

### 8.2 package.json

```json
{
  "name": "skill-base",
  "version": "2.0.0",
  "description": "Skill Base - 内网轻量版 Skill 管理平台",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "node --test tests/**/*.test.js"
  },
  "dependencies": {
    "fastify": "^4.26.0",
    "@fastify/static": "^6.12.0",
    "@fastify/multipart": "^8.0.0",
    "@fastify/cookie": "^9.3.0",
    "@fastify/cors": "^9.0.0",
    "better-sqlite3": "^9.4.0",
    "bcryptjs": "^2.4.3",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 8.3 目录权限

```
/data/                     # zip 包存储目录（宿主机持久化）
  skills.db                # SQLite 数据库文件
  vantvox-bio/
    v20260322.100000.zip
    v20260323.090000.zip
    v20260324.170230.zip
  feishu-doc/
    v20260320.080000.zip
```

---

## 九、运营流程

### 9.1 首次使用（管理员）

1. 部署完成后，使用预设的管理员账号登录
2. 在 `users` 表中创建普通用户账号（或配置 LDAP 对接）
3. 通知团队成员访问 `https://skill-base.company.com`

### 9.2 发布新版本（普通成员）

**方式一：拖拽目录（推荐非开发人员使用）**
1. 打开 `https://skill-base.company.com/publish`
2. 登录账号（如未登录）
3. 直接将本地 Skill 文件夹拖拽到页面指定区域
4. 前端自动打包并验证 `SKILL.md` 文件
5. 填写更新说明（可选）
6. 点击发布 → 系统自动生成版本号（如 `v20260324.170230`）
7. 显示发布成功，可直接预览

**方式二：上传 zip 包**
1. 打开 `https://skill-base.company.com/publish`
2. 登录账号（如未登录）
3. 选择本地打包好的 `vantvox-bio.zip`
4. 填写更新说明（可选）
5. 点击发布 → 系统自动生成版本号、落盘 zip、存入数据库
6. 显示发布成功，可直接预览

> **注意**：
> - 无需手动输入版本号，系统自动基于时间戳生成
> - 拖拽目录功能使用浏览器原生 File System Access API，无需安装任何工具

### 9.3 CLI 登录与使用（开发者）

```bash
# 1. 配置私有 registry
export SKILLBASE_REGISTRY=https://skill-base.company.com/api/v1

# 2. 登录（会唤起浏览器获取验证码）
npx skill-base@latest login

# 3. 搜索 Skill
npx skill-base@latest search vantvox

# 4. 安装最新版本
npx skill-base@latest install vantvox-bio

# 5. 安装指定版本
npx skill-base@latest install vantvox-bio@v20260324.170230

# 6. 升级到最新版本
npx skill-base@latest update vantvox-bio
```

### 9.4 查看版本差异（任意成员）

1. 打开 Skill 详情页
2. 选择目标文件（如 `SKILL.md`）
3. 点击「对比版本」按钮
4. 选择版本 A（旧）和版本 B（新）
5. 浏览器自动下载两个版本的 zip，在内存中解压并计算 Diff
6. 查看 unified 或 split 视图的 diff 结果

---

## 十、后续扩展

| 优先级 | 扩展功能 | 说明 |
|--------|---------|------|
| P1 | Skill 标签/分类 | 支持多标签，如「写作」「飞书」「自动化」 |
| P1 | 版本回退 | 一键将 latest_version 指针指向前一版本 |
| P2 | 预览图片缩略图 | zip 内图片文件生成缩略图展示 |
| P2 | 下载统计 | 记录每次下载，用于分析 Skill 使用情况 |
| P3 | Webhook | 发布新版本时触发 CI/CD 或通知机器人 |
| P3 | 访问权限控制 | 基于 API Token 的读写权限分离 |

---

*文档版本：v2.1.0 | 2026-03-24*

---

## 附录：变更日志

### v2.1.0 (2026-03-24)
- **后端技术栈变更**：Python + FastAPI → Node.js + Fastify
- **数据库驱动变更**：aiosqlite → better-sqlite3（同步 API，更简单）
- **CLI 重命名**：clawhub → skill-base
- **新增版本安装支持**：CLI 支持 `@版本号` 语法安装指定版本
- **新增 latest 别名**：下载接口支持 `latest` 自动解析为最新版本
- **新增拖拽发布**：发布页支持拖拽目录，前端自动打包 zip
- **优化非开发人员体验**：无需手动打包 zip，直接拖拽文件夹即可发布
