# Skill Base - AI Agent Guidelines

## Project Overview

Skill Base 是一个轻量级 AI Agent Skill 管理平台，用于存储、版本管理和分发 AI Agent Skills。

## Architecture

```
skill-base/
├── bin/          # CLI 入口脚本 (npx skill-base)
├── cli/          # CLI 命令行工具 (skill-base-cli)
├── desktop-tauri/ # Desktop 客户端 (Tauri 2 — Vue UI + Node bridge)
├── src/          # 服务端源码 (Fastify)
│   ├── middleware/   # 中间件 (auth, admin, error)
│   ├── models/       # 数据模型 (skill, user, version)
│   ├── routes/       # API 路由
│   └── utils/        # 工具函数
├── web/          # Web 前端源码 (Vue 3 + TypeScript + Vite)
├── static/       # Web 构建产物（由 web/ 构建生成）
├── data/         # 数据存储 (SQLite + ZIP files)
└── docs/         # API 文档
```

## Tech Stack

- **Backend**: Node.js + Fastify
- **Database**: SQLite (node-sqlite3-wasm)
- **Frontend**: Vue 3 + TypeScript + Tailwind CSS (web/)
- **Storage**: Local filesystem (ZIP archives)

## Key Concepts

### Skill
一个 Skill 是一个包含 `SKILL.md` 的文件夹，平台会自动解析：
- **name**: frontmatter 的 `name`（未写时退化为第一个 `#` 标题）
- **description**: 标题后的第一段文本

### Collection
Collection 是管理员维护的扁平推荐包（如“前端组必装”），通过 `collection_skills` 与 Skill 多对多关联；它负责推荐入口，不替代 tags，也不是文件夹树。

### Version
版本号格式: `vYYYYMMDD.HHmmss`（时间戳版本）

### Permission Model
- **owner**: 完全控制权限
- **collaborator**: 可发布新版本
- **user**: 只读权限

## API Patterns

所有 API 路由前缀: `/api/v1/`

认证方式: Cookie-based session (`session_token`)；CLI 使用 `Authorization: Bearer` PAT。

公开 GitHub 仓库导入（登录后）：`GET /skills/import/github/connectivity`、`POST /skills/import/github/preview`、`POST /skills/import/github`（JSON）。可选环境变量 `GITHUB_TOKEN` / `SKILL_BASE_GITHUB_TOKEN`、`SKILL_BASE_GITHUB_IMPORT_MAX_ZIP_MB`、`SKILL_BASE_GITHUB_CONNECTIVITY_TIMEOUT_MS`。

每个 Skill 可选配置 `webhook_url`（**PUT** `/skills/:skill_id` 的 JSON 字段；仅管理者在 GET 中可见）。在元数据变更、发布新版本、修改 Head、PATCH 版本说明、删除 Skill 等时机向该 URL **异步 POST** JSON，详见 `docs/zh/api.md`。可选 `SKILL_BASE_WEBHOOK_TIMEOUT_MS` 控制投递超时。

每个 Skill 可选挂截图（screenshots，JSON 数组列）：`POST/PUT /skills/:skill_id/screenshots`、`DELETE /skills/:skill_id/screenshots/:shot_id`、`GET .../file`（权限：owner/collaborator 写，可见性同 Skill 读）。文件存 `data/skills/<skill_id>/screenshots/`，删除 Skill 时随目录清理。上限可用 `SKILL_BASE_SCREENSHOT_MAX_MB`（默认 5）、`SKILL_BASE_SCREENSHOT_MAX_COUNT`（默认 10）配置。

用户可选预设头像（`users.avatar`，文件名白名单，静态资源 `/avatars/`）。登录用户通过 **PATCH** `/auth/me` 更新 `name` / `avatar`。

## Development Commands

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 一键启动 (npx)
npx skill-base -p 8000

# Desktop (Tauri) — 见 desktop-tauri/README.md
cd desktop-tauri && pnpm install && pnpm dev
cd desktop-tauri && pnpm build   # release：bundled Node + esbuild bridge
cd desktop-tauri && pnpm verify:ipc && pnpm smoke:channels  # IPC 验收
```

### Desktop IPC

- Channel 列表：`cli/lib/desktop-ipc-channels.mjs`（22 个）
- 业务逻辑：`cli/lib/desktop-handlers.mjs`
- UI：`desktop-tauri/src/`（Vue）
- Tauri：Rust `skb_invoke` → 5 个原生 channel（dialog/opener）+ 其余转发 Node bridge HTTP
- 验收：`desktop-tauri/ACCEPTANCE.md`；`pnpm verify:ipc` / `pnpm smoke:channels`

## Runtime Notes

- 进程内提供基于 LRU 的只读模型缓存，用于 `skill`、`version` 和 `user` 基础信息读取。
- 缓存总容量通过环境变量 `CACHE_MAX_MB` 控制，默认 `50`（MB）。
- 服务健康检查 `GET /api/v1/health` 会返回简化缓存统计，可用于部署后观察缓存是否生效。
- 任何涉及 Skill/Version/User 的写路径都应在数据库写入成功后显式失效相关缓存，不要尝试做“通用 SQL 缓存”。

## Code Style

- 使用 CommonJS 模块系统
- 异步函数使用 async/await
- 错误处理通过 Fastify error handler
- Web 前端使用 Vue 3 Composition API 与 `<script setup lang="ts">`；运行 `npm run build --prefix web` 生成 `static/`，不要手改构建产物。
- Skill 详情页桌面端左列为技能介绍及紧随其后的文件、效果预览、版本历史、成员与权限分区，右列独立放置安装/版本操作，避免撑高介绍区域；截图属于独立的效果预览页签（有截图或有管理权限时显示）。安装面板支持 AI Agent Prompt / 命令行切换，复制内容须包含当前站点与所选版本；长介绍默认折叠。贡献者仅从版本 uploader 去重得出，不等同于所有者或协作者；头像可用同 ID 成员信息补全。截图不使用装饰边框、卡片或阴影。

## Contributor Profiles

- 首页列表贡献者最多显示 3 个头像，超出用 `+N` 展开；头像链接 `/users/:id`。详情页复用同一头像组件。
- `GET /api/v1/users/:user_id/profile` 返回公开身份字段与访问者可见的贡献技能及统计；不能直接暴露管理接口的用户对象。
- 贡献者由 `skill_versions.uploader_id` 去重，成员身份本身不计为贡献。列表批量读取贡献者，避免每个 Skill 请求版本历史。
- 主页统计中的下载量为可见贡献技能的累计下载，不能宣称为某用户个人带来的下载。

## Documentation Checklist

完成任何功能开发或修改后，必须检查并更新以下文档：

- [ ] **README.md** - 项目主文档，检查功能说明、使用示例是否需要更新
- [ ] **skill-base-cli** - CLI Skill 包，检查命令参数、使用流程是否变化
- [ ] **skill-base-web-deploy** - Web 部署 Skill 包，检查部署步骤、配置说明是否变化
- [ ] **docs/zh/cli.md** - CLI 详细文档，检查命令参考、示例是否需要同步
- [ ] **AGENTS.md** - 本文件，检查开发规范、注意事项是否需要补充

> 💡 **文档优先原则**：代码改动完成后，应当立即更新相关文档，确保文档与代码保持同步。
