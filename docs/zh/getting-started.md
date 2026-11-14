# 快速开始

[English](../getting-started.md) | **中文**

需要 Node.js >= 18。服务端使用 `node-sqlite3-wasm` 访问 SQLite，日常启动不依赖本地编译 `better-sqlite3`。

## 1. 启动服务端

```bash
npx skill-base -d ./skill-data -p 8000
```

首次访问 Web 会进入初始化流程，按提示创建管理员账号。

其他常用启动方式：

```bash
npx skill-base
npx skill-base --host 127.0.0.1
npx skill-base --base-path /skills/
npx skill-base --cache-max-mb 100
npx skill-base --session-store sqlite
```

启动参数与环境变量见 [部署与备份](deployment.md)。

## 2. 安装 CLI

```bash
pnpm add -g skill-base-cli
```

也可直接用 `npx skill-base-cli`，不必全局安装。

## 3. 配置服务地址

```bash
skb init -s http://your-team-server
```

填写站点根 URL（不要带 `/api` 后缀），配置写入 `~/.skill-base/config.json`。需要同时使用多个服务（如生产和 QA）时，可使用命名配置，见 [CLI › 多环境](cli.md#多环境profile)。

**发布**需要登录；搜索和安装通常不需要：

```bash
skb login
skb whoami          # 确认 token；支持 --json / -q 参数
```

## 4. 安装、更新、发布

```bash
skb search vue
skb install vue-best-practices
skb install vue-best-practices@v20260115
skb install vue-best-practices -d ./.cursor/skills
skb install team-vue-rules --ide cursor
skb install git-commit-rules --ide cursor --global
skb list
skb update team-vue-rules
skb publish ./my-skill --changelog "补充接口鉴权规范"
```

`--ide` 支持 Cursor、Claude Code、GitHub Copilot、Windsurf、Qoder、QoderWork、OpenCode 等。

完整命令：[CLI](cli.md)

## 适合什么样的团队

- 团队里不只一种 AI IDE
- Skill 要在多个项目间复用
- 规范常变，需要版本历史
- PM、QA、运营也要直接消费 Skill
- 不想为小平台维护重型基础设施

## 下一步

- [使用说明](usage.md) — Web 端、GitHub 导入、OpenClaw、Skill 格式
- [部署与备份](deployment.md) — Docker、PM2、Session、备份
- [桌面客户端](desktop.md) — 下载与功能
- [架构与设计](architecture.md) — 为什么栈长这样
