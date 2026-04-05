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

# 查看和管理本地已安装 Skill
skb list
skb ls

# 交互式更新 Skill
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

# 4. 查看和管理本地已安装 Skill
skb list

# 5. 交互式选择版本和目录进行更新
skb update vue-best-practices

# 6. 发布自己的 Skill
skb publish ./my-skill --changelog "初始版本"
```

## 更新行为

- `skb install` 会记录 Skill 实际安装到的目录，供后续 `skb update` 使用
- `skb list` / `skb ls` 会列出本地所有已记录 Skill，并允许继续执行更新、删除本地文件、清除配置记录
- `skb update <skill_id>` 会先列出版本、changelog、提交人，再列出该 Skill 已记录的安装目录供多选
- 如果要绕过本地记录，也可以继续使用 `skb update <skill_id> -d <directory>`

## 发布要求

- 目录必须包含 `SKILL.md` 文件
- 文件夹名称将作为 `skill_id`
- `name` 和 `description` 可从 SKILL.md 自动提取

## 系统要求

- Node.js >= 18.0.0

## License

MIT
