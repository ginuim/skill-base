# Changelog

All notable changes to **skill-base** (server + web UI) are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Version numbers match `package.json` and [npm](https://www.npmjs.com/package/skill-base).

Desktop builds use the separate [desktop-latest](https://github.com/ginuim/skill-base/releases/tag/desktop-latest) release track; desktop notes are grouped under **Desktop** when they do not ship with the npm server package.

## [Unreleased]

## [2.0.49] - 2026-07-24

### Added

- GitHub import: fall back to Git tree + raw file download when zipball exceeds the archive size limit
- GitHub import: configurable per-file size limit via `SKILL_BASE_GITHUB_IMPORT_MAX_ENTRY_MB` (default 25MB)

### Changed

- GitHub import: default zip archive limit raised to 100MB (`SKILL_BASE_GITHUB_IMPORT_MAX_ZIP_MB`)
- GitHub import: clearer size-limit error messages

## [2.0.48] - 2026-06-10

### Added

- English docs split: [getting-started](docs/getting-started.md), [usage](docs/usage.md), [deployment](docs/deployment.md), [architecture](docs/architecture.md), [desktop](docs/desktop.md), [author](docs/author.md)
- Chinese docs mirror under `docs/zh/`; bilingual index at [docs/README.md](docs/README.md)
- This changelog (Keep a Changelog layout)

### Changed

- README slimmed to an entry page; long guides moved under `docs/`
- `docs/README.zh.md` slimmed to redirect; Chinese entry at `docs/zh/README.md`
- `docs/cli.md` and `docs/api.md` moved to `docs/zh/` (root stubs redirect old links)

### Desktop

- Tauri 2 client replaces Electron; CI publishes macOS `.dmg`, Windows `.exe`, Linux `.AppImage` / `.deb` to `desktop-latest`
- Skill Market, Local Assets, install-to-agents flow, themed version picker, collapsed changelog preview on version rows
- Shared Node bridge handlers with CLI; loopback IPC and Windows/macOS packaging fixes

## [2.0.44] - 2026-05-20

### Fixed

- Web: apply theme before the bundle loads to prevent a flash of the wrong theme on first paint

## [2.0.43] - 2026-05-20

### Added

- SKILL.md: parse folded YAML frontmatter (`>-` / `|`) and blockquote-style description lines; description limit raised to 500 characters
- Web: deep links to a specific version on the skill detail page

## [2.0.41] - 2026-04-28

### Added

- CLI: `skb ui` (local web UI helper), `skb whoami` (verify saved PAT)
- Web: user management shows skills a user collaborates on; global tag library, home tag filter, skill tagging on detail pages
- Docs: tag admin and filter behavior documented

### Changed

- User management page uses theme token `fg-strong` instead of hard-coded white text

## [2.0.17] - 2026-04-06

Earlier releases introduced private skill visibility, GitHub public-repo import, webhooks, favorites/tags/download tracking, collaborators, WAL migration helpers, and the switch to `node-sqlite3-wasm`. See `git log` before this file existed for full history.
