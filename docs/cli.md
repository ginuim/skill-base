# Skill Base CLI

**English** | [中文](zh/cli.md)

`skb` is the official Skill Base command-line client for searching, installing, updating, and publishing team Skills.

Its real value is not merely “downloading files.” It remembers which IDE directories each Skill was installed into, so you can batch-update, remove, and clean up records later.

## Installation

```bash
pnpm add -g skill-base-cli
```

You can also run it without a global install:

```bash
npx skill-base-cli <command>
```

## Initialization

The CLI connects to `http://localhost:8000` by default. Run init once to persist the server URL in local config:

```bash
skb init -s https://skill.example.com
```

You can also override with an environment variable:

```bash
export SKB_BASE_URL=https://skill.example.com
```

## Command overview

| Command | Description |
|---------|-------------|
| `skb init` | Initialize CLI config and set the server URL |
| `skb login` | Log in and store local credentials |
| `skb logout` | Log out and clear local credentials |
| `skb whoami` | Check whether a local token exists and ask the server if login is still valid |
| `skb search <keyword>` | Search Skills |
| `skb install <target>` | Install a Skill; supports `name@version` |
| `skb list` / `skb ls` | Browse locally recorded Skills; update, remove, or clear records |
| `skb update <skill_id>` | Pick a version and update local install directories |
| `skb publish [directory]` | Publish the Skill in the current or specified directory |
| `skb import-github <source>` | Import a Skill from a public GitHub repo (server fetches zipball); alias `skb import` |
| `skb ui` | Start a local Web UI for search, install, and update in the browser (default `127.0.0.1:9847`) |

## Local Web UI (`skb ui`)

From **the working directory where you run the command**, use the browser to search, install, and update recorded installs. Requests are proxied through the local process to the Skill Base configured by `skb init` / `SKB_BASE_URL`, with the PAT saved by `skb login` attached automatically—avoiding CORS and credential exposure when the browser talks to the remote server directly.

```bash
skb ui
# Custom port, do not open browser automatically
skb ui --port 9000 --no-open
# Localhost only (default); to listen on all interfaces (watch LAN exposure):
skb ui --host 0.0.0.0
```

Notes:

- When the install target is “current directory”, the Skill is extracted into **the directory you were in when you started `skb ui`** (same as `skb install` using the current directory in the terminal).
- After you stop the process with `Ctrl+C`, the page is no longer available.

## Desktop client

Besides `skb ui` (browser), the repo ships a native desktop shell that shares `cli/lib` install/update/login logic and `~/.skill-base/` config:

| Directory | Description |
|-----------|-------------|
| `desktop-tauri/` | Tauri 2 + bundled Node bridge; UI in `src/` |

```bash
cd desktop-tauri && pnpm install && pnpm dev
```

Connection settings, verification-code login, global/project/custom install paths, and multi-path updates behave the same as the CLI. See [desktop-tauri/ACCEPTANCE.md](../desktop-tauri/ACCEPTANCE.md) for acceptance checks.

## Login and credentials

### `skb login`

```bash
skb login
```

Flow:

1. CLI opens the browser login page
2. After login, obtain an 8-digit verification code
3. Return to the terminal and enter the code to complete login

Local credentials are stored in `~/.skill-base/credentials.json`.

### `skb logout`

```bash
skb logout
```

Clears local login credentials.

### `skb whoami`

Confirms whether **this machine has a saved PAT** and whether **that PAT is still accepted on the currently configured Skill Base** (e.g. token revoked on the server, user disabled, or `SKB_BASE_URL` pointing at the wrong instance).

```bash
skb whoami
# Exit code only in scripts (0 = valid, non-zero = not logged in or invalid/unreachable)
skb whoami -q
# Machine-readable output
skb whoami --json
```

Exit codes: `0` means logged in and the server returned the current user; non-`0` means no local token, server returned 401/403, or the configured server could not be reached.

## Search and install

### `skb search <keyword>`

```bash
skb search vue
skb search "react component"
```

### `skb install <target>`

```bash
skb install <skill_id>
skb install <skill_id>@<version>
```

Options:

- `target`: Skill ID, or `skill_id@version`
- `-d, --dir <directory>`: Install directly into the given directory
- `-i, --ide <ide>`: Pick the target directory using IDE rules
- `-g, --global`: Install into the global IDE config directory (only some IDEs support this)

Examples:

```bash
# Install latest version
skb install vue-best-practices

# Install a specific version
skb install vue-best-practices@v20260115.120000

# Install into a specific directory
skb install vue-best-practices -d ./my-skills

# Auto-install into the current project's IDE directory
skb install team-vue-rules --ide cursor
skb install team-vue-rules --ide claude-code
skb install team-vue-rules --ide qoder
skb install team-vue-rules --ide opencode
skb install team-vue-rules --ide trae
skb install team-vue-rules --ide trae-cn
skb install team-vue-rules --ide copilot

# Install into global IDE directory
skb install git-commit-rules --ide cursor --global
```

Built-in IDE targets:

- `cursor`
- `claude-code`
- `copilot`
- `windsurf`
- `qoder`
- `qoderwork`
- `opencode`
- `trae` (project: `<project-root>/.trae/skills`, global: `~/.trae/skills`)
- `trae-cn` (project: `<project-root>/.trae/skills`, global: `~/.trae-cn/skills`)
- `openclaw` (`<project-root>/skills`, global: `~/.openclaw/skills`)
- `codebuddy` (`<project-root>/.codebuddy/skills`, global: `~/.codebuddy/skills`)
- `workbuddy` (`<project-root>/.workbuddy/skills`, global: `~/.workbuddy/skills`)
- `codex` (`<project-root>/.agents/skills`, global: `~/.codex/skills`)
- `iflow-cli` (`<project-root>/.iflow/skills`, global: `~/.iflow/skills`)
- `kilo` (`<project-root>/.kilocode/skills`, global: `~/.kilocode/skills`)
- `kiro-cli` (`<project-root>/.kiro/skills`, global: `~/.kiro/skills`)
- `pi` (`<project-root>/.pi/skills`, global: `~/.pi/agent/skills`)
- `qwen-code` (`<project-root>/.qwen/skills`, global: `~/.qwen/skills`)
- `roo` (`<project-root>/.roo/skills`, global: `~/.roo/skills`)

