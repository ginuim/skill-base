# Skill Base - AI Agent Guidelines

## Project Overview

Skill Base 是一个轻量级 AI Agent Skill 管理平台，用于存储、版本管理和分发 AI Agent Skills。

## Architecture

```
skill-base/
├── bin/          # CLI 入口脚本 (npx skill-base)
├── cli/          # CLI 命令行工具 (skill-base-cli)
├── src/          # 服务端源码 (Fastify)
│   ├── middleware/   # 中间件 (auth, admin, error)
│   ├── models/       # 数据模型 (skill, user, version)
│   ├── routes/       # API 路由
│   └── utils/        # 工具函数
├── static/       # Web 前端 (原生 JS)
│   ├── js/           # 前端脚本
│   └── css/          # 样式文件
├── data/         # 数据存储 (SQLite + ZIP files)
└── docs/         # API 文档
```

## Tech Stack

- **Backend**: Node.js + Fastify
- **Database**: SQLite (better-sqlite3)
- **Frontend**: Vanilla JavaScript + CSS
- **Storage**: Local filesystem (ZIP archives)

## Key Concepts

### Skill
一个 Skill 是一个包含 `SKILL.md` 的文件夹，平台会自动解析：
- **name**: 第一个 `#` 标题
- **description**: 标题后的第一段文本

### Version
版本号格式: `vYYYYMMDD.HHmmss`（时间戳版本）

### Permission Model
- **owner**: 完全控制权限
- **collaborator**: 可发布新版本
- **user**: 只读权限

## API Patterns

所有 API 路由前缀: `/api/v1/`

认证方式: Cookie-based session (`session_token`)

## Development Commands

```bash
# 开发模式
npm run dev

# 生产模式
npm start

# 一键启动 (npx)
npx skill-base -p 8000
```

## Runtime Notes

- 进程内提供基于 LRU 的只读模型缓存，用于 `skill`、`version` 和 `user` 基础信息读取。
- 缓存总容量通过环境变量 `CACHE_MAX_MB` 控制，默认 `50`（MB）。
- 服务健康检查 `GET /api/v1/health` 会返回简化缓存统计，可用于部署后观察缓存是否生效。
- 任何涉及 Skill/Version/User 的写路径都应在数据库写入成功后显式失效相关缓存，不要尝试做“通用 SQL 缓存”。

## Code Style

- 使用 CommonJS 模块系统
- 异步函数使用 async/await
- 错误处理通过 Fastify error handler
- 前端使用原生 DOM API，无框架依赖

## Documentation Checklist

完成任何功能开发或修改后，必须检查并更新以下文档：

- [ ] **README.md** - 项目主文档，检查功能说明、使用示例是否需要更新
- [ ] **skill-base-cli** - CLI Skill 包，检查命令参数、使用流程是否变化
- [ ] **skill-base-web-deploy** - Web 部署 Skill 包，检查部署步骤、配置说明是否变化
- [ ] **docs/cli.md** - CLI 详细文档，检查命令参考、示例是否需要同步
- [ ] **AGENTS.md** - 本文件，检查开发规范、注意事项是否需要补充

> 💡 **文档优先原则**：代码改动完成后，应当立即更新相关文档，确保文档与代码保持同步。
