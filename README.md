# Skill Base

**English** | [中文](docs/zh/README.md)

[![npm version](https://img.shields.io/npm/v/skill-base.svg)](https://www.npmjs.com/package/skill-base)
[![Node version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> Private distribution for Agent Skills. Publish once; install, update, and roll back across Cursor, Claude Code, Codex, OpenClaw, and similar assistants — one small server, one CLI (`skb`).

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/demo.gif" alt="Skill Base demo" />
</p>

## Why

Many teams already have dozens or hundreds of Skills, but they are not team assets yet — just Markdown scattered across chat logs, personal machines, and project folders. People download from group chats, copy a colleague's old copy, or edit their local file directly. Over time, no one can say which copy is current, who changed what, or which projects still run an old version.

Some teams move Skills into Git, which helps: you get commits and a single repo. But Git answers "where do files live?", not "how does the team use them?" It does not fix fragmented Skill paths across Cursor, Claude Code, Qoder, and other agents. The real pain is distribution, install, updates, and access:

- **Distribution by hand** — zip files, pasted Markdown, new hires asking "where is the latest?"
- **Versions by guesswork** — `final`, `final2`, `latest` everywhere; local edits untracked
- **Paths by memory** — Cursor, Claude Code, Qoder, etc. use different Skill folders; install and update depend on tribal knowledge
- **Access blocks PM/QA** — they need the same standards but should not need repo access or Git workflows for one Skill
- **Updates stop at one machine or project** — one person fixes a Skill; other projects and teammates keep the old copy

Skill Base turns Skills into **publishable, versioned, and installable** team assets.

## What it does

| Capability | How |
|------------|-----|
| **Publish** | Web upload, `skb publish`, or GitHub import from public repos |
| **Install / update / delete** | `skb install` / `skb update` / `skb delete` with IDE Skill paths and local install tracking; `skb install --collection <id-or-slug>` for curated packs |
| **Browse** | Web UI for search, version switching, changelogs, tags, collections (max 10 skills), favorites, and skill detail pages with copyable AI Agent prompts and CLI commands for the selected version, avatars of actual version contributors, a file reader directly below the introduction, an independent installation sidebar, and a dedicated effect preview tab without decorative cards or shadows |
| **Contributions** | Compact skill lists show up to three contributor avatars plus an overflow menu. Click an avatar to open `/users/:id`: contributed skills, published version count, and downloads of those skills, filtered by viewer access. Contributions come from version uploaders, not membership. |
| **Desktop** | Native desktop client — [download](docs/desktop.md) |
| **Visibility** | `public` / `private` skills; owner / collaborator / user permissions |

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/desktop-market.png" alt="Skill Base desktop — Skill Market" width="720" />
</p>

The version diff page follows the skill detail page’s open layout, with flat version controls, underline view tabs, and scrollable code differences. The publish and account settings pages use flat sections without decorative cards. GitHub import reveals review fields after preview; branch/subdirectory options, avatar choices, and password changes expand on demand.

## Quick start

**Server** (Node.js >= 18):

```bash
npx skill-base -d ./skill-data -p 8000
```

Open the URL, complete first-time setup, create an admin account.

**CLI:**

```bash
npm install -g skill-base-cli
skb init -s http://localhost:8000
skb search vue
skb install some-skill --ide cursor
skb install --collection 1 --ide cursor
skb install --collection frontend-team --ide cursor
skb login    # required for publish
skb publish ./my-skill --changelog "First release"
```

Details: [Getting Started](docs/getting-started.md) · CLI: [docs/zh/cli.md](docs/zh/cli.md) (中文)

## Design philosophy

- **Skills are the unit** — not a generic file dump or agent orchestrator.
- **SQLite + ZIP on disk** — `skills.db` indexes; each release is a versioned archive. Backup = copy one directory.
- **One Node process** — no Redis, MySQL, queue, or microservice mesh for a problem this size.

Longer write-up: [Architecture](docs/architecture.md).

## Documentation

| Doc | Contents |
|-----|----------|
| [Getting Started](docs/getting-started.md) | Server, CLI, first install/publish |
| [Usage](docs/usage.md) | Web UI, desktop app, GitHub import, OpenClaw prompts, Skill format |
| [Deployment](docs/deployment.md) | Docker, PM2, flags, sessions, backup |
| [Architecture](docs/architecture.md) | Data model and stack choices |
| [Desktop](docs/desktop.md) | Download and features |
| [CLI](docs/zh/cli.md) | `skb` command reference (中文) |
| [API](docs/zh/api.md) | HTTP API (中文) |
| [Changelog](CHANGELOG.md) | Server / npm release notes |
| [Author](docs/author.md) | Maintenance contract, Author's Lab |
| [Docs index](docs/README.md) | Bilingual documentation map |

中文入口：[docs/zh/README.md](docs/zh/README.md)

## Author's Lab

Related projects from the author.

| | |
|--|--|
| [skillbase.reaidea.com](https://skillbase.reaidea.com) | Hosted Skill Base |
| [reaidea.com](https://reaidea.com) | Author homepage and future tools |

More entries land in [docs/author.md](docs/author.md) when they ship.

## Maintenance

This repo is maintained by a **part-time independent developer** on evenings and weekends.

Issues and PRs are welcome. There is no on-call SLA; clear, scoped PRs are easier to merge than open-ended feature asks.

Full note: [docs/author.md](docs/author.md).

## License

[MIT](LICENSE)
