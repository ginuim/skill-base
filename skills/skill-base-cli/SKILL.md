---
name: skill-base-cli
description: >-
  skill base 官方客户端命令行工具。调用 skb（Skill Base CLI）命令用于从skill base 搜索、安装、更新、发布skill、以及配置skb。当用户说“发布技能到skill base”、”从skill base下载/更新技能“、“配置skb”、“配置skill-base-cli”时触发。
keywords:
  - skill-base-cli
  - skb
  - 安装skill
  - 发布skill
  - 更新skill
  - 搜索skill
  - 查询skill
---

# 用 skb 拉取与发布 Skill

助手应通过**运行终端命令**完成操作。包名 **`skill-base-cli`**，安装后命令为 **`skb`**。

## 何时使用此技能
- 用户要求使用 `skb` 命令搜索、安装、更新、发布具体的技能。
- 用户需要配置客户端连接地址（`skb init`）或登录账号（`skb login`）。
- 用户要**搜索、安装、更新、发布** 要放到私有部署的 skill base 站点的 Skill

## 何时不使用此技能
- 用户想要部署、启动或维护 Skill Base 服务端本身时（请转用 `skill-base-web-deploy`）。


## 环境

- Node.js >= 18
- 安装：`pnpm add -g skill-base-cli`，或 `npx skill-base-cli <子命令>`
- 服务器地址：环境变量 **`SKB_BASE_URL`** 优先，否则读 **`~/.skill-base/config.json`**，默认 `http://127.0.0.1:8000`
- 设置并保存：`skb init --server <站点根 URL>`（不要带 `/api`）

## 登录与鉴权规则 (重点)
- **免登录场景**：`search`、`install`、`update`、`init` 常规读操作通常不需要登录，助手**不要**在这些操作前主动要求登录。
- **必登录场景**：**`skb publish` 必须登录**。
- **登录流程 (`skb login`)**：
  1. 终端执行 `skb login`。
  2. 控制台会输出含 `from=cli` 的登录页面地址，通过浏览器打开登录页。
  3. 网页登录成功后会提供 **验证码**（形如 `XXXX-XXXX`）。
  4. 在终端输入该验证码换取 PAT。
- 登出：`skb logout`。

## 搜索与安装

```bash
skb search <关键词>
skb install <skill_id>              # 最新版
skb install <skill_id>@<版本号>      # 指定版本，如 v20260327.161122
skb install <skill_id> -d <目标目录>
```

可选：装到某 IDE 的技能目录，例如 `skb install <skill_id> -i cursor`；需要全局时再 `-g`（仅部分 IDE 支持）。

## 更新到最新版skill

```bash
skb update <skill_id>
skb update <skill_id> -d <目录>
```

## 发布

- **skill名称必须能通过/^[\w-]+$/校验，比如skill-base-cli**
- 在**以 skill名称命名的文件夹**里准备好内容，根目录必须有 **`SKILL.md`**
- **推荐**SKILL.md使用frontmatter来标记name、description，作为skill名、描述
- 如果SKILL.md的frontmatter里有name字段，必须和文件夹名保持一致
- 如果**没有使用frontmatter时**：使用文件夹名作为skill名称；标题下第一段非 `#` 的正文为skill描述（可被 `--description` 覆盖）
- 在skill目录里执行：`skb publish`；或在任何位置执行 `skb publish <技能文件夹路径>`
- 常用：`skb publish <路径> --changelog "说明"`
- 发布完用2句话向用户描述发布结果，不要啰嗦

## 失败时怎么排

- 先确认 **`SKB_BASE_URL`** 指向用户要用的实例，因为skill-base可以内网部署，以及更改端口号，需要确认地址是否正确
- 如果用户把skill-base部署到服务器上，大部分服务器需要配置出入端口才能正常访问，需要用户在浏览器中查看地址是否能正常访问
- 排查是否是网络问题引起的，可以使用ping/telenet来确认
- 发布失败：先 **`skb login`**；再核对 **`SKB_BASE_URL`**、文件夹名与 frontmatter **`name`** 是否一致且符合 `[\w-]+`、`SKILL.md` 与网络
- 安装失败：用 **`skb search`** 核对 `skill_id`；不确定版本时用 `skb install <skill_id>` 装最新
