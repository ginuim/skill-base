# Skill Webhook 使用指南

Skill Base 支持为每个 Skill 配置一个出站 Webhook URL。当 Skill 发生重要变更时，服务端会**异步**向该 URL 发送 `POST` 请求（JSON 正文），便于接入飞书/钉钉机器人、CI 流水线、审计日志或自建通知服务。

> 字段定义与 API 错误码见 [API 文档 §7](api.md#7-skill-webhook-投递说明)。本文侧重**怎么用**和**怎么接**。

## 工作原理

```
┌─────────────┐     PUT webhook_url      ┌──────────────┐
│ Skill Owner │ ───────────────────────► │  Skill Base  │
│  (Web/API)  │                            │   Server     │
└─────────────┘                            └──────┬───────┘
                                                  │
                     发布 / 改元数据 / 删 Skill 等  │ 异步 POST JSON
                                                  ▼
                                           ┌──────────────┐
                                           │ 你的接收端   │
                                           │ (HTTP 服务)  │
                                           └──────────────┘
```

数据流要点：

1. `webhook_url` 存在 SQLite `skills` 表（`src/models/skill.js` 的 `update` 写入）。
2. 各业务路由在写库成功后调用 `notifySkillWebhook`（`src/utils/skill-webhook.js`）。
3. 投递是 **fire-and-forget**：失败不阻塞 API，**不重试**。

## 谁能配置

| 角色 | 查看 `webhook_url` | 修改 `webhook_url` |
|------|-------------------|-------------------|
| owner | 是 | 是 |
| admin | 是 | 是 |
| collaborator | 否 | 否 |
| 普通用户 / 未登录 | 否 | 否 |

协作者仍可发布新版本，Webhook 会照常触发，只是看不到 URL 本身。

## 配置方式

### Web UI

Skill 详情页 → **Webhook 通知** → 填入 `http(s)` URL → 保存。留空并保存可清除。

### API

```bash
# 需已登录（Session Cookie 或 PAT Bearer）
curl -X PUT "http://localhost:8000/api/v1/skills/my-skill" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PAT>" \
  -d '{"webhook_url": "http://127.0.0.1:8787/hooks/skill-base"}'
```

清空：

```json
{ "webhook_url": null }
```

**注意：** 仅修改 `webhook_url` 本身**不会**触发 Webhook。

## 触发时机与载荷

所有请求均为 `POST`，`Content-Type: application/json`。

### 公共字段

```json
{
  "event": "skill.updated",
  "skill_id": "my-skill",
  "timestamp": "2026-06-05T10:30:00.000Z",
  "actor": { "id": 1, "username": "alice" },
  "data": { }
}
```

| 字段 | 说明 |
|------|------|
| `event` | `skill.updated` 或 `skill.deleted` |
| `skill_id` | Skill ID |
| `timestamp` | ISO 8601 |
| `actor` | 触发用户；无用户信息时为 `null` |
| `data` | 事件详情，见下表 |

### `skill.updated` — `data.kind`

| `kind` | 触发操作 | `data` 额外字段 |
|--------|----------|----------------|
| `metadata` | PUT `/skills/:id` 且 `name`、`description` 或 `visibility` 有变化 | `name`, `description` |
| `version_published` | POST `/skills/publish` 或 GitHub 导入成功 | `version`, `created_at` |
| `head` | PUT `/skills/:id/head` | `latest_version` |
| `version_metadata` | PATCH `/skills/:id/versions/:version` | `version` |

`metadata` 示例（改名）：

```json
{
  "event": "skill.updated",
  "skill_id": "code-review",
  "timestamp": "2026-06-05T10:30:00.000Z",
  "actor": { "id": 1, "username": "alice" },
  "data": {
    "kind": "metadata",
    "name": "Code Review v2",
    "description": "团队 PR 审查规范"
  }
}
```

`version_published` 示例：

```json
{
  "event": "skill.updated",
  "skill_id": "code-review",
  "timestamp": "2026-06-05T10:31:00.000Z",
  "actor": { "id": 2, "username": "bob" },
  "data": {
    "kind": "version_published",
    "version": "v20260605.103100",
    "created_at": "2026-06-05 10:31:00"
  }
}
```

### `skill.deleted`

DELETE `/skills/:id` 在数据库删除成功后投递：

```json
{
  "event": "skill.deleted",
  "skill_id": "code-review",
  "timestamp": "2026-06-05T11:00:00.000Z",
  "actor": { "id": 1, "username": "alice" },
  "data": {
    "name": "Code Review v2",
    "versions_count": 5
  }
}
```

## 安全与网络限制

写入时校验 URL 格式（仅 `http`/`https`，最长 2048 字符）。发送时使用已校验的 DNS 结果建立连接，且不跟随重定向：

| 目标 | 是否允许 |
|------|----------|
| `localhost` / `127.0.0.1` / `::1` | 默认拒绝。本地调试可设置 `SKILL_BASE_WEBHOOK_ALLOW_LOOPBACK=true` |
| 公网 `https://` | 允许 |
| `10.x` / `192.168.x` / `172.16–31.x` | **拒绝** |
| `169.254.169.254` 等元数据地址 | **拒绝** |

生产环境建议用公网 HTTPS 端点；内网集成请通过反向代理或隧道暴露接收端。

设置 `SKILL_BASE_WEBHOOK_SIGNING_SECRET` 后，投递附带 `X-SkillBase-Signature: sha256=<hex>`。签名使用实例密钥对原始请求体计算 HMAC-SHA256。接收端应校验时间戳和预期的技能 ID。

环境变量 `SKILL_BASE_WEBHOOK_TIMEOUT_MS` 控制单次投递超时（默认 `10000`，上限 `60000`）。详见 [部署文档](deployment.md)。

## 本地 Demo

仓库自带最小接收端，见 [`examples/webhook-receiver`](../../examples/webhook-receiver/README.md)。

快速试跑：

```bash
# 终端 1：启动接收端
node examples/webhook-receiver/server.js

# 终端 2：启动 Skill Base（若尚未运行）
SKILL_BASE_WEBHOOK_ALLOW_LOOPBACK=true npx skill-base -p 8000

# 终端 3：配置 Webhook 并触发（替换 skill_id 与 PAT）
curl -X PUT "http://localhost:8000/api/v1/skills/<skill_id>" \
  -H "Authorization: Bearer <PAT>" \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "http://127.0.0.1:8787/hooks/skill-base"}'

# 改个名字触发 metadata 事件
curl -X PUT "http://localhost:8000/api/v1/skills/<skill_id>" \
  -H "Authorization: Bearer <PAT>" \
  -H "Content-Type: application/json" \
  -d '{"name": "新名称"}'
```

终端 1 会打印收到的 JSON。

## 接入建议

1. **快速返回 2xx** — 服务端不等待业务处理完成；耗时逻辑放队列。
2. **幂等** — 无重试，但同一操作只发一次；仍建议用 `skill_id` + `event` + `timestamp` 去重。
3. **不要依赖顺序** — 异步投递，多事件可能乱序到达。
4. **鉴权** — 平台不签名 payload；接收端应自行校验（固定 path token、IP 白名单、反向代理 mTLS 等）。
5. **按 `data.kind` 分支** — 例如 `version_published` 触发 CI 拉取，`skill.deleted` 清理下游缓存。

### 飞书机器人示例（伪代码）

```javascript
// 收到 webhook 后转成飞书文本
function toFeishuText(payload) {
  const { event, skill_id, actor, data } = payload;
  if (event === 'skill.updated' && data.kind === 'version_published') {
    return `[Skill Base] ${actor?.username} 发布了 ${skill_id} ${data.version}`;
  }
  if (event === 'skill.deleted') {
    return `[Skill Base] ${actor?.username} 删除了 ${data.name}（${data.versions_count} 个版本）`;
  }
  return `[Skill Base] ${skill_id} ${event} ${data.kind || ''}`;
}
// POST 到飞书自定义机器人 webhook URL
```

## 常见问题

**Q: Webhook 没收到？**
检查 URL 是否公网可达（或本机 `127.0.0.1`）、接收端是否返回 2xx、Skill 是否已保存非空 `webhook_url`、触发的是否为支持的操作（仅改 webhook 不算）。

**Q: 协作者发布版本会通知吗？**
会。`actor` 为实际发布者。

**Q: 下载 / 收藏会触发吗？**
不会。仅元数据变更、版本发布、Head 切换、版本说明修改、删除。

**Q: 能否配置多个 URL？**
当前每个 Skill 仅支持一个 `webhook_url`。多下游请在接收端转发。
