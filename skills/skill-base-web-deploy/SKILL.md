---
name: skill-base-web-deploy
description: >-
  Skill Base server deployment guide. Covers starting the Skill Base server (npx skill-base), Docker configuration, port mapping, and SQLite database backup. For deploying and operating the Skill Base platform itself only.
keywords:
  - deploy skill-base
  - npx skill-base
  - skill-base docker
---

# Skill Base Web Server Deployment

This skill guides you through setting up and operating the Skill Base platform server. Requires Node.js >= 18.

## When to Use This Skill
- When users request private deployment, hosting, or running the Skill Base server (`npx skill-base` or Docker).
- When users ask about Skill Base server host/port configuration (`-h`, `-p`), data directory (`-d`), or how to back up the database.

## When NOT to Use This Skill
- When users want to use the `skb` command to search, install, or publish specific skills (refer to `skill-base-cli` instead).
- When users ask about Docker, ports, or database configuration for non-Skill Base projects (avoid misuse).

## Quick Start (npm package)

```bash
# Recommended: fix the data directory for easy backup and migration
npx skill-base -d ./skill-data -p 8000
```

Default port is **8000**; if `-d` is not specified, data will be stored in npm cache-related paths. In production, always use **`-d`** to point to a specific directory.

## Startup Options (`npx skill-base`)

| Option | Description |
|--------|-------------|
| `-p`, `--port` | Listening port, default 8000 |
| `-h`, `--host` | Listening address, default `0.0.0.0` (listens on all local network cards/IPv4 addresses, accessible from both internal and external networks; set to `127.0.0.1` for local-only access) |
| `-d`, `--data-dir` | Data root directory; sets `DATA_DIR` and `DATABASE_PATH=<dir>/skills.db` |
| `--base-path` | Deployment base path prefix, default `/` (e.g., `/skills/` for subpath deployment) |
| `--no-cappy` | Disable Cappy the capybara mascot |
| `-v`, `--verbose` | Enable debug logging |
| `--help` | Show help information |
| `--version` | Show version number |

Intranet or local hardening example: `npx skill-base --host 127.0.0.1 -p 8000 -d ./data`

Subpath deployment example: `npx skill-base --base-path /skills/ -p 8000`

Debug mode example: `npx skill-base -v -d ./data`

## First Access

When no administrator exists, opening the site in a browser will launch the **initialization wizard**: create a system administrator account and password. Afterward, team members need to be added by the administrator, and users log in via Web and CLI.

## Development/Production Run from Source Directory

```bash
pnpm install
pnpm start
# Or for development: `pnpm dev`
```

## Docker (Recommended for Production)

Build in the **repository root directory containing the Dockerfile**:

```bash
docker build -t skill-base .
```

Image conventions: `DATA_DIR=/data`, `DATABASE_PATH=/data/skills.db`, `PORT=8000`. For host persistence, mount to **`/data`** inside the container:

```bash
docker run -d -p 8000:8000 -v "$(pwd)/data:/data" --name skill-base-server skill-base
```

If you need to change the port, map both host and container ports and set `PORT`, e.g., `-p 3000:3000 -e PORT=3000`.

## Data Directory Structure (Backup)

After specifying `-d` or mounting `/data`, typical contents:

```text
data/
├── skills.db
├── skills.db-wal
└── skills/
    └── <skill-id>/
        └── vYYYYMMDD.HHmmss.zip
```

Backup: Simply copy the entire data directory during low write activity or off-peak hours.

## Troubleshooting Tips

- **Port**: Ensure firewall/security groups allow `PORT`; cloud hosts need to allow corresponding inbound traffic.
- **CLI can't connect**: Client uses `skb init --server <root URL>` (without `/api`); verify the site is accessible from that machine.
- **Permissions**: The `-d` path must be readable/writable by the process; for Docker volumes, check host directory permissions.

## Relationship with `skill-base-cli`

After deploying the Web server, users on the client side use **`skb`** pointing to the same site root URL; see the `skill-base-cli` skill within the project.
