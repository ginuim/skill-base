# Skill Base

**English** | [中文](https://github.com/ginuim/skill-base/raw/main/docs/README.zh.md)

[![npm version](https://img.shields.io/npm/v/skill-base.svg)](https://www.npmjs.com/package/skill-base)
[![Node version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Stop stuffing Agent Skills into source repositories.
> Skill Base is a lightweight private distribution platform for Agent Skills for small and medium teams: a minimal server plus an `skb` CLI that pulls team standards out of repos and ships them consistently to Cursor, Claude Code, Qoder, OpenCode, Windsurf, and similar tools.

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/demo.gif" alt="Skill Base demo" />
</p>

## Skill Base solves distribution, not “file storage”

Many teams already write Skills, but the usual pattern is still to drop them into `.cursor/skills`, `.claude/skills`, `.github/instructions`, and sync via Git. That works until the team grows—and then it hurts.

### 1. IDE rules are fragmented

Some people use Cursor; others use Claude Code, Qoder, Windsurf, OpenCode. Each IDE has different folder layouts and conventions. What you need to sync is not one folder—it is a pile of different on-disk rules.

### 2. Non-engineers are locked out

PMs and QA also need Skills for PRDs, test cases, and regression checklists. They should not need repo access—or a `git pull` lesson—just to use team standards.

### 3. Cross-project reuse is weak

When “generic API auth Skill” updates in project A, project B does not follow automatically. You end up copying everywhere, drifting everywhere, missing updates everywhere.

Skill Base does one thing straight: turn Skills into publishable, installable, updatable, rollback-friendly team assets.

## Core capabilities

### Publish once, update many places locally

`skb install` is not only a download. The CLI remembers which local directories a Skill was installed into, which IDE they belong to, and the current version.

When team standards change, you run:

```bash
skb update some-skill
```

If there is only one install record, the CLI updates directly; if there are several directories, it lists them for you to pick. The point is not fancy UI—it is that you no longer hand-replace old Skills across dozens of projects.

That closes a practical loop: let AI polish a Skill locally, then `skb publish` to your internal server; teammates run `skb update` once to get the latest rules.

### Works outside the repo, for everyone

Engineers keep using the terminal:

```bash
skb search vue
skb install team-vue-rules --ide cursor
skb publish ./my-skill --changelog "API auth rules updated"
```

PMs, QA, and colleagues who prefer not to use the CLI can search, browse versions, and download packages in the web UI. Team knowledge should not only serve people who write code.

### Small data model, GitOps-friendly

The Skill Base server only manages:

- `skills.db`: index for Skills, versions, users, permissions
- `skills/<skill-id>/<version>.zip`: archived packages per release
- A small Node.js service: auth, upload, download, version APIs, static UI

No MySQL, no Redis, no pile of infra you will stop maintaining next month.

If you pass `-d ./data`, the layout looks roughly like:

```text
data/
├── skills.db
└── skills/
    └── <skill-id>/
        ├── v20260406.101500.zip
        └── v20260407.143000.zip
```

Backups, migrations, and rollbacks stay simple. Many teams can even version this directory with Git.

## Quick start

### 1. Start the server

Requires Node.js >= 18.
The server now uses `node-sqlite3-wasm` for SQLite access, so normal startup no longer depends on local `better-sqlite3` native compilation.
If you are upgrading from an older release that previously wrote SQLite in WAL mode, Skill Base will automatically migrate the existing database on first start using a bundled `sqlite3` helper, then continue running on the new WASM driver without manual steps or data loss.

Bundled migration helpers are included for:

- macOS `arm64`
- macOS `x64`
- Linux `x64`
- Windows `x64`

If you deploy on another platform and are upgrading an old WAL database, set `SKILL_BASE_SQLITE3_PATH` to a local `sqlite3` executable for the first startup.

```bash
npx skill-base -d ./skill-data -p 8000
```

On first visit, the web UI runs initialization; follow the prompts to create an admin account.

Common invocations:

```bash
npx skill-base
npx skill-base --host 127.0.0.1
npx skill-base --base-path /skills/
npx skill-base --cache-max-mb 100
npx skill-base --session-store sqlite
```

Common flags:

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--port` | `-p` | Listen port | `8000` |
| `--host` | `-h` | Bind address | `0.0.0.0` |
| `--data-dir` | `-d` | Data directory | package `data/` |
| `--base-path` | - | URL prefix | `/` |
| `--cache-max-mb` | - | In-process LRU cache size (MB) | `50` |
| `--session-store` | - | Session storage type (`memory`|`sqlite`) | `memory` |
| `--no-cappy` | - | Disable terminal Cappy | enabled by default |
| `--verbose` | `-v` | Debug logging | off |

Environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_MAX_MB` | In-process LRU cache cap | `50` |
| `SESSION_STORE` | `memory` or `sqlite` (see **Session storage** below) | `memory` |
| `DEBUG` | Set to `true` to enable verbose logging (same as `--verbose` / `-v` when using `npx skill-base`): `DEBUG:` lines on startup and Fastify request logging | off |

#### Session storage

- **`memory` (default):** Sessions live in process memory. **Any application restart drops all sessions** (users sign in again). Session create/read/delete **does not touch SQLite**, which **reduces database I/O** versus `sqlite`.
- **`sqlite`:** Sessions are stored in the `sessions` table alongside `skills.db`. They **survive restarts** and suit **multi-instance** deployments when instances share the same database file; expect SQLite reads/writes for session lifecycle.

`GET /api/v1/health` returns simplified cache stats so you can confirm caching is active.

### 2. Install the CLI

```bash
pnpm add -g skill-base-cli
```

### 3. Point the CLI at your server

```bash
skb init -s http://your-team-server
skb login
```

### 4. Install, update, publish

```bash
# Search
skb search vue

# Latest version
skb install vue-best-practices

# Specific version
skb install vue-best-practices@v20260115

# Target directory
skb install vue-best-practices -d ./.cursor/skills

# IDE-aware paths
skb install team-vue-rules --ide cursor
skb install team-vue-rules --ide claude-code
skb install team-vue-rules --ide qoder
skb install team-vue-rules --ide opencode
skb install team-vue-rules --ide copilot

# Global IDE config (supported IDEs only)
skb install git-commit-rules --ide cursor --global

# List local installs; update / remove / clear records
skb list

# Update a Skill across linked install dirs
skb update team-vue-rules

# Publish a new version
skb publish ./my-business-skill --changelog "Reporting component guidelines added"
```

Supported IDEs include:

- Cursor
- Claude Code
- GitHub Copilot
- Windsurf
- Qoder
- QoderWork
- OpenCode

## When Skill Base fits

Skill Base tends to help when:

- Your team uses more than one AI IDE
- Skills must be reused across projects
- Standards evolve often and you need version history
- PM, QA, and ops want direct access to Skills
- You do not want heavy infra for a small platform

## What a Skill looks like

Skill Base publishes a directory that contains `SKILL.md`. Minimal example:

```markdown
---
name: team-vue3-admin
description: "Internal Vue3 admin best practices. Triggers on requests to create Vue admin pages, use ProTable, ProForm, or internal request utilities."
---

# Internal Vue3 admin best practices

Team A’s admin guidelines covering forms, tables, request helpers, and date formatting.

## Principles

- TypeScript required
- Forms use `ProForm`
- Tables use `ProTable`
- HTTP via `@/utils/request`
```

Without frontmatter, the first `#` title becomes the name and the first paragraph after it becomes the description—but you should still set `name` and `description` explicitly.

## Web UI

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/skill-base-home.png" alt="Skill Base home" width="720" />
</p>

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/skill-detail.png" alt="Skill detail" width="720" />
</p>

For people who avoid the CLI, the web UI supports:

1. Browse and search internal Skills
2. View history and changelogs
3. Download packages
4. Upload a folder or zip containing `SKILL.md` to publish

That is what “team edition” means—not everyone must learn Git first.

## Deployment and backup

### Docker

```bash
docker build -t skill-base .
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" --name skill-base-server skill-base
```

Use a dedicated host directory such as `./skill-data` for persistence. Do not bind the repository's bundled `data/` directory when running from source, unless you intentionally want Docker to write SQLite files into your working tree.

**Base path (serve under a URL prefix):** set `APP_BASE_PATH` (same meaning as `npx skill-base --base-path`). Use a path that starts with `/`; a trailing slash is optional—the server normalizes it.

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e APP_BASE_PATH=/skills/ \
  --name skill-base-server skill-base
```

Then open `http://localhost:8000/skills/` (APIs live under `http://localhost:8000/skills/api/v1/...`). If you terminate TLS or rewrite paths in a reverse proxy, keep `APP_BASE_PATH` aligned with the public URL prefix.

**Debug logging:** The image runs `node src/index.js` directly, pass `-e DEBUG=true`:

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e DEBUG=true \
  --name skill-base-server skill-base
```

**Session storage (Docker):** Override the default when you need SQLite-backed sessions:

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e SESSION_STORE=sqlite \
  --name skill-base-server skill-base
```

With `SESSION_STORE=sqlite`, sessions are stored in the same SQLite database (`skills.db`) in the `sessions` table.

### Backup

The simplest approach is to back up the data directory: indexes and version archives live together, so restoring the folder brings the service back.

If you already use Git for internal infra, you can treat the data directory like any other repo:

```bash
git add .
git commit -m "backup skill-base data"
git push
```

## Cappy

By default, Skill Base shows an ASCII capybara named `Cappy` in the terminal. It does not affect behavior; it is only there to ease a bit of stress during publish, pull, or startup waits.

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/cappy.gif" alt="Cappy" width="720" />
</p>

To disable:

```bash
npx skill-base --no-cappy
```

## Design principles

This project stays intentionally small:

- Skills are the unit of team context distribution, not a heavy agent orchestration layer
- The server does auth, storage, versions, and distribution—nothing else
- Solve real problems with minimal data structures, not “enterprise” dependency stacks

Skill Base exists to make team standards actually flow—not to look impressive on a slide deck.

## Contributing

Licensed under [MIT](LICENSE). Issues and pull requests are welcome.
