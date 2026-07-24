# Skill Base CLI

**语言:** [English](README.md) | 中文

`skb` 是 Skill Base 的官方命令行客户端，用来搜索、安装、更新和发布团队 Skill。

它真正有价值的地方，不是“能下载文件”，而是会记住 Skill 被装到了哪些 IDE 目录里，后续可以继续批量更新、删除和清理记录。

完整文档：[docs/zh/cli.md](../docs/zh/cli.md)

## 安装

```bash
pnpm add -g skill-base-cli
```

或使用 npx 直接运行：

```bash
npx skill-base-cli <command>
```

## 环境配置

CLI 默认连接 `http://localhost:8000`。推荐先执行一次初始化，把服务地址写入本地配置：

```bash
skb init -s https://your-skill-base-server.com
```

也可以用环境变量覆盖：

```bash
export SKB_BASE_URL=https://your-skill-base-server.com
```

## 命令概览

| 命令 | 说明 |
|------|------|
| `skb init` | 初始化 CLI 配置，设置服务地址 |
| `skb login` | 登录并获取本地凭证 |
| `skb logout` | 登出并清除本地凭证 |
| `skb whoami` | 检查本地是否有令牌，并请求服务器校验登录是否仍有效 |
| `skb search <keyword>` | 搜索 Skill |
| `skb install <target>` | 安装 Skill（`name@version`）或集合（`--collection`） |
| `skb list` / `skb ls` | 浏览本地已记录的 Skill，并继续更新/删除/清记录 |
| `skb delete <skill_id>` / `skb rm` | 删除一个或多个本地安装目录，并同步清理记录 |
| `skb update <skill_id>` | 选择版本并更新本地安装目录 |
| `skb publish [directory]` | 发布当前目录或指定目录中的 Skill |
| `skb import-github <source>` | 从公开 GitHub 仓库导入 Skill；别名 `skb import` |
| `skb ui` | 启动本地 Web 界面（默认 `127.0.0.1:9847`） |

## 登录与凭证

```bash
skb login    # 浏览器登录 + 验证码 → PAT 保存在 ~/.skill-base/credentials.json
skb logout
skb whoami   # -q 仅退出码；--json 供脚本使用
```

`publish` 和 `import-github` 需要先登录。搜索、安装、更新、列表等读操作通常不需要登录。

## 搜索与安装

```bash
skb search vue

# 单个 Skill
skb install vue-best-practices
skb install vue-best-practices@v20260115.120000
skb install team-vue-rules --ide cursor
skb install git-commit-rules --ide cursor --global
skb install vue-best-practices -d ./my-skills

# 集合（管理员维护的推荐包；一次下载 zip 并安装全部成员 Skill）
skb install --collection 1 --ide cursor
skb install --collection frontend-team --ide cursor
```

参数：

- `target`：Skill ID，或 `skill_id@version`（与 `--collection` 二选一）
- `--collection <id_or_slug>`：安装集合内全部 Skill
- `-d, --dir <directory>`：直接安装到指定目录
- `-i, --ide <agent>`：按 IDE 规则自动选择目标目录（别名 `-a, --agent`）
- `-g, --global`：安装到全局 IDE 配置目录，仅部分 IDE 支持

常见 IDE：`cursor`、`claude-code`、`codex`、`copilot`、`windsurf`、`qoder`、`opencode`、`trae`、`openclaw`、`codebuddy`、`workbuddy` 等 — 运行 `skb install --help` 查看完整列表。

若目标目录下已存在同名 Skill 文件夹，`skb install` 会先询问是否覆盖。安装集合时，若存在多个冲突路径，会一次性列出并询问是否全部覆盖；取消则不会安装任何 Skill。

安装成功后，CLI 会把 Skill ID、路径、版本、时间、IDE 类型、是否全局安装记录到 `~/.skill-base/config.json`，供 `list` 和 `update` 复用。

## 查看和管理本地安装

```bash
skb list
skb ls

skb delete <skill_id>
skb rm <skill_id>
skb delete <skill_id> --all
skb delete <skill_id> -d ./target-dir -y
```

- `list` / `ls`：按 Skill 聚合展示（最近安装/更新的在前）；可继续更新、删除本地文件、或只清记录
- `delete`：多选已记录安装目录，或 `--all` / `-d` / `-y` 供脚本使用；只会删除目录名与 `skill_id` 一致的路径

## 更新

```bash
skb update vue-best-practices
skb update vue-best-practices -d ./.cursor/skills
```

- 先列出版本、changelog 和提交人，再多选安装目录（仅一条记录时直接更新）
- `-d` 跳过本地记录，直接更新 `<directory>/<skill_id>`
- 若从未被 CLI 记录过，需重新 `install` 或临时传 `-d`

## 发布

```bash
skb publish ./my-skill --changelog "初始版本"
skb publish --name "My Skill" --description "A useful skill"
```

要求：已登录；目录包含 `SKILL.md`；文件夹名作为 `skill_id`。名称和描述可从 frontmatter 自动解析。

## 从 GitHub 导入

```bash
skb import-github owner/repo
skb import https://github.com/owner/repo
skb import owner/repo --ref main --subpath packages/my-skill --target my-local-id --dry-run
```

需要登录；仓库须为**公开**（服务端拉取 zipball）。

## 本地 Web UI

```bash
skb ui
skb ui --port 9000 --no-open
skb ui --host 0.0.0.0   # 监听所有网卡，注意局域网暴露风险
```

请求经本机进程代理到已配置的 Skill Base，并自动带上登录 PAT。安装目标选「当前目录」时，Skill 解压到**启动 `skb ui` 时的当前目录**。

## 快速开始

```bash
skb init -s http://your-team-server
skb login
skb search vue
skb install team-vue-rules --ide cursor
skb install --collection frontend-team --ide cursor
skb list
skb update team-vue-rules
skb publish ./my-skill --changelog "初始版本"
```

## 发布要求

- 目录必须包含 `SKILL.md` 文件
- 文件夹名称将作为 `skill_id`
- `name` 和 `description` 可从 `SKILL.md` frontmatter 自动提取；未写 frontmatter 时，取第一个 `#` 标题和其后第一段文本

## 系统要求

- Node.js >= 18.0.0

## License

MIT
