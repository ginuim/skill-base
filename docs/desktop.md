# Desktop Client

**English** | [中文](zh/desktop.md)

Prefer a native app over the browser or terminal? The desktop client connects to your Skill Base server, browses the team catalog, and installs or updates skills into the right folders for Cursor, Claude Code, Codex, Qoder, and other agents — without hand-copying paths.

## Download

**CI builds from `main`:** [GitHub Releases → desktop-latest](https://github.com/ginuim/skill-base/releases/tag/desktop-latest)

- macOS `.dmg`
- Windows `.exe` (NSIS)
- Linux `.AppImage` / `.deb`

End users do not need Node.js installed.

## Features

**Skill Market** — Search the current registry, filter by tags or favorites, and install from the selected skill’s details.

**Local Assets** — Each skill shows its installed agents. Filter by Agent and select a skill to see its description, installed versions, paths, and a plain-text preview of each copy’s `SKILL.md`. Version management and batch updates use the matching directories from the active registry. Older records without a source use the `default` profile for updates.

**Profiles** — Choose the active registry from the sidebar. Connection settings can add a profile or edit the current URL. The CLI and Desktop share the saved profile selection and store each profile’s credentials separately. Editing a profile URL in Desktop requires signing in again for the new server.

**Install** — Choose global agents, project agents, or custom folders. For a skill or collection, select **Copy** (the default) or **Link (shared files)**. Link mode stores one copy per skill for the selected targets under `~/.skill-base/linked-skills`. Windows uses directory junctions. Linked updates change the selected targets, and uninstall removes their links. Files in the shared store are retained. You can optionally overwrite an existing folder with the same name. The desktop app marks unwritable targets before install; for example, the global `Universal (.agents)` target maps to `~/.config/agents/skills`, so fix ownership/permissions there or use a custom folder if macOS blocks that path.

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/desktop-install.png" alt="Skill Base desktop — Install to agents" width="720" />
</p>

## Build from source

| Directory | Stack | Build |
|-----------|-------|-------|
| `desktop-tauri/` | Tauri 2 + bundled Node 20 bridge | `pnpm install && pnpm build` |

CI: [`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml) updates `desktop-latest` on every push to `main`.

Developer docs:

- [desktop-tauri/README.md](../desktop-tauri/README.md) — dev, build, troubleshooting
- [desktop-tauri/ACCEPTANCE.md](../desktop-tauri/ACCEPTANCE.md) — 27-channel IPC parity checklist