If a folder with the same Skill name already exists under the target directory, `skb install` asks before overwriting; on confirmation it removes the old folder and extracts the new install.

After a successful install, the CLI records locally:

- Skill ID
- Install path
- Current version
- Install time
- IDE type
- Whether it is a global install

These records are reused by `skb list` and `skb update`.

## View and manage local installs

### `skb list`

```bash
skb list
skb ls
```

This command groups local records by Skill, newest install/update first, and lets you:

- See install directories recorded for a Skill
- Start an update flow
- Delete one or more local install directories and remove the matching records
- Clear records only, without deleting files on disk

Do not underestimate this command. Without local records, “batch update” is meaningless.

## Update Skills

### `skb update <skill_id>`

```bash
skb update <skill_id>
skb update <skill_id> -d <directory>
```

Options:

- `skill_id`: Skill ID to update
- `-d, --dir <directory>`: Explicit parent directory; updates `<directory>/<skill_id>` directly and skips local records

Behavior:

- `skb update <skill_id>` fetches the version list and prompts you to pick a target version
- If only one install directory is recorded locally, the CLI updates it without asking again
- If multiple install directories are recorded, the CLI lists them for selection, including an “all directories” option
- If this Skill was never recorded by a recent CLI version, the command does not guess paths; either run `install` again or pass `-d` temporarily

Examples:

```bash
skb update vue-best-practices
skb update vue-best-practices -d ./.cursor/skills
```

## Publish Skills

### `skb publish [directory]`

```bash
skb publish
skb publish ./my-skill
```

Options:

- `[directory]`: Skill directory path; defaults to the current directory when omitted
- `--name <name>`: Explicit Skill name
- `--description <desc>`: Explicit Skill description
- `--changelog <log>`: Version release notes; default is `更新版本`

Requirements:

- Must be logged in first
- Directory must contain `SKILL.md`
- Directory name is used as `skill_id`

Examples:

```bash
# Publish current directory
skb publish --changelog "Add API auth guidelines"

# Publish specified directory
skb publish ./my-skill --changelog "Fix prompt conflicts"

# Override name and description
skb publish ./my-skill --name "My Skill" --description "A useful skill"
```

## Import Skills from GitHub

### `skb import-github <source>`

```bash
skb import-github owner/repo
skb import https://github.com/owner/repo
skb import owner/repo --dry-run
skb import-github owner/repo --ref main --subpath packages/my-skill --target my-local-id
```

Options:

- `source`: `owner/repo` or `https://github.com/owner/repo` (also supports `/tree/...` for branch and subpath)
- `--ref <ref>`: Branch or tag; uses the repo default branch when omitted
- `--subpath <path>`: Subdirectory containing the Skill in a monorepo
- `--target <skill_id>`: Skill id on your Skill Base; when omitted, the server preview runs first—no conflict uses the derived id, conflict uses suggested `gh-owner-repo` form
- `--changelog <text>`: Version notes
- `--dry-run`: Call preview API only and print JSON; no import

Requirements: logged in; repository must be **public** (server fetches zipball). If the target id is taken by someone else and you lack publish permission, the CLI errors and may include `suggested_skill_id` in the message.

## `SKILL.md` parsing rules

Skill Base publishes a directory that contains `SKILL.md`.

If you write frontmatter, the CLI and server prefer it; otherwise parsing falls back as follows:

- `name`: frontmatter `name` first; if missing, the first `#` heading
- `description`: first non-empty paragraph after the heading; multi-line block quotes starting with `>` are merged into one paragraph
- Multi-line YAML blocks in frontmatter such as `description: >-` / `description: |` are parsed per YAML rules (`>-` folds newlines to spaces)

Minimal example:

```markdown
---
name: team-vue3-admin
description: "Internal Vue3 admin best practices. Triggers on requests to create Vue admin pages, use ProTable, ProForm, or internal request utilities."
---

# Internal Vue3 admin best practices

Engineering team back-office standards covering forms, tables, request wrappers, and date formatting.
```

## End-to-end examples

### First-time setup

```bash
# 1. Configure server URL
skb init -s http://your-team-server

# 2. Log in
skb login

# 3. Search and install
skb search vue
skb install team-vue-rules --ide cursor

# 4. Update later in one place
skb update team-vue-rules

# 5. Inspect local records
skb list
```

### Publish and roll out a new version

```bash
# 1. Edit local Skill
# 2. Publish new version
skb publish ./my-awesome-skill --changelog "Add report component guidelines"

# 3. Teammates update local installs
skb update my-awesome-skill
```

## Troubleshooting

### Login fails

- Confirm the verification code format is correct
- Check whether the code has expired
- Confirm the server URL is configured correctly

### Install or update fails

- Check Skill ID spelling
- Confirm your account can access the Skill
- For legacy manual install directories, run `skb install` again or use `-d` temporarily

### Publish fails

- Confirm you ran `skb login` first
- Confirm the directory contains `SKILL.md`
- Check that the directory name matches the expected `skill_id`

## System requirements

- Node.js >= 18
