# Skill Base API

**English** | [中文](zh/api.md)

## Basics

| Item | Description |
|------|-------------|
| Base URL | `http://localhost:8000` |
| API prefix | `/api/v1` |
| Request format | JSON |
| File upload | `multipart/form-data` |

## Authentication

- **Session Cookie**: `session_id` cookie set automatically after login
- **PAT (Personal Access Token)**: obtained via the CLI verification-code flow

---

## Auth module `/api/v1/auth`

### 1. User login

**POST** `/api/v1/auth/login`

Log in and create a session.

**Request body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "ok": true,
  "user": {
    "id": "string",
    "username": "string",
    "role": "string"
  }
}
```

**Error codes:**
- `400` - Username and password are required
- `401` - Invalid username or password

---

### 2. User logout

**POST** `/api/v1/auth/logout`

Log out and clear the session.

**Response:**
```json
{
  "ok": true
}
```

---

### 3. Generate CLI verification code

**POST** `/api/v1/auth/cli-code/generate`

Generate a temporary verification code for CLI login (valid for 5 minutes).

**Auth:** Session required

**Response:**
```json
{
  "ok": true,
  "code": "string",
  "expires_at": "2026-03-24T12:00:00.000Z"
}
```

---

### 4. Verify CLI verification code

**POST** `/api/v1/auth/cli-code/verify`

Verify the CLI code and issue a PAT.

**Request body:**
```json
{
  "code": "string"
}
```

**Response:**
```json
{
  "ok": true,
  "token": "string",
  "user": {
    "id": "string",
    "username": "string"
  }
}
```

**Error codes:**
- `400` - Verification code is required
- `401` - Invalid or expired verification code

---

### 5. Get current user

**GET** `/api/v1/auth/me`

Get the currently logged-in user.

**Auth:** Requires an authenticated identity (browser **Session Cookie**, or **`Authorization: Bearer <PAT>`** for CLI / API calls)

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "role": "string",
  "is_super_admin": 0
}
```

`is_super_admin` is `1` for a **super admin** (first migrated admin or the first admin created during initialization), used to ensure at least one super admin remains. The global tag library is maintained by any **admin** (`role === 'admin'`); all admins can create/rename/delete global tags and assign tags to Skills they manage.

---

## Skill module `/api/v1/skills`

### 1. List Skills

**GET** `/api/v1/skills`

List all Skills with optional search.

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Optional search keyword |
| `visibility` | string | Optional, `public` or `private`; filter by visibility |

**Response:**
```json
{
  "skills": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "latest_version": "string",
      "owner": {
        "id": "string",
        "username": "string"
      },
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "total": 0
}
```

---

### 2. Get a Skill

**GET** `/api/v1/skills/:skill_id`

Get details for a specific Skill.

**Path parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `skill_id` | string | Skill ID |

