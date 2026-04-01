---
name: skill-base-web-deploy
description: >-
  skill base 服务端部署指南。包含启动 Skill Base 服务端端 (npx skill-base)、Docker 配置、端口映射及 SQLite 数据库备份。仅限部署和运维 Skill Base 平台本身时使用。
keywords:
  - 部署 skill-base
  - npx skill-base
  - skill-base docker
---

# Skill Base Web 服务端部署

此技能用于指导 Skill Base 平台服务端的搭建与运维。环境要求 Node.js >= 18。

## 何时使用此技能
- 用户要求私有化部署、托管、或运行 Skill Base 服务端 (`npx skill-base` 或 Docker)。
- 用户询问 Skill Base 服务端本身的主机/端口配置 (`-h`, `-p`)、数据目录 (`-d`) 或如何备份数据库。

## 何时不使用此技能
- 用户想使用 `skb` 命令来搜索、安装、发布具体的技能时（请转用 `skill-base-cli`）。
- 用户询问其他非 Skill Base 项目的 Docker、端口或数据库配置时（避免误用）。

## 最简启动（npm 包）

```bash
# 推荐：固定数据目录，便于备份与迁移
npx skill-base -d ./skill-data -p 8000
```

默认端口 **8000**；未指定 `-d` 时数据落在 npm 缓存相关路径，生产环境务必用 **`-d`** 指向明确目录。

## 启动参数（`npx skill-base`）

| 选项 | 说明 |
|------|------|
| `-p`, `--port` | 监听端口，默认 8000 |
| `-h`, `--host` | 监听地址，默认 `0.0.0.0`（表示监听所有本地网卡/IPv4 地址，内外网都能访问，若只想本机访问可设为 `127.0.0.1`） |
| `-d`, `--data-dir` | 数据根目录；会设置 `DATA_DIR` 与 `DATABASE_PATH=<dir>/skills.db` |

内网或本机加固示例：`npx skill-base --host 127.0.0.1 -p 8000 -d ./data`

## 首次访问

无管理员时，浏览器打开站点会进入**初始化向导**：创建系统管理员账号与密码。之后团队成员添加时需要管理员新建账号，用户登录使用 Web 与 CLI。

## 从源码目录开发/生产运行

```bash
pnpm install
pnpm start
# 或开发：`pnpm dev`
```

## Docker（生产推荐）

在**包含 Dockerfile 的仓库根目录**构建：

```bash
docker build -t skill-base .
```

镜像内约定：`DATA_DIR=/data`，`DATABASE_PATH=/data/skills.db`，`PORT=8000`。宿主机持久化应挂载到容器内 **`/data`**：

```bash
docker run -d -p 8000:8000 -v "$(pwd)/data:/data" --name skill-base-server skill-base
```

若需改端口，同时映射宿主与容器端口并设置 `PORT`，例如 `-p 3000:3000 -e PORT=3000`。

## 数据目录结构（备份）

指定 `-d` 或挂载 `/data` 后，典型内容：

```text
data/
├── skills.db
├── skills.db-wal
└── skills/
    └── <skill-id>/
        └── vYYYYMMDD.HHmmss.zip
```

备份：停写或低峰复制整个数据目录即可。

## 排障要点

- **端口**：防火墙/安全组放行 `PORT`；云主机需放行对应入站。
- **CLI 连不上**：客户端 `skb init --server <根 URL>`（无 `/api`）；检查站点是否可从该机器访问。
- **权限**：`-d` 路径需进程可读写；Docker 卷注意宿主目录权限。

## 与 `skill-base-cli` 的关系

部署好 Web 后，用户在客户端用 **`skb`** 指向同一站点根 URL；详见项目内 `skill-base-cli` skill。
