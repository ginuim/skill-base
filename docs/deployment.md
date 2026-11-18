# Deployment

**English** | [中文](zh/deployment.md)

Skill Base persists everything under a single data directory. Back up that folder and you restore the service.

```text
data/
├── skills.db
└── skills/
    └── <skill-id>/
        ├── v20260406.101500.zip
        └── v20260407.143000.zip
```

## Server flags

| Flag | Short | Description | Default |
|------|-------|-------------|---------|
| `--port` | `-p` | Listen port | `8000` |
| `--host` | `-h` | Bind address | `127.0.0.1` |
| `--data-dir` | `-d` | Data directory | package `data/` |
| `--base-path` | - | URL prefix | `/` |
| `--cache-max-mb` | - | In-process LRU cache size (MB) | `50` |
| `--session-store` | - | `memory` or `sqlite` | `memory` |
| `--no-cappy` | - | Disable terminal Cappy | enabled |
| `--verbose` | `-v` | Debug logging | off |
| `--daemon` | - | Run in background (PID/log under data dir; Cappy off by default) | off |
| `--stop` | - | Stop a `--daemon` process | - |
| `--status` | - | Check whether the background process is running | - |

Without pm2:

```bash
npx skill-base -d ./skill-data -p 8000 --daemon
npx skill-base -d ./skill-data --status
npx skill-base -d ./skill-data --stop
```

The data directory gets `skill-base.pid` and `skill-base.log`. Use the same `-d` for `--stop` and `--status` as for `--daemon`.

### Multiple instances

A background process is keyed by **data directory** (resolved absolute path of `-d`), not by port. Each data dir has its own PID and log file:

```bash
npx skill-base -d ./team-a-data -p 8000 --daemon
npx skill-base -d ./team-b-data -p 8001 --daemon

npx skill-base -d ./team-a-data --status
npx skill-base -d ./team-b-data --stop
```

Notes:

- One running instance per `-d` (one `skills.db`); starting another `--daemon` on the same dir fails even on a different port.
- Different instances must use different ports or the second bind will fail.
- Without `-d`, every instance shares the package default `data/` — only one background process is allowed.

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CACHE_MAX_MB` | In-process LRU cache cap | `50` |
| `SESSION_STORE` | `memory` or `sqlite` | `memory` |
| `DEBUG` | Verbose logging (same as `--verbose`) | off |
| `APP_BASE_PATH` | URL prefix (Docker; same as `--base-path`) | `/` |
| `GITHUB_TOKEN` / `SKILL_BASE_GITHUB_TOKEN` | GitHub API rate limits for import | - |
| `SKILL_BASE_GITHUB_IMPORT_MAX_ZIP_MB` | Max zipball size for GitHub import | `100` |
| `SKILL_BASE_GITHUB_CONNECTIVITY_TIMEOUT_MS` | GitHub connectivity probe timeout | `8000` |
| `SKILL_BASE_SQLITE3_PATH` | `sqlite3` binary for WAL migration on unsupported platforms | - |
| `SKILL_BASE_WEBHOOK_TIMEOUT_MS` | Outbound webhook timeout | server default |

`GET /api/v1/health` returns simplified cache stats.


### Network and first-run setup

- Native startup binds to `127.0.0.1` by default. The container listens on `0.0.0.0` internally. To expose it only to a local HTTPS reverse proxy, publish the port with `-p 127.0.0.1:8000:8000`.
- A fresh data directory requires the one-time setup token printed in the startup log. You can supply a random token via `SKILL_BASE_SETUP_TOKEN` (32–128 letters, digits, hyphens or underscores), then remove it after initialization. Restrict access to startup logs. Restarting generates a new token unless you supplied a configured token. Deployments without access to logs should supply the token through their secret configuration.
- Serve the Web UI and API from the same origin by default. Preserve the original `Host` on the reverse proxy, or list trusted browser origins in `CORS_ORIGINS` as comma-separated complete origins. Set `SESSION_COOKIE_SECURE=true` to require HTTPS for the session cookie.
- Changing your own password replaces your current browser session and revokes your other sessions and CLI tokens. An administrator reset revokes all sessions and tokens for the affected account. Authentication endpoints limit requests by connection IP. Clients behind a reverse proxy can share the same quota.

## Session storage

- **`memory` (default):** Sessions live in process memory. Any restart drops all sessions (users sign in again). Session I/O does not touch SQLite.
- **`sqlite`:** Sessions live in the `sessions` table inside `skills.db`. They survive restarts and suit multi-instance setups that share one database file.

## Docker

```bash
docker build -t skill-base .
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" --name skill-base-server skill-base
```

Use a dedicated host directory such as `./skill-data`. Do not bind the repository's bundled `data/` directory unless you intend to write SQLite into your working tree.

**Base path:**

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e APP_BASE_PATH=/skills/ \
  --name skill-base-server skill-base
```

Open `http://localhost:8000/skills/` (APIs under `http://localhost:8000/skills/api/v1/...`). Align `APP_BASE_PATH` with your reverse proxy's public prefix.

**Debug logging:**

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e DEBUG=true \
  --name skill-base-server skill-base
```

**SQLite-backed sessions:**

```bash
docker run -d -p 8000:8000 -v "$(pwd)/skill-data:/data" \
  -e SESSION_STORE=sqlite \
  --name skill-base-server skill-base
```

## PM2

```bash
pnpm add -g pm2
pm2 start npx --name skill-base -- -y skill-base -d ./skill-data -p 8000
```

From a cloned repo:

```bash
pm2 start bin/skill-base.js --name skill-base -- -d ./skill-data -p 8000
```

With SQLite sessions:

```bash
SESSION_STORE=sqlite pm2 start npx --name skill-base -- -y skill-base -d ./skill-data -p 8000
```

Persist across reboot:

```bash
pm2 save
pm2 startup
```

## Backup

Back up the data directory. Indexes and version archives live together; restoring the folder restores the service.

If you version internal infra with Git:

```bash
git add .
git commit -m "backup skill-base data"
git push
```

## API reference

HTTP API details: [api.md](zh/api.md) (中文).