**Response:**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "latest_version": "string",
  "owner": {
    "id": "string",
    "username": "string"
  },
  "created_at": "string",
  "updated_at": "string"
}
```

**Error codes:**
- `404` - Skill not found

---

### 3. List Skill versions

**GET** `/api/v1/skills/:skill_id/versions`

List all versions of a Skill.

**Path parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `skill_id` | string | Skill ID |

**Response:**
```json
{
  "skill_id": "string",
  "versions": [
    {
      "id": "string",
      "skill_id": "string",
      "version": "string",
      "changelog": "string",
      "zip_path": "string",
      "uploader": {
        "id": "string",
        "username": "string"
      },
      "created_at": "string"
    }
  ]
}
```

**Error codes:**
- `404` - Skill not found

---

### 4. Download version file

**GET** `/api/v1/skills/:skill_id/versions/:version/download`

Download the ZIP file for a specific version.

**Path parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `skill_id` | string | Skill ID |
| `version` | string | Version number; use `latest` for the newest version |

**Response:** ZIP file stream (`Content-Type: application/zip`)

**Error codes:**
- `404` - Version not found

---

### 5. Preview version ZIP (no download count)

**GET** `/api/v1/skills/:skill_id/versions/:version/view`

Returns the same ZIP binary as **download**, but does **not** increment Skill or version download statistics. Suitable for inline preview in the Web UI.

**Path parameters:** Same as **Download version file**; `version` may be `latest`.

**Response:** ZIP file stream (`Content-Type: application/zip`)

**Error codes:**
- `404` - Version not found

---

### 6. Update Skill metadata

**PUT** `/api/v1/skills/:skill_id`

Update name, description, and optionally **Webhook URL** (for server notifications on Skill changes).

**Auth:** Session required; updating `name` / `description` requires manage permission on the Skill. Updating `webhook_url` is allowed only for the **owner or an admin**.

**Request body (JSON; all fields optional; omitted fields are not changed):**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Skill name |
| `description` | string | Skill description |
| `visibility` | string | `public` or `private` |
| `webhook_url` | string \| null | `http` or `https` URL, max 2048 chars; `null` or empty string clears it |

**Response:** Same shape as **GET** `/api/v1/skills/:skill_id`. `webhook_url` is returned in JSON only when the caller is the **owner or an admin**; collaborators and regular visitors do not receive this field.

**Error codes:**
- `400` - Invalid `webhook_url` (not http(s))
- `403` - Insufficient permissions
- `404` - Skill not found

---

### 7. Skill Webhook delivery

> Setup, examples, and local demo: [Webhook guide](webhook.md) · [中文](zh/webhook.md).

When a Skill has a non-empty `webhook_url`, the server **asynchronously** sends **POST** requests to that URL with `Content-Type: application/json` at the times below. Request failures (timeout, non-2xx, etc.) do **not** affect the main API flow and are not retried. Before sending, minimal target validation runs: `localhost` / `127.0.0.1` / `::1` are allowed; private networks, link-local addresses, and common cloud metadata endpoints are rejected.

**Environment variable:** `SKILL_BASE_WEBHOOK_TIMEOUT_MS` — per-delivery timeout in milliseconds, default `10000`, max `60000`.

**Request body structure:**

```json
{
  "event": "skill.updated | skill.deleted",
  "skill_id": "string",
  "timestamp": "ISO8601",
  "actor": { "id": 1, "username": "string" },
  "data": {}
}
```

`actor` is `null` when no user context is available.

**`event`: `skill.updated`** — triggered in the following cases; `data` includes `kind` to distinguish scenarios:

| `data.kind` | Triggering operation |
|-------------|----------------------|
| `metadata` | **PUT** `/api/v1/skills/:skill_id` when `name` or `description` changed from prior values |
| `version_published` | **POST** `/api/v1/skills/publish` or successful GitHub import writing a new version; `data` includes `version`, `created_at` |
| `head` | **PUT** `/api/v1/skills/:skill_id/head` changing the latest-version pointer; `data` includes `latest_version` |
| `version_metadata` | **PATCH** `/api/v1/skills/:skill_id/versions/:version` changing version notes or changelog; `data` includes `version` |

**`event`: `skill.deleted`** — **DELETE** `/api/v1/skills/:skill_id` after successful database deletion; `data` includes pre-delete `name`, `versions_count`.

Changing `webhook_url` alone does **not** trigger a Webhook.

---

### 8. Favorite / unfavorite Skill

**POST** `/api/v1/skills/:skill_id/favorite` — current user favorites the Skill (idempotent).

**DELETE** `/api/v1/skills/:skill_id/favorite` — remove favorite (idempotent).

**Auth:** Session required.

**Response example:**
```json
{
  "ok": true,
  "skill_id": "string",
  "favorited": true,
  "favorite_count": 0
}
```

**Error codes:**
- `404` - Skill not found

---

### 9. Replace Skill tags

**PUT** `/api/v1/skills/:skill_id/tags`

**Replace entirely** the Skill's tags with a list of global tag IDs (not incremental).

**Auth:** Session required; caller must be the Skill **owner, collaborator, or platform admin** (`canManageSkill`).

**Request body:**
```json
{
  "tag_ids": [1, 2, 3]
}
```

**Response:** `{ "ok": true, "skill_id": "string", "tags": [ { "id": 1, "name": "string" } ] }`

**Error codes:**
- `400` - `tag_ids` is not an array
- `403` - Insufficient permissions
- `404` - Skill not found

---

### 10. Skill screenshots

Each Skill can optionally carry a set of screenshots (App Store style). Files live under `data/skills/<skill_id>/screenshots/`; the `skills.screenshots` column is a JSON array. **GET** `/api/v1/skills/:skill_id` includes:

```json
{
  "screenshots": [
    { "id": "uuid", "url": "skills/:skill_id/screenshots/:shot_id/file", "created_at": "ISO timestamp" }
  ]
}
```

`url` is relative to the API prefix; the full address is `/api/v1/` + `url`.

Limits (configurable via env):
- Max size per image: `SKILL_BASE_SCREENSHOT_MAX_MB` (default 5 MB)
- Max count per Skill: `SKILL_BASE_SCREENSHOT_MAX_COUNT` (default 10)
- Only PNG / JPEG / WebP / GIF are accepted

#### Upload a screenshot

**POST** `/api/v1/skills/:skill_id/screenshots`

**Auth:** Session required; Skill **owner or collaborator**. Multipart form, file field name `image`.

**Response:** `{ "ok": true, "skill_id": "...", "screenshot": {...}, "screenshots": [...] }`

**Error codes:** `400` - missing file / invalid type / too large / too many; `403` - forbidden; `404` - Skill not found

#### Read a screenshot file

**GET** `/api/v1/skills/:skill_id/screenshots/:shot_id/file`

Access follows Skill visibility (private Skills are only visible to collaborators); returns the image binary.

#### Delete a screenshot

**DELETE** `/api/v1/skills/:skill_id/screenshots/:shot_id`

**Auth:** owner or collaborator. Also removes the file from disk. **Response:** `{ "ok": true, "screenshots": [...] }`

#### Reorder screenshots

**PUT** `/api/v1/skills/:skill_id/screenshots`

**Auth:** owner or collaborator. Body `{ "screenshot_ids": ["id1", "id2"] }`; ids not listed keep their relative order at the end.

Deleting a Skill removes its screenshots together with `data/skills/<skill_id>/`.

---

## Publish module `/api/v1/skills`

### 1. Publish new version

**POST** `/api/v1/skills/publish`

Publish a new Skill version (supports creating a new Skill).

**Auth:** Session required

**Request format:** `multipart/form-data`

**Form fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `zip_file` | file | yes | Skill ZIP archive |
| `skill_id` | string | yes | Skill ID |
| `name` | string | conditional | Required for new Skills; Skill name |
| `description` | string | no | Skill description |
| `changelog` | string | no | Version release notes |
| `visibility` | string | no | New Skills only, `public` or `private`, default `public` |

**Response:**
```json
{
  "ok": true,
  "skill_id": "string",
  "version": "v20260324.221016",
  "created_at": "string"
}
```

**Error codes:**
- `400` - Missing required fields
- `401` - Not authenticated

---

## User module `/api/v1/users`

Admin endpoints require **admin** permission (`requireAdmin`). If deployed with `base-path` (e.g. `/sb`), the full path is `{base-path}/api/v1/users`.

### 1. User search (collaborators, etc.)

**GET** `/api/v1/users/search`

**Auth:** Session required (any logged-in user)

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Optional. When omitted or empty, returns all `active` users (up to 2000, sorted by `username` ascending); when set, fuzzy match on username or display name (up to 100) |

**Response:** `{ "users": [ { "id", "username", "name", "status" } ] }` (only users with `status` `active`)

---

### 2. User list

**GET** `/api/v1/users`

**Auth:** Admin

**Query parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Optional fuzzy search on username or display name |
| `status` | string | Optional, `active` / `disabled` |
| `page` | number | Optional, default `1` |
| `limit` | number | Optional, default `20`, max `100` |

**Response:**
```json
{
  "users": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

---

### 3. Create user

**POST** `/api/v1/users`

**Auth:** Admin

**Request body:**
```json
{
  "username": "string",
  "password": "string",
  "name": "string",
  "role": "developer"
}
```

| Field | Description |
|-------|-------------|
| `username` / `password` | Required; password at least 6 characters |
| `name` | Optional |
| `role` | Optional, default `developer`; only `admin` or `developer` |

**Response:** `201`, `{ "ok": true, "user": { ... } }`

---

### 4. User details

**GET** `/api/v1/users/:user_id`

**Auth:** Admin

**Response:** Includes `id`, `username`, `name`, `role`, `status`, `created_at`, `updated_at`; if present, `created_by: { id, username }`.

---

### 5. Update user

**PATCH** `/api/v1/users/:user_id`

**Auth:** Admin

**Note:** Use **PATCH**, not PUT (PUT is not registered and returns `404`).

**Request body (at least one field):**
```json
{
  "name": "string",
  "role": "admin",
  "status": "active"
}
```

| Field | Description |
|-------|-------------|
| `role` | `admin` or `developer` |
| `status` | `active` or `disabled` |

An admin cannot disable their own account or demote their own role to `developer`.

**Response:** `{ "ok": true, "user": { ... } }`

---

### 6. Reset password

**POST** `/api/v1/users/:user_id/reset-password`

**Auth:** Admin

**Request body:**
```json
{
  "new_password": "string"
}
```

Password must be at least 6 characters. **Response:** `{ "ok": true, "message": "Password has been reset" }`

---

## Tag module `/api/v1/tags`

The global tag library is maintained by **admins**; any logged-in user may **GET** the list (for assigning tags on Skill detail). Create, rename, and delete require **admin**.

### 1. Tag list (with usage count)

**GET** `/api/v1/tags`

**Auth:** Session required

**Response:**
```json
{
  "tags": [
    { "id": 1, "name": "string", "usage_count": 0 }
  ]
}
```

---

### 2. Create tag

**POST** `/api/v1/tags`

**Auth:** Session required, **admin**

**Request body:** `{ "name": "string" }`

**Response:** `201`, `{ "ok": true, "tag": { "id", "name", ... } }`

**Error codes:**
- `400` - Name is empty
- `403` - Not an admin

---

### 3. Rename tag

**PATCH** `/api/v1/tags/:tag_id`

**Auth:** Session required, **admin**

**Request body:** `{ "name": "string" }`

---

### 4. Delete tag

**DELETE** `/api/v1/tags/:tag_id`

**Auth:** Session required, **admin**

Removing a tag also removes its associations from all Skills.

---

## Data models

### User
| Field | Type | Description |
|-------|------|-------------|
| `id` | number | User ID |
| `username` | string | Username |
| `name` | string | Display name (optional) |
| `role` | string | `admin` or `developer` (regular platform users are `developer`) |
| `status` | string | `active` or `disabled` |
| `is_super_admin` | number | `1` for super admin, `0` otherwise |

### Skill
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Skill ID |
| `name` | string | Skill name |
| `description` | string | Skill description |
| `latest_version` | string | Latest version number |
| `favorite_count` | number | Number of favorites |
| `download_count` | number | Cumulative version downloads (counts **download** endpoint only) |
| `is_favorited` | boolean | Whether the current user favorited it (`false` when not logged in) |
| `tags` | array | `{ id, name }[]`, global tags |
| `owner` | object | Owner `{id, username}` |
| `visibility` | string | `public` or `private` |
| `created_at` | string | Created at |
| `updated_at` | string | Updated at |

### Version
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Version ID |
| `skill_id` | string | Parent Skill ID |
| `version` | string | Version number (format: `vYYYYMMDD.HHMMSS`) |
| `changelog` | string | Release notes |
| `download_count` | number | Downloads via **download** for this version |
| `zip_path` | string | ZIP file path |
| `uploader` | object | Uploader `{id, username}` |
| `created_at` | string | Created at |
