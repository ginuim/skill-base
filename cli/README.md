# Skill Base CLI

命令行工具，用于搜索、安装、更新和发布 AI Agent Skills。

## 安装

```bash
npm install -g skill-base-cli
```

或使用 npx 直接运行：

```bash
npx skill-base-cli <command>
```

## 环境配置

CLI 默认连接 `http://localhost:8000`，可通过环境变量修改：

```bash
export SKB_BASE_URL=https://your-skill-base-server.com
```

## 命令

### 认证

```bash
# 登录
skb login

# 登出
skb logout
```

### Skill 管理

```bash
# 搜索 Skill
skb search <keyword>

# 安装 Skill
skb install <skill_id>
skb install <skill_id>@<version>
skb install <skill_id> -d ./target-dir

# 更新 Skill
skb update <skill_id>
skb update <skill_id> -d ./target-dir

# 发布 Skill
skb publish <directory>
skb publish <directory> --name "Skill Name" --description "Description"
skb publish <directory> --changelog "版本说明"
```

## 快速开始

```bash
# 1. 登录
skb login

# 2. 搜索
skb search vue

# 3. 安装
skb install vue-best-practices

# 4. 发布自己的 Skill
skb publish ./my-skill --changelog "初始版本"
```

## 发布要求

- 目录必须包含 `SKILL.md` 文件
- 文件夹名称将作为 `skill_id`
- `name` 和 `description` 可从 SKILL.md 自动提取

## 系统要求

- Node.js >= 18.0.0

## License

MIT
