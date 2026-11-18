# Skill Webhook Guide

Skill Base can POST JSON to a per-Skill webhook URL when important changes occur—useful for chat bots, CI, audit logs, or custom integrations.

> Field definitions and API error codes: [API §7](api.md#7-skill-webhook-delivery). This guide focuses on **setup** and **integration**.

## How it works

1. `webhook_url` is stored on the `skills` row (`src/models/skill.js`).
2. Routes call `notifySkillWebhook` after a successful write (`src/utils/skill-webhook.js`).
3. Delivery is **async fire-and-forget**: failures do not block the API and are **not retried**.

## Who can configure

| Role | View `webhook_url` | Edit `webhook_url` |
|------|-------------------|-------------------|
| owner | yes | yes |
| admin | yes | yes |
| collaborator | no | no |
| others | no | no |

Collaborators can still publish versions; webhooks fire with them as `actor`.

## Configuration

### Web UI

Skill detail → **Webhook** → enter `http(s)` URL → Save. Save empty to clear.

### API

```bash
curl -X PUT "http://localhost:8000/api/v1/skills/my-skill" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <PAT>" \
  -d '{"webhook_url": "http://127.0.0.1:8787/hooks/skill-base"}'
```

Changing `webhook_url` alone does **not** emit a webhook.

## Payload reference

All deliveries: `POST`, `Content-Type: application/json`.

### Envelope

```json
{
  "event": "skill.updated | skill.deleted",
  "skill_id": "string",
  "timestamp": "ISO8601",
  "actor": { "id": 1, "username": "string" },
  "data": {}
}
```

### `skill.updated` — `data.kind`

| `kind` | Trigger | Extra `data` fields |
|--------|---------|---------------------|
| `metadata` | PUT skill when `name`, `description`, or `visibility` changes | `name`, `description` |
| `version_published` | POST publish or GitHub import | `version`, `created_at` |
| `head` | PUT head pointer | `latest_version` |
| `version_metadata` | PATCH version notes/changelog | `version` |

### `skill.deleted`

After DB delete: `data.name`, `data.versions_count`.

## Security

- Write-time: `http`/`https` only, max 2048 chars.
- Delivery uses the checked DNS results for the connection and does not follow redirects. Non-public addresses are blocked. For local development only, `SKILL_BASE_WEBHOOK_ALLOW_LOOPBACK=true` permits loopback delivery.
- Set `SKILL_BASE_WEBHOOK_SIGNING_SECRET` to add `X-SkillBase-Signature: sha256=<hex>`, an HMAC-SHA256 of the raw request body using the instance secret. Receivers should also verify the timestamp and expected skill ID.
- Timeout: `SKILL_BASE_WEBHOOK_TIMEOUT_MS` (default `10000`, max `60000`). See [deployment](deployment.md).

## Local demo

See [`examples/webhook-receiver`](../examples/webhook-receiver/README.md):

```bash
node examples/webhook-receiver/server.js
# Point skill webhook_url to http://127.0.0.1:8787/hooks/skill-base
```

## Integration tips

1. Respond with **2xx** quickly; do heavy work in a queue.
2. Treat deliveries as **at-most-once** (no retries).
3. **Authenticate** yourself—payloads are unsigned.
4. Branch on `data.kind` for automation vs. notifications.

Chinese guide: [docs/zh/webhook.md](zh/webhook.md)
