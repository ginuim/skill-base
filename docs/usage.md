# Usage

**English** | [中文](zh/usage.md)

## Core loop

**Publish once, update many places locally.** `skb install` records which directories received a Skill, which IDE they target, and the installed version (no symlinks — Windows pitfalls). When a remote Skill updates, sync locally:

```bash
skb update some-skill
```

One install record updates in place; multiple records prompt you to choose. Engineers use the CLI; PMs and QA can use the web UI for search, versions, and downloads without touching Git. You can also manage Skills with the desktop app.

```bash
skb search vue
skb install team-vue-rules --ide cursor
skb publish ./my-skill --changelog "API auth rules updated"
```

## What a Skill looks like

A Skill is a directory containing `SKILL.md`. Minimal example:

```markdown
---
name: team-vue3-admin
description: "Internal Vue3 admin best practices. Triggers on requests to create Vue admin pages, use ProTable, ProForm, or internal request utilities."
---

# Internal Vue3 admin best practices

Team A's admin guidelines covering forms, tables, request helpers, and date formatting.

## Principles

- TypeScript required
- Forms use `ProForm`
- Tables use `ProTable`
- HTTP via `@/utils/request`
```

Without frontmatter, the first `#` title becomes the name and the first paragraph becomes the description — still set `name` and `description` explicitly.

## Web UI

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/skill-base-home.png" alt="Skill Base home" width="720" />
</p>

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/skill-detail.png" alt="Skill detail" width="720" />
</p>

The web UI supports:

1. Browse and search Skills
2. Version history and changelogs
3. Download packages
4. Upload a folder or zip containing `SKILL.md`
5. Import a **public** GitHub repo by URL or `owner/repo` on the Publish page
6. Set visibility (`public` / `private`) at create time; owners can change it later
7. Hide private Skills from non-collaborators on list, detail, versions, and download

**Tags and favorites:** Admins manage a global tag library under **Tag management** (`/admin/tags`). The home page **Tags** filter uses OR semantics. Owners and collaborators assign tags on the skill detail page. Inline previews use `/view` so browsing a ZIP does not inflate download counts.

## Desktop

The desktop app is for people who do not want to memorize commands and paths: connect to your Skill Base server, browse team Skills, favorite them, install into Cursor / Claude Code / Codex / Qoder agent folders, and check whether installed Skills need updates under **Local assets**. Downloads: [Desktop](desktop.md).

### GitHub import (server)

- `GET /api/v1/skills/import/github/connectivity` — whether **the server** can reach GitHub (browser VPN does not help)
- `SKILL_BASE_GITHUB_IMPORT_MAX_ZIP_MB` (default `50`), `SKILL_BASE_GITHUB_CONNECTIVITY_TIMEOUT_MS` (default `8000`)
- Private GitHub repos are not supported

**CLI:** `skb import-github owner/repo` (alias `skb import`) with `--ref`, `--subpath`, `--target`, `--changelog`, `--dry-run`.

## OpenClaw-class assistants

Send the following to your assistant (replace server URL and verification code). **Indented quotes are prompts to paste into Claw.**

1. **Install `skill-base-cli` from ClawHub** (use an existing Skill Base site)

   > From ClawHub, pull **skill-base-cli** and install it into your skills directory.

   Day-to-day `skb` search, install, publish — no server-deploy skill required.

2. **Install `skill-base-web-deploy` from ClawHub** (deploy or operate the server)

   > From ClawHub, pull **skill-base-web-deploy** and install it into your skills directory.

   Only when the assistant should run Docker, data dir, backups, or other server-side work.

3. **Point the CLI at your server**

   > Help me configure Skill Base; the server URL is **`https://skill-base-server`**.

4. **Search** — `> Use skb to search for \`some-skill\`.` (usually no login)

5. **Install** — `> Use skb to install \`some-skill\`.` (pin with `skill_id@version`, or `-d` / `--ide`)

6. **Update** — `> Use skb to update \`some-skill\`.`

7. **Login** — `> Help me with skb login; the verification code is **\`xxxx-xxxx\`**.` Code from browser flow or `https://<host>/cli-code`; valid five minutes.

8. **Publish** — `> Use skb to publish the skill I just wrote.` Optional `--changelog`; the assistant can draft changelog text.

Repository Skills (also on ClawHub):

| Skill | Role |
|-------|------|
| **`skill-base-cli`** | Run **`skb`**: `init`, `login`, `whoami`, `search`, `install`, `update`, `publish`, etc. |
| **`skill-base-web-deploy`** | Deploy or operate the server (`npx skill-base`, Docker, ports, backups) |

Typical loop after ClawHub install:

1. **Server** — `npx skill-base -d <data-dir> -p <port>` or connect to an existing deployment (`skill-base-web-deploy` for server tasks).
2. **CLI target** — `skb init -s <site-root-url>` → `~/.skill-base/config.json` (no `/api` suffix). For several servers (e.g. prod / qa) use `skb config add <name> -s <url>` and `--profile <name>`.
3. **Login** — search/install usually need no login; **publish** needs `skb login` (browser flow or `/cli-code` → five-minute code → long-lived PAT).
4. **Day-to-day** — `skb search`, `install`, `update`, `publish` with `--changelog "..."`.

Global CLI: `npm install -g skill-base-cli` or `npx skill-base-cli`.

## Cappy

By default, the terminal shows an ASCII capybara named **Cappy** during startup and long waits. It does not affect behavior.

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/cappy.gif" alt="Cappy" width="720" />
</p>

Disable:

```bash
npx skill-base --no-cappy
```

## Related docs

- [Getting Started](getting-started.md)
- [CLI reference](zh/cli.md) (中文)
- [Desktop](desktop.md)
- [API](zh/api.md) (中文)
