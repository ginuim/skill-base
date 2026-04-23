# Skill Base

[English](../README.md) | **中文**

[![npm version](https://img.shields.io/npm/v/skill-base.svg)](https://www.npmjs.com/package/skill-base)
[![Node version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](../LICENSE)

> Skill Base 是面向团队的 Agent Skill 私有分发平台。
> 通过最小化服务端 + `skb` CLI，实现技能的一次发布、多端安装、统一更新与可回滚，覆盖 Cursor、Claude Code、Codex、OpenClaw 等助手工具。
> 它解决的是团队技能分发与版本治理，不是通用文件存储。

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/demo.gif" alt="Skill Base 运行演示" />
</p>

## Skill Base 解决的不是“存文件”，而是团队分发

很多团队已经在写 Skill，但常见做法还是把它们扔进项目里的 `.cursor/skills`、`.claude/skills`、`.github/instructions`，再靠 Git 同步。这个办法一开始很省事，团队一变大就开始恶心人。

### 1. IDE 规则碎片化

有人用 Cursor，有人用 Claude Code、Qoder、Windsurf、OpenCode。每个 IDE 的目录结构和约定都不一样。你要同步的根本不是一个文件夹，而是一堆不同的落盘规则。

### 2. 非研发成员被挡在外面

PM 和 QA 也需要用 Skill 写 PRD、测试用例、回归清单。但为了用一个团队规范，没必要给他们开代码仓库权限，更没必要教他们怎么 `git pull`。

### 3. 跨项目复用很差

“通用接口鉴权 Skill”在 A 项目更新了，B 项目不会自动跟上。最后就是四处复制、四处漂移、四处漏改。

Skill Base 做的事情很直接：把 Skill 变成一个可发布、可安装、可更新、可回滚的团队资产。

## 如何在OpenClaw类产品使用SkillBase？

把下面的话直接发给助手即可（按你的环境替换服务器地址与验证码）。**每个步骤下面缩进引用块里的内容，就是可以原样粘贴给 Claw 的对话文案。**

1. **安装 `skill-base-cli`（对接已有站点）**

   > 到 ClawHub 拉取 **skill-base-cli**，并安装到你的 skills 目录。

   日常用 skb 搜索、安装、发版、对接团队已部署的 Skill Base 时用；**不必**为了用 CLI 再装服务端部署 Skill。

2. **安装 `skill-base-web-deploy`（部署或运维服务端）**

   > 到 ClawHub 拉取 **skill-base-web-deploy**，并安装到你的 skills 目录。

   仅当需要助手在本机或服务器上**起服务**、Docker、数据目录与备份等**服务端工作**时再装。

3. **配置 CLI 指向服务端**

   > 帮我配置 Skill Base，服务器地址是 **`https://skill-base-server`**。

   换成你的实际站点根 URL。

4. **搜索 Skill**

   > 用 skb 搜索 `some-skill`。

   **一般不需要登录。**

5. **安装 Skill**

   > 用 skb 安装 `some-skill`。

   可用 `skill_id@版本` 指定版本，或用 `-d` / `--ide` 指定目录或 IDE。**一般不需要登录。**

6. **更新 Skill**

   > 用 skb 更新 `some-skill`。

7. **完成登录**

   > 帮我 skb login，验证码是 **`xxxx-xxxx`**。

   验证码来自浏览器流程或浏览器打开 `https://<主机>/cli-code`，五分钟有效期。

8. **发布**

   > 调用 skb，发布刚写的 skill。

   需要时可同时说明让助手写 `--changelog` 文案。

本仓库在 `skills/` 下维护两个面向助手的 Skill，并已发布到 **ClawHub**：

| Skill | 作用 |
|-------|------|
| **`skill-base-cli`** | 指导助手通过终端执行 **`skb`**：`init`、`login`、`search`、`install`、`update`、`publish` 等，对接你的 Skill Base 站点。 |
| **`skill-base-web-deploy`** | 指导助手部署、启动或运维 **Skill Base 服务端**（`npx skill-base`、Docker、端口与数据目录、备份等）。 |

在 **OpenClaw 类**产品里，你可以直接让 Claw 从 ClawHub 按需把需要的 Skill 安装进助手的 skills 目录（与「从技能市场拉取技能包」同一类操作）。安装完成后，一条常见的「私有 Skill Base」闭环是：

1. **服务端** — 让助手在本地拉起服务（例如 `npx skill-base -d <数据目录> -p <端口>`），或指向已有部署；任务侧重服务端本身时用 **`skill-base-web-deploy`**。
2. **CLI 指向** — 执行 `skb init -s <站点根 URL>`，把服务根地址写入 **`~/.skill-base/config.json`**（URL 不要带 `/api` 后缀）。
3. **登录** — **`skb search`、`skb install` 不需要登录**；只有执行 **`skb publish`** 时才需要登录。准备发版时再让助手配合执行 `skb login`。`skb login` 走浏览器验证码流程；也可在浏览器访问 **`http://<你的-skill-base-主机>/cli-code`**（例如本机 `http://localhost:8000/cli-code`）获取**临时**验证码，在 CLI 中兑换为**长期 PAT**；验证码**五分钟**内有效，可以放心交给 Claw 或助手粘贴，不必担心长期令牌泄漏。
4. **日常操作** — 用 `skb search` / `skb install` / `skb update` / `skb publish` 完成拉取、更新与发版；这些以 **`skill-base-cli`** 为准。发布时使用 `--changelog "..."` **写变更说明**，也可**让 AI 助手根据改动或你的说明自动生成 changelog 文案**，再交给 `skb publish`。

你也可以本机全局安装 CLI（`pnpm add -g skill-base-cli`）或使用 `npx skill-base-cli`；这两个 Skill 的价值在于让助手**稳定地按同一套规范**代你执行上述命令。

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

Web 端还支持账号级收藏、下载次数统计，以及由超级管理员维护的全局标签库。详情页内联预览使用独立的 `/view` 接口，避免「浏览文件」计入下载次数。

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
└── skills/
    └── <skill-id>/
        ├── v20260406.101500.zip
        └── v20260407.143000.zip
```

这套结构的好处很朴素：备份简单，迁移简单，回滚也简单。很多团队甚至可以直接对这个目录做 Git 备份。

## 快速开始

### 1. 启动服务端

要求 Node.js >= 18。
服务端现在使用 `node-sqlite3-wasm` 访问 SQLite，因此日常启动时不再依赖本地编译 `better-sqlite3`。
如果你是从旧版本升级，而旧版本曾把数据库运行在 WAL 模式，Skill Base 会在首次启动时自动迁移：先尝试 `PATH` 中的 `sqlite3`（与服务器 libc 一致），再回退到随包分发的 `sqlite3` helper，然后切换到 WASM 驱动继续运行，不需要手工执行迁移命令，也不会丢数据。

当前随包提供的自动迁移 helper 平台：

- macOS `arm64`
- macOS `x64`
- Linux `x64`
- Windows `x64`

如果你的部署平台不在上述列表中，但要升级旧的 WAL 数据库，可在首次启动前设置 `SKILL_BASE_SQLITE3_PATH` 指向本机可执行的 `sqlite3`。

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
npx skill-base --session-store sqlite
```

常用参数：

| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--port` | `-p` | 指定端口号 | `8000` |
| `--host` | `-h` | 指定监听地址 | `0.0.0.0` |
| `--data-dir` | `-d` | 指定数据目录 | 包内 `data/` |
| `--base-path` | - | 指定部署前缀 | `/` |
| `--cache-max-mb` | - | 指定进程内 LRU 缓存总容量，单位 MB | `50` |
| `--session-store` | - | Session 存储类型（`memory` 或 `sqlite`） | `memory` |
| `--no-cappy` | - | 禁用终端里的 Cappy | 默认启用 |
| `--verbose` | `-v` | 输出调试日志 | 关闭 |

环境变量：

| 环境变量 | 说明 | 默认值 |
|------|------|--------|
| `CACHE_MAX_MB` | 进程内 LRU 缓存总容量上限 | `50` |
| `SESSION_STORE` | `memory` 或 `sqlite`（见下文 **Session 存储**） | `memory` |
| `DEBUG` | 设为 `true` 时输出详细日志（与 `--verbose` / `-v` 一致）：启动时的 `DEBUG:` 行以及 Fastify 请求日志 | 关闭 |

#### Session 存储

- **`memory`（默认）：** Session 在进程内存中。**应用进程重启后，所有 Session 都会失效**，用户需要重新登录。Session 的创建/读取/删除**不读写 SQLite**，相比 `sqlite` 能**减少数据库操作**。
- **`sqlite`：** Session 存在与 `skills.db` 同库的 `sessions` 表中。**重启后 Session 仍在**，多实例部署若**共享同一数据库文件**也可共用 Session；登录态校验等会走 SQLite 读写。

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

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/skill-base-home.png" alt="Skill Base Web 首页" width="720" />
</p>

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/skill-detail.png" alt="Skill Base 技能详情页" width="720" />
</p>

对于不想碰命令行的同事，Web 端可以直接完成这些事：

1. 浏览和搜索团队内部 Skill
2. 查看历史版本和变更说明
3. 下载技能包到本地
4. 上传包含 `SKILL.md` 的目录或 zip 包完成发布
5. 在发布页用 **公开** GitHub 仓库的完整 URL 或 `owner/repo` 导入：服务端下载 zipball、解析 `SKILL.md` 并按与普通上传相同的规则发版。若推导出的默认 skill id 已被他人占用且你无发布权限，界面会提示并预填建议 id（如 `gh-owner-repo`），可在「目标 Skill ID」中修改后再发布。

**GitHub 导入（服务端）：** 可选环境变量 `GITHUB_TOKEN` 或 `SKILL_BASE_GITHUB_TOKEN` 提高 GitHub API 限额；`SKILL_BASE_GITHUB_IMPORT_MAX_ZIP_MB` 限制下载体积（默认 `50`）；`SKILL_BASE_GITHUB_CONNECTIVITY_TIMEOUT_MS` 调整连通性探测超时（默认 `8000`）。发布页会请求 `GET /api/v1/skills/import/github/connectivity` 展示**服务端**能否访问 GitHub（浏览器翻墙不能代替服务器出网）。暂不支持私有仓库。

**CLI：**`skb import-github owner/repo`（别名 `skb import`），支持 `--ref`、`--subpath`、`--target`、`--changelog`，以及仅预览的 `--dry-run`。

## 部署与备份

### Docker

```bash
docker build -t skill-base .
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" --name skill-base-server skill-base
```

持久化目录建议单独用 `./skill-data` 这类宿主机目录。若你是在源码仓库根目录里运行 Docker，别默认把仓库自带的 `data/` 目录挂进去，除非你就是想让 SQLite 文件直接写进当前工作区。

**部署前缀（base path）：** 与 `npx skill-base --base-path` 相同，通过环境变量 `APP_BASE_PATH` 设置。路径需以 `/` 开头；末尾是否带 `/` 均可，服务端会规范化。

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e APP_BASE_PATH=/skills/ \
  --name skill-base-server skill-base
```

浏览器访问 `http://localhost:8000/skills/`，接口为 `http://localhost:8000/skills/api/v1/...`。若前面还有反向代理或 HTTPS 终止，请保证对外 URL 前缀与 `APP_BASE_PATH` 一致。

**调试日志：** 镜像入口是 `node src/index.js`，请传入 `-e DEBUG=true`：

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e DEBUG=true \
  --name skill-base-server skill-base
```

**Session 存储（Docker）：** 需要 SQLite 持久化 Session 时，例如：

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e SESSION_STORE=sqlite \
  --name skill-base-server skill-base
```

`SESSION_STORE=sqlite` 时，Session 与主库相同，存放在 `skills.db` 的 `sessions` 表中。

### PM2

全局安装 [PM2](https://pm2.keymetrics.io/) 后，可用 `npx` 启动 Skill Base（参数与上文 `npx skill-base` 一致）。下面 `-d` 使用 `./skill-data`，与上文快速开始一致；需要时也可换成绝对路径。

```bash
pnpm add -g pm2
pm2 start npx --name skill-base -- -y skill-base -d ./skill-data -p 8000
```

`-y` 传给 `npx`，避免在非交互环境下卡住。

若从本仓库源码运行，在仓库根目录执行，直接启动 CLI 入口：

```bash
pm2 start bin/skill-base.js --name skill-base -- -d ./skill-data -p 8000
```

环境变量写法与普通 Shell 一致（例如使用 SQLite 存储 Session）：

```bash
SESSION_STORE=sqlite pm2 start npx --name skill-base -- -y skill-base -d ./skill-data -p 8000
```

持久化进程列表并在开机时自动拉起：

```bash
pm2 save
pm2 startup
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

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/cappy-cn.gif" alt="Cappy" width="720" />
</p>

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

项目基于 [MIT License](../LICENSE) 开源，欢迎提交 Issue 和 Pull Request。
