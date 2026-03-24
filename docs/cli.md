# Skill Base CLI 使用说明

Skill Base CLI 是 Skill Base 平台的命令行管理工具，用于搜索、安装、更新和发布 Skill。

## 安装

```bash
npm install -g skill-base-cli
```

或者使用 npx：

```bash
npx skill-base-cli <command>
```

## 环境配置

CLI 默认连接 `http://localhost:8000`，可通过环境变量修改：

```bash
export SKB_BASE_URL=https://api.example.com
```

## 命令概览

| 命令 | 描述 |
|------|------|
| `skb login` | 登录获取访问令牌 |
| `skb logout` | 登出并清除本地凭证 |
| `skb search <keyword>` | 搜索 Skill |
| `skb install <target>` | 安装 Skill |
| `skb update <skill_id>` | 更新 Skill 到最新版本 |
| `skb publish <directory>` | 发布新版本 |

---

## 认证命令

### login

登录并获取 CLI 访问令牌。

```bash
skb login
```

**流程：**
1. 在浏览器中打开登录页面
2. 登录后获取 8 位 CLI 验证码（格式：XXXX-XXXX）
3. 在终端输入验证码完成登录

**凭证存储：**
登录凭证保存在 `~/.skill-base/credentials.json`

### logout

登出并删除本地凭证。

```bash
skb logout
```

---

## Skill 管理命令

### search

搜索 Skill。

```bash
skb search <keyword>
```

**示例：**
```bash
skb search vue
skb search "react component"
```

### install

安装指定 Skill。

```bash
skb install <skill_id>
skb install <skill_id>@<version>
```

**参数：**
- `target` - Skill ID 或 `skill_id@version` 格式
- `-d, --dir <directory>` - 指定解压目标目录（默认为当前目录）

**示例：**
```bash
# 安装最新版本
skb install vue-best-practices

# 安装指定版本
skb install vue-best-practices@v20260115.120000

# 安装到指定目录
skb install vue-best-practices -d ./my-skills
```

### update

更新 Skill 到最新版本。

```bash
skb update <skill_id>
```

**参数：**
- `skill_id` - Skill ID
- `-d, --dir <directory>` - 指定解压目标目录（默认为当前目录）

**示例：**
```bash
skb update vue-best-practices
skb update vue-best-practices -d ./my-skills
```

---

## 发布命令

### publish

发布 Skill 新版本。

```bash
skb publish <directory>
```

**参数：**
- `directory` - Skill 文件夹路径
- `--name <name>` - Skill 名称（默认从 SKILL.md 提取）
- `--description <desc>` - Skill 描述（默认从 SKILL.md 提取）
- `--changelog <log>` - 版本变更日志（默认："更新版本"）

**要求：**
- 必须先登录
- 目录必须包含 `SKILL.md` 文件
- 文件夹名称将作为 `skill_id`

**示例：**
```bash
# 基本发布
skb publish ./my-skill

# 指定名称和描述
skb publish ./my-skill --name "My Skill" --description "A useful skill"

# 添加变更日志
skb publish ./my-skill --changelog "修复 bug，优化性能"
```

**SKILL.md 解析规则：**
- `name`：取第一个 `#` 标题
- `description`：取标题后的第一段非空文本（前 200 字符）

---

## 完整使用示例

### 首次使用

```bash
# 1. 登录
skb login

# 2. 搜索需要的 Skill
skb search vue

# 3. 安装
skb install vue-best-practices

# 4. 查看已安装的 Skill
ls vue-best-practices/
```

### 发布自己的 Skill

```bash
# 1. 创建 Skill 目录
mkdir my-awesome-skill
cd my-awesome-skill

# 2. 编写 SKILL.md
cat > SKILL.md << 'EOF'
# My Awesome Skill

这是一个非常有用的 Skill，可以帮助你...

## 使用方法

...
EOF

# 3. 添加其他文件
# ...

# 4. 返回上级目录并发布
cd ..
skb publish ./my-awesome-skill --changelog "初始版本"
```

---

## 故障排除

### 登录失败
- 确认验证码格式正确（8位，如 `8A2B-9C4F`）
- 检查验证码是否已过期
- 确认 `SKB_BASE_URL` 配置正确

### 安装/更新失败
- 检查网络连接
- 确认 Skill ID 拼写正确
- 确认有权限访问该 Skill

### 发布失败
- 确认已登录：`skb login`
- 确认目录包含 `SKILL.md`
- 检查 Skill ID 是否已被他人使用

---

## 系统要求

- Node.js >= 18.0.0
