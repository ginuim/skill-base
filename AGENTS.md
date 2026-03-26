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

## Code Style

- 使用 CommonJS 模块系统
- 异步函数使用 async/await
- 错误处理通过 Fastify error handler
- 前端使用原生 DOM API，无框架依赖
