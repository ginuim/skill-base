# 📦 Skill Base

[![npm version](https://img.shields.io/npm/v/skill-base.svg)](https://www.npmjs.com/package/skill-base)
[![Node version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **专为 200 人以下小团队打造的轻量级 AI Agent Skill 私有化管理平台。** 
> 告别跨项目复制粘贴提示词，让你的 Cursor、OpenClaw、Cline 等 AI 助手瞬间掌握团队内部的最佳实践与业务规范。极简部署，开箱即用。

---

## 🤔 什么是 Agent Skill？

在 AI 辅助开发时代，AI 虽然懂通用代码，但**不懂你们公司的业务上下文**。
如果让 AI 直接写一个“用户列表”，它可能会用原生的 `fetch` 和基础的 `table` 标签。但实际上，你们团队的规范可能是：
1. 必须使用内部封装的 `@/utils/request.js` 发起请求。
2. 必须使用团队魔改版的 `<ProTable>` 组件。
3. 时间格式化必须调用内部的 `formatDate` 方法。

**Agent Skill（技能包）就是用来解决这个问题的。** 它是一份结构化的文档（包含提示词约束、上下文规范和代码示例），通过把这些规则交给 AI，让 AI 不再“瞎造轮子”，而是严格按照你们团队的规矩写代码。

---

## 💡 为什么需要 Skill Base？

目前管理这些 AI 上下文，团队通常面临两大痛点，这也正是 Skill Base 诞生的原因：

### 1. 公共平台（如 Clawhub）不适合存放公司私有业务
OpenClaw 等框架非常强大，Clawhub 上也有很多优秀的开源 Skill。但涉及**公司内部接口约定、私有 UI 组件库用法、核心业务逻辑**的 Skill，显然不能发布到公共网络。
👉 **Skill Base 是 OpenClaw 等工具完美的“私有化伴侣”**，就像私有 npm 源（Verdaccio）一样，专门用于沉淀和分发团队内部的私有技能包。

### 2. 告别四处复制粘贴 `.cursorrules`
很多团队目前通过在每个代码仓库里放一个 `.cursorrules` 或共享文档来同步 AI 规范。一旦规范更新（比如组件库升级了），需要手动去几十个仓库里改，极难维护。
👉 **Skill Base 引入了包管理的理念**。只需要 `skb install team-vue-rules`，就能将最新的规范同步到当前项目，支持版本控制与一键更新。

### 3. 拒绝重型架构，专为小团队设计
部署一套带 MySQL、Redis 的企业级知识库太重了。Skill Base 采用纯 Node.js + SQLite 架构，**一行 `npx` 命令即可启动**，没有任何运维心智负担。

---

## ✨ 核心特性

- ⚡ **零配置启动**：一行 `npx skill-base` 即可运行，内置 SQLite，无需额外数据库服务。
- 🔄 **如同 npm 般的体验**：提供 `skb` CLI 工具，`install / update / publish` 符合开发者直觉。
- 🔒 **私有化安全**：所有团队规范、业务逻辑数据均保存在本地/私有服务器。
- 📦 **版本控制**：支持 Skill 的多版本管理，规范迭代有迹可循。
- 🌐 **双端支持**：可视化的 Web 管理后台 + 高效的 CLI 命令行。

---

## 💡 设计哲学：为“随时废弃”而构建 (Build to Delete)

业界关于 AI 工程有一个著名的洞察：**车速越快，护栏越重要。**
模型（引擎）越强大，团队越需要清晰的 Harness（架构约束、工具集）来防止 AI 跑偏。

但我们深知，AI 进化的速度太快了。今天极度复杂的 Prompt 技巧，半年后可能就会被新一代模型原生的推理能力淘汰。

因此，**Skill Base 坚决贯彻 "Start Simple. Build to Delete" 的理念：**
1. **纯粹的搬运工**：我们不做重型的 Agent 编排框架，不与任何特定的大模型绑定。我们只是团队上下文的“高速快递网络”。
2. **极轻量、模块化**：我们鼓励团队沉淀“微型技能包”（Micro-Skills），用完即弃，随时拆卸，绝不产生历史包袱。
3. **零技术债**：无数据库依赖（内置 SQLite），无微服务。今天 `npx` 跑起来，明天删掉目录即无痕销毁。

我们不预测 6 个月后的 AI 长什么样，但我们确保：**无论 AI 怎么变，Skill Base 永远是你团队同步最佳实践的最快通道。**

---

## 🚀 快速启动服务端

要求 Node.js >= 18.0.0。最简单的启动方式是直接使用 `npx`：

```bash
# 推荐做法：指定数据目录启动（方便数据持久化和备份）
npx skill-base -d ./skill-data -p 8000
```

**其他启动选项：**
```bash
npx skill-base                 # 默认启动 (端口 8000, 数据存放在 npm 缓存)
npx skill-base --host 127.0.0.1 # 仅限本地访问，增强安全性
```

> 🔐 **首次运行须知**：系统启动后，首次访问 Web 端将自动跳转至**初始化页面**，请根据提示设置系统管理员账号与密码。

---

## 💻 客户端使用指南 (CLI & Web)

### ⌨️ CLI 命令行工具 (推荐极客使用)

**1. 安装 CLI:**
```bash
npm install -g skill-base-cli
```

**2. 配置你的私有服务地址:**
```bash
skb init -s http://your-team-server
```

**3. 像用 npm 一样管理你的 AI Skills:**
```bash
# 账号操作
skb login

# 搜索与安装
skb search vue                                        # 搜索
skb install vue-best-practices                        # 安装最新版
skb install vue-best-practices@v20260115              # 安装指定版本
skb install vue-best-practices -d ./.cursor/rules     # 安装到 Cursor 规则目录

# 发布团队内部的新 Skill
skb publish ./my-business-skill --changelog "新增了报表组件的使用规范"
```

**🤖 深度集成各大主流 AI IDE:**

不用去记不同 AI 工具复杂的规则文件路径！`skb` 提供了智能的 IDE 适配，一键将团队规范直接注入你的工作流：
```bash
# 交互式安装，根据提示选择即可
skb install my-team-rules

# 或者使用快捷参数，直接注入当前项目的 AI 上下文
skb install team-vue-rules --ide cursor     # 自动生成到 .cursor/rules/
skb install team-vue-rules --ide qoder      # 自动生成到 .qoder/skills/
skb install team-vue-rules --ide copilot    # 自动生成到 .github/instructions/

# 支持全局安装通用素养规则
skb install git-commit-rules --ide cursor --global
```

### 🌐 Web 端操作
对于不习惯命令行的团队成员，可以直接访问浏览器：
1. **浏览与检索**：可视化查看所有内部沉淀的 Skill 及其历史版本。
2. **下载使用**：一键下载，直接拖入项目。
3. **极简发布**：将包含 `SKILL.md` 的文件夹（或 zip 包）**直接拖拽**到网页上传区域，即可完成发布。

---

## 📝 如何编写一个好用的 Skill？

在要发布的目录中创建一个 `SKILL.md`，Skill Base 会自动解析它。

### Frontmatter 规范

推荐使用 YAML frontmatter 明确定义元数据：

| 字段 | 必需 | 说明 |
|------|------|------|
| `name` | 推荐 | Skill 的唯一标识符，建议使用 kebab-case |
| `description` | 推荐 | 描述 Skill 用途，**务必包含触发关键词** |

> 💡 如果省略 frontmatter，系统会自动使用第一个 `#` 标题作为 name，标题后第一段文本作为 description。

### 触发关键词写法

在 `description` 中使用自然语言描述触发条件，AI 助手会据此判断何时激活该 Skill：

```yaml
description: "Triggers on requests to create Vue admin pages, write ProForm components, or any mention of internal API standards."
```

### 互斥与互补关系

当多个 Skill 可能同时触发时，在正文开头声明它们的关系：

```markdown
> 本技能与 `team-api-standards` 互补——接口请求规范仍遵循该技能。
> 本技能与 `legacy-vue2-rules` 互斥——请勿同时安装。
```

### 完整示例

```markdown
---
name: team-vue3-admin
description: "Internal Vue3 admin best practices for R&D Team 1. Triggers on requests to create Vue admin pages, write ProForm components, use internal UI library, or any mention of ProTable, useRequest, or internal component standards."
---

# 内部 Vue3 管理后台最佳实践

> 本技能与 `team-api-standards` 互补——接口请求规范仍遵循该技能。

研发一部针对中后台项目的标准 AI 提示词规范，包含组件库使用限制和接口请求标准。

## 🎯 核心原则

- 必须使用 TypeScript。
- 所有的表单组件必须使用 `@/components/ProForm`，严禁使用原生 el-form。
- 表格展示必须使用 `<ProTable>`，禁止原生 table 或 el-table。

## 📦 接口请求规范

- 引入：`import { useRequest } from '@/utils/request'`
- 示例：
  \`\`\`typescript
  const { data, loading } = await useRequest<UserList>('/api/v1/users', { method: 'GET' })
  \`\`\`

## ✅ 质量检查清单

- [ ] 使用 TypeScript 严格模式
- [ ] 表单使用 ProForm 组件
- [ ] 表格使用 ProTable 组件
- [ ] 接口请求使用 useRequest
- [ ] 时间格式化使用 formatDate
```

*将上述文件夹通过 `skb publish` 发布后，你的团队成员就可以愉快地 `skb install` 并将它喂给 Cursor 或 OpenClaw 了！*

---

## 🛠 生产环境私有化部署

### Docker 部署（推荐）
对于企业内部服务器，使用 Docker 部署最为稳妥：
```bash
docker build -t skill-base .
# 将本地的 ./data 目录挂载到容器内实现数据持久化
docker run -d -p 8000:8000 -v $(pwd)/data:/data --name skill-base-server skill-base
```

### 数据存储说明
如果指定了 `-d ./data`，数据结构如下，非常便于直接打包备份：
```text
data/
├── skills.db          # SQLite 核心数据库
├── skills.db-wal      # WAL 日志缓存
└── skills/            # 各 Skill 的 zip 包目录
    └── <skill-id>/
        └── v20260326.120000.zip
```

---

## 🤝 参与贡献
本项目基于 [MIT License](LICENSE) 开源，致力于打造最轻量、最好用的团队 AI 资产管理工具。欢迎提交 Issue 和 Pull Request 共建！