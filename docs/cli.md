# Skill Base CLI 使用说明

`skb` 是 Skill Base 的官方命令行客户端，用来搜索、安装、更新、发布团队 Skill。

它真正有价值的地方，不是“能下载文件”，而是会记住 Skill 被装到了哪些 IDE 目录里，后续可以继续批量更新、删除和清理记录。

## 安装

```bash
pnpm add -g skill-base-cli
```

也可以直接临时执行：

```bash
npx skill-base-cli <command>
```

## 初始化

CLI 默认连接 `http://localhost:8000`。推荐先执行一次初始化，把服务地址写入本地配置：

```bash
skb init -s https://skill.example.com
```

你也可以用环境变量覆盖：

```bash
export SKB_BASE_URL=https://skill.example.com
```

## 命令概览

| 命令 | 说明 |
|------|------|
| `skb init` | 初始化 CLI 配置，设置服务地址 |
| `skb login` | 登录并获取本地凭证 |
| `skb logout` | 登出并清除本地凭证 |
| `skb search <keyword>` | 搜索 Skill |
| `skb install <target>` | 安装 Skill，支持 `name@version` |
| `skb list` / `skb ls` | 浏览本地已记录的 Skill，并继续更新/删除/清记录 |
| `skb update <skill_id>` | 选择版本并更新本地安装目录 |
| `skb publish [directory]` | 发布当前目录或指定目录中的 Skill |
| `skb import-github <source>` | 从公开 GitHub 仓库导入 Skill（服务端拉取 zipball）；别名 `skb import` |

## 登录与凭证

### `skb login`

```bash
skb login
```

流程：

1. CLI 打开浏览器登录页
2. 登录后获取 8 位验证码
3. 回到终端输入验证码完成登录

本地凭证保存在 `~/.skill-base/credentials.json`。

### `skb logout`

```bash
skb logout
```

会清除本地登录凭证。

## 搜索与安装

### `skb search <keyword>`

```bash
skb search vue
skb search "react component"
```

### `skb install <target>`

```bash
skb install <skill_id>
skb install <skill_id>@<version>
```

参数：

- `target`：Skill ID，或 `skill_id@version`
- `-d, --dir <directory>`：直接安装到指定目录
- `-i, --ide <ide>`：按 IDE 规则自动选择目标目录
- `-g, --global`：安装到全局 IDE 配置目录，仅部分 IDE 支持

示例：

```bash
# 安装最新版
skb install vue-best-practices

# 安装指定版本
skb install vue-best-practices@v20260115.120000

# 安装到指定目录
skb install vue-best-practices -d ./my-skills

# 自动安装到当前项目的 IDE 目录
skb install team-vue-rules --ide cursor
skb install team-vue-rules --ide claude-code
skb install team-vue-rules --ide qoder
skb install team-vue-rules --ide opencode
skb install team-vue-rules --ide trae
skb install team-vue-rules --ide trae-cn
skb install team-vue-rules --ide copilot

# 安装到全局 IDE 目录
skb install git-commit-rules --ide cursor --global
```

当前内置支持的 IDE：

- `cursor`
- `claude-code`
- `copilot`
- `windsurf`
- `qoder`
- `qoderwork`
- `opencode`
- `trae`（项目：`<项目根>/.trae/skills`，全局：`~/.trae/skills`）
- `trae-cn`（项目：`<项目根>/.trae/skills`，全局：`~/.trae-cn/skills`）
- `openclaw`（`<项目根>/skills`，全局：`~/.openclaw/skills`）
- `codebuddy`（`<项目根>/.codebuddy/skills`，全局：`~/.codebuddy/skills`）
- `codex`（`<项目根>/.agents/skills`，全局：`~/.codex/skills`）
- `iflow-cli`（`<项目根>/.iflow/skills`，全局：`~/.iflow/skills`）
- `kilo`（`<项目根>/.kilocode/skills`，全局：`~/.kilocode/skills`）
- `kiro-cli`（`<项目根>/.kiro/skills`，全局：`~/.kiro/skills`）
- `pi`（`<项目根>/.pi/skills`，全局：`~/.pi/agent/skills`）
- `qwen-code`（`<项目根>/.qwen/skills`，全局：`~/.qwen/skills`）
- `roo`（`<项目根>/.roo/skills`，全局：`~/.roo/skills`）

若目标目录下已存在同名 Skill 文件夹，`skb install` 会先询问是否覆盖；确认后会删除旧目录再解压安装。

安装成功后，CLI 会把这些信息记录到本地：

- Skill ID
- 安装路径
- 当前版本
- 安装时间
- IDE 类型
- 是否为全局安装

这些记录会被 `skb list` 和 `skb update` 复用。

## 查看和管理本地安装

### `skb list`

```bash
skb list
skb ls
```

这个命令会按 Skill 聚合展示本地记录，并允许你继续做这些事情：

- 查看某个 Skill 当前记录的安装目录
- 进入更新流程
- 删除一个或多个本地安装目录，并同步删除记录
- 只清空记录，不删除磁盘文件

别小看这个命令。没有这层本地记录，所谓“批量更新”就是空话。

## 更新 Skill

### `skb update <skill_id>`

```bash
skb update <skill_id>
skb update <skill_id> -d <directory>
```

参数：

- `skill_id`：要更新的 Skill ID
- `-d, --dir <directory>`：显式指定父目录，直接更新 `<directory>/<skill_id>`，跳过本地记录

行为说明：

- `skb update <skill_id>` 会先拉取版本列表，让你选择目标版本
- 如果本地只记录了一个安装目录，CLI 会直接更新，不再多问一遍
- 如果记录了多个安装目录，CLI 会列出目录让你勾选，支持“全部目录”
- 如果这个 Skill 从未被新版 CLI 记录过，命令不会猜路径；要么先重新 `install` 一次，要么临时传 `-d`

示例：

```bash
skb update vue-best-practices
skb update vue-best-practices -d ./.cursor/skills
```

## 发布 Skill

### `skb publish [directory]`

```bash
skb publish
skb publish ./my-skill
```

参数：

- `[directory]`：Skill 目录路径，省略时默认当前目录
- `--name <name>`：显式指定 Skill 名称
- `--description <desc>`：显式指定 Skill 描述
- `--changelog <log>`：版本更新说明，默认是 `更新版本`

要求：

- 必须先登录
- 目录中必须包含 `SKILL.md`
- 目录名会作为 `skill_id`

示例：

```bash
# 发布当前目录
skb publish --changelog "补充接口鉴权规范"

# 发布指定目录
skb publish ./my-skill --changelog "修复提示词冲突"

# 显式覆盖名称和描述
skb publish ./my-skill --name "My Skill" --description "A useful skill"
```

## 从 GitHub 导入 Skill

### `skb import-github <source>`

```bash
skb import-github owner/repo
skb import https://github.com/owner/repo
skb import owner/repo --dry-run
skb import-github owner/repo --ref main --subpath packages/my-skill --target my-local-id
```

参数：

- `source`：`owner/repo` 或 `https://github.com/owner/repo`（也支持 `/tree/...` 指定分支与子路径）
- `--ref <ref>`：分支或 tag；省略时使用仓库默认分支
- `--subpath <path>`：monorepo 内 Skill 所在子目录
- `--target <skill_id>`：写入当前 Skill Base 的 skill id；省略时先用服务端预览：无冲突则用默认推导 id，有冲突则用建议的 `gh-owner-repo` 形式
- `--changelog <text>`：版本说明
- `--dry-run`：只请求预览接口并打印 JSON，不执行导入

要求：已登录；仓库需为**公开**（服务端拉取 zipball）。若目标 id 已被他人占用且无发布权限，CLI 会报错并在消息中附带 `suggested_skill_id` 提示。

## `SKILL.md` 解析规则

Skill Base 发布的是一个包含 `SKILL.md` 的目录。

如果你写了 frontmatter，CLI 和服务端会优先使用它；如果没写，则按下面的退化规则解析：

- `name`：取第一个 `#` 标题
- `description`：取标题后的第一段非空文本

最小示例：

```markdown
---
name: team-vue3-admin
description: "Internal Vue3 admin best practices. Triggers on requests to create Vue admin pages, use ProTable, ProForm, or internal request utilities."
---

# 内部 Vue3 管理后台最佳实践

研发一部的中后台规范，覆盖表单、表格、请求封装和时间格式化。
```

## 完整流程示例

### 首次接入

```bash
# 1. 配置服务地址
skb init -s http://your-team-server

# 2. 登录
skb login

# 3. 搜索并安装
skb search vue
skb install team-vue-rules --ide cursor

# 4. 后续统一更新
skb update team-vue-rules

# 5. 查看本地记录
skb list
```

### 发布并分发新版本

```bash
# 1. 修改本地 Skill
# 2. 发布新版本
skb publish ./my-awesome-skill --changelog "新增报表组件规范"

# 3. 其他同事更新本地安装目录
skb update my-awesome-skill
```

## 故障排除

### 登录失败

- 确认验证码格式正确
- 检查验证码是否已过期
- 确认服务地址配置正确

### 安装或更新失败

- 检查 Skill ID 是否拼写正确
- 确认当前账号有权限访问该 Skill
- 如果是历史手工安装目录，先重新 `skb install` 一次，或者临时使用 `-d`

### 发布失败

- 确认已先执行 `skb login`
- 确认目录包含 `SKILL.md`
- 检查目录名是否和预期的 `skill_id` 一致

## 系统要求

- Node.js >= 18
