# Skill Base

[![npm version](https://img.shields.io/npm/v/skill-base.svg)](https://www.npmjs.com/package/skill-base)
[![Node version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> 不要再把 Agent Skills 塞进代码仓库了。
> Skill Base 是一个面向中小团队的 Agent Skill 私有分发平台：一个轻量服务端，加一个 `skb` CLI，把团队规范从仓库里剥出来，统一分发给 Cursor、Claude Code、Qoder、OpenCode、Windsurf 等工具。

## 它解决的不是“存文件”，而是团队分发

很多团队已经在写 Skill，但常见做法还是把它们扔进项目里的 `.cursor/skills`、`.claude/skills`、`.github/instructions`，再靠 Git 同步。这个办法一开始很省事，团队一变大就开始恶心人。

### 1. IDE 规则碎片化

有人用 Cursor，有人用 Claude Code、Qoder、Windsurf、OpenCode。每个 IDE 的目录结构和约定都不一样。你要同步的根本不是一个文件夹，而是一堆不同的落盘规则。

### 2. 非研发成员被挡在外面

PM 和 QA 也需要用 Skill 写 PRD、测试用例、回归清单。但为了用一个团队规范，没必要给他们开代码仓库权限，更没必要教他们怎么 `git pull`。

### 3. 跨项目复用很差

“通用接口鉴权 Skill”在 A 项目更新了，B 项目不会自动跟上。最后就是四处复制、四处漂移、四处漏改。

Skill Base 做的事情很直接：把 Skill 变成一个可发布、可安装、可更新、可回滚的团队资产。

## 核心能力

### 一处发布，本地多处更新

`skb install` 不只是下载一个 Skill。CLI 会顺手记住这个 Skill 被装到了哪些本地目录、属于哪个 IDE、当前版本是什么。

于是当团队规范更新后，你只需要：

```bash
skb update some-skill
```

如果本地只有一个安装记录，CLI 直接更新；如果有多个安装目录，它会列出来让你勾选。重点不是交互有多花哨，重点是你终于不用手工去几十个项目里替换旧 Skill 了。

这也意味着你可以形成一个很顺手的闭环：让 AI 先把本地 Skill 改好，再执行 `skb publish` 发布到内网，其他同事执行一次 `skb update` 就能同步到最新规范。

### 脱离代码仓库，全员可用

研发可以继续在终端里：

```bash
skb search vue
skb install team-vue-rules --ide cursor
skb publish ./my-skill --changelog "补充接口鉴权规范"
```

PM、QA 或不习惯命令行的同事，则直接用 Web 端搜索、查看版本、下载技能包。团队知识不该只服务会写代码的人。

### 数据结构克制，天然适合 GitOps

Skill Base 服务端只管理几样东西：

- `skills.db`：Skill、版本、用户、权限等索引信息
- `skills/<skill-id>/<version>.zip`：每个发布版本的归档包
- 一个极轻的 Node.js 服务：负责鉴权、上传、下载、版本查询和静态页面

没有 MySQL，没有 Redis，没有一堆你明天就懒得维护的基础设施。

如果你用 `-d ./data` 指定数据目录，结构大致就是这样：

```text
data/
├── skills.db
├── skills.db-shm
├── skills.db-wal
└── skills/
    └── <skill-id>/
        ├── v20260406.101500.zip
        └── v20260407.143000.zip
```

这套结构的好处很朴素：备份简单，迁移简单，回滚也简单。很多团队甚至可以直接对这个目录做 Git 备份。

## 快速开始

### 1. 启动服务端

要求 Node.js >= 18。

```bash
npx skill-base -d ./skill-data -p 8000
```

首次启动后，访问 Web 页面会进入初始化流程，按提示创建管理员账号即可。

常用启动方式：

```bash
npx skill-base
npx skill-base --host 127.0.0.1
npx skill-base --base-path /skills/
npx skill-base --cache-max-mb 100
```

常用参数：

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--port` | `-p` | 指定端口号 | `8000` |
| `--host` | `-h` | 指定监听地址 | `0.0.0.0` |
| `--data-dir` | `-d` | 指定数据目录 | 包内 `data/` |
| `--base-path` | - | 指定部署前缀 | `/` |
| `--cache-max-mb` | - | 指定进程内 LRU 缓存总容量，单位 MB | `50` |
| `--no-cappy` | - | 禁用终端里的 Cappy | 默认启用 |
| `--verbose` | `-v` | 输出调试日志 | 关闭 |

环境变量：

| 环境变量 | 说明 | 默认值 |
|------|------|--------|
| `CACHE_MAX_MB` | 进程内 LRU 缓存总容量上限 | `50` |

`GET /api/v1/health` 会返回简化缓存统计，方便你确认缓存是否正常工作。

### 2. 安装 CLI

```bash
pnpm add -g skill-base-cli
```

### 3. 配置服务地址

```bash
skb init -s http://your-team-server
skb login
```

### 4. 安装、更新、发布

```bash
# 搜索
skb search vue

# 安装最新版
skb install vue-best-practices

# 安装指定版本
skb install vue-best-practices@v20260115

# 安装到指定目录
skb install vue-best-practices -d ./.cursor/skills

# 自动适配 IDE 目录
skb install team-vue-rules --ide cursor
skb install team-vue-rules --ide claude-code
skb install team-vue-rules --ide qoder
skb install team-vue-rules --ide opencode
skb install team-vue-rules --ide copilot

# 安装到全局 IDE 配置目录（仅支持部分 IDE）
skb install git-commit-rules --ide cursor --global

# 查看本地已记录的安装项，并继续更新/删除/清记录
skb list

# 更新某个 Skill 在本地关联的安装目录
skb update team-vue-rules

# 发布新版本
skb publish ./my-business-skill --changelog "新增报表组件使用规范"
```

当前内置支持的 IDE 包括：

- Cursor
- Claude Code
- GitHub Copilot
- Windsurf
- Qoder
- QoderWork
- OpenCode

## 适合什么样的团队

如果你的团队已经出现下面这些情况，Skill Base 基本就有价值：

- 团队里不只一种 AI IDE
- Skill 需要在多个项目之间复用
- 规范会频繁演进，必须能追踪版本
- PM、QA、运营也想直接消费团队 Skill
- 你不想为了一个小平台维护一套重型基础设施

## Skill 长什么样

Skill Base 发布的是一个包含 `SKILL.md` 的目录。最小示例：

```markdown
---
name: team-vue3-admin
description: "Internal Vue3 admin best practices. Triggers on requests to create Vue admin pages, use ProTable, ProForm, or internal request utilities."
---

# 内部 Vue3 管理后台最佳实践

研发一部的中后台规范，覆盖表单、表格、请求封装和时间格式化。

## 核心原则

- 必须使用 TypeScript
- 表单统一使用 `ProForm`
- 表格统一使用 `ProTable`
- 请求统一使用 `@/utils/request`
```

如果省略 frontmatter，系统会自动使用第一个 `#` 标题作为名称，标题后的第一段作为描述。但说实话，还是老老实实写上 `name` 和 `description`，别靠猜。

## Web 端能做什么

对于不想碰命令行的同事，Web 端可以直接完成这些事：

1. 浏览和搜索团队内部 Skill
2. 查看历史版本和变更说明
3. 下载技能包到本地
4. 上传包含 `SKILL.md` 的目录或 zip 包完成发布

这才是“团队版”的关键。不是每个会用 AI 的人都应该先学 Git。

## 部署与备份

### Docker

```bash
docker build -t skill-base .
docker run -d -p 8000:8000 -v "$(pwd)/data:/data" --name skill-base-server skill-base
```

### 备份

最简单的做法不是搞复杂脚本，而是直接备份数据目录。因为版本包和索引都在里面，恢复时只要把目录带回来，服务就能继续跑。

如果你的团队本来就在用 Git 管理内部基础设施，甚至可以直接把数据目录当成一个普通仓库去备份：

```bash
git add .
git commit -m "backup skill-base data"
git push
```

## Cappy

Skill Base 默认会在终端里带上一只 ASCII 水豚 `Cappy`。它不影响业务，只负责在你发版、拉取、等待服务启动时缓解一点焦虑。

如果你不喜欢它，启动时加上：

```bash
npx skill-base --no-cappy
```

## 设计原则

这个项目故意做得很克制：

- Skill 只是团队上下文的分发单元，不做重型 Agent 编排
- 服务端只做该做的事：鉴权、存储、版本、分发
- 用最少的数据结构解决实际问题，不为了“企业级”三个字先堆一车依赖

说白了，Skill Base 不是为了显得先进，而是为了让团队规范真的流动起来。

## 参与贡献

项目基于 [MIT License](LICENSE) 开源，欢迎提交 Issue 和 Pull Request。