# Skill Base

轻量级 AI Agent Skill 管理平台，支持 Web 端和命令行工具。

## 研发背景

在 AI 辅助开发日益普及的今天，我们发现一个普遍的痛点：**AI 生成的代码虽然能参考项目中已有的代码，但很多细节逻辑和团队约定往往会被遗漏。**

比如在管理后台项目中：
- 查询页的查询条件默认应该折叠还是展开？
- 机构下拉框的数据从哪个接口获取？
- 常见的时间范围查询应该调用哪些接口、如何处理返回数据？

这些细节分散在各个文件中，AI 难以完整捕捉。团队需要一个地方来**沉淀、完善和持续更新**这些知识，形成可复用的 Skills 或 AGENTS.md 文档，让 AI 在生成代码时能够遵循团队的最佳实践。

**Skill Base 正是为此而生** —— 帮助小团队快速搭建内部的 Skill 管理平台，让团队知识不再流失。

## 项目特点

- **开箱即用** - 只需 `npx skill-base -d ./data -p 3000` 一行命令即可启动服务
- **零配置部署** - 使用 SQLite 数据库，无需额外安装数据库服务
- **轻量级设计** - 专为小团队打造，部署简单、维护成本低
- **知识沉淀** - 方便团队持续积累和更新开发规范、最佳实践

## 功能特性

- **Skill 管理** - 搜索、安装、更新、发布 AI Agent Skills
- **版本控制** - 每个 Skill 支持多版本管理
- **协作者管理** - 支持多人协作维护 Skill
- **双端支持** - Web 界面 + CLI 命令行工具

## 快速开始

### 使用 npx 一键启动

```bash
# 直接运行（默认端口 8000）
npx skill-base

# 指定端口
npx skill-base -p 3000

# 仅本地访问
npx skill-base --host 127.0.0.1

# 指定数据目录（推荐，方便管理数据）
npx skill-base -d ./data

# 数据存储到当前目录
npx skill-base -d .
```

> **提示**：使用 `-d` 指定数据目录后，数据库和 Skills 文件会存储在指定路径，而非 npm 缓存目录。这样更方便数据备份和管理。

### Web 端使用

1. 访问平台首页，注册/登录账号
2. 浏览或搜索需要的 Skill
3. 点击 Skill 查看详情和历史版本
4. 点击下载按钮获取 Skill 文件
5. 拖入整个skill目录或者打包为zip包的skill即可完成发布/更新
6. 服务器压力极小

**发布 Skill：**
1. 登录后点击「发布」
2. 选择包含 `SKILL.md` 的文件夹
3. 填写版本说明后提交

### CLI 使用

安装 CLI 工具：

```bash
npm install -g skill-base-cli
```

配置服务器地址（默认 localhost:8000）：

```bash
export SKB_BASE_URL=https://your-server.com
```

常用命令：

```bash
# 登录
skb login

# 搜索 Skill
skb search vue

# 安装 Skill
skb install vue-best-practices
skb install vue-best-practices@v20260115.120000  # 指定版本
skb install vue-best-practices -d ./my-skills    # 指定目录

# 更新 Skill
skb update vue-best-practices

# 发布 Skill
skb publish ./my-skill --changelog "初始版本"

# 登出
skb logout
```

## 部署服务端

### 环境要求

- Node.js >= 18.0.0

### 本地运行

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 生产模式
npm start
```

### 初始化管理员账号

首次启动时，如果系统中还没有管理员账号，访问任何页面会自动跳转到初始化设置页面，请按提示设置管理员用户名和密码。

> **安全提示**：请妥善保管管理员凭据，建议使用强密码。

### Docker 部署

```bash
docker build -t skill-base .
docker run -p 8000:8000 -v ./data:/app/data skill-base
```

## 项目结构

```
skill-base/
├── cli/          # CLI 命令行工具
├── src/          # 服务端源码
├── static/       # Web 前端
├── data/         # 数据存储
└── docs/         # 文档
```

## 数据存储

### 数据目录结构

```
data/
├── skills.db          # SQLite 数据库
├── skills.db-wal      # WAL 日志
├── skills.db-shm      # 共享内存文件
└── <skill-id>/        # 每个 Skill 的 ZIP 文件
    ├── v20260326.120000.zip
    └── v20260326.150000.zip
```

### 删除数据

**方法 1：指定数据目录后删除**

```bash
# 启动时指定数据目录
npx skill-base -d ./my-data

# 删除数据（停止服务后）
rm -rf ./my-data
```

**方法 2：清理 npx 缓存（未指定 -d 时）**

```bash
npx clear-npx-cache
# 或手动删除
rm -rf ~/.npm/_npx/
```

## SKILL.md 规范

每个 Skill 必须包含 `SKILL.md` 文件，平台会自动解析：

- **name**: 第一个 `#` 标题
- **description**: 标题后的第一段文本

示例：

```markdown
# Vue Best Practices

Vue.js 开发最佳实践指南，包含组件设计、状态管理等内容。

## 使用方法

...
```

## License

MIT
