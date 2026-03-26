# Skill Base

轻量级 AI Agent Skill 管理平台，支持 Web 端和命令行工具。

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
```

### Web 端使用

1. 访问平台首页，注册/登录账号
2. 浏览或搜索需要的 Skill
3. 点击 Skill 查看详情和历史版本
4. 点击下载按钮获取 Skill 文件

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
