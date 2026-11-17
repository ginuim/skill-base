# Desktop IPC Channels (27)

Skill Base Desktop 前端通过 `window.skb.invoke(channel, ...args)` 调用后端。
Tauri 走 Rust `skb_invoke` → Node bridge HTTP。

## Channels

| Channel | Args | Returns | Notes |
|---------|------|---------|-------|
| `config:get` | — | `{ baseUrl, profile, profiles, profileLocked, username, hasToken, agents, homeDir, projectRoot }` | |
| `config:setServer` | `url: string, registry?: Registry` | `{ baseUrl }` | Updates the active profile URL |
| `config:setProfile` | `{ name, baseUrl? }` | `{ profile }` | Switch an existing profile or create and select a profile with the given URL |
| `config:getGlobalTargets` | — | `Target[]` | |
| `config:getProjectTargets` | `cwd?: string` | `Target[]` | |
| `config:getProjectTargetTemplates` | — | `Target[]` | |
| `project:getRoot` | — | `string` | |
| `project:setRoot` | `root: string` | `string` | |
| `project:pickRoot` | — | `string \| null` | native dialog |
| `project:pickInstallDir` | `defaultPath?: string` | `string \| null` | native dialog |
| `shell:revealPath` | `rawPath: string` | `{ ok: true }` | native reveal |
| `auth:openLogin` | — | `void` | opens browser |
| `auth:exchangePat` | `code: string` | `{ username }` | |
| `auth:whoami` | — | `{ ok, baseUrl, user?, reason?, detail? }` | |
| `auth:logout` | — | `{ ok: true }` | |
| `skills:search` | `q?: string` | `Skill[]` | |
| `skills:getVersions` | `skillId: string` | `Version[]` | |
| `skills:getRemote` | `skillId: string` | `Skill` | |
| `skills:getInstalled` | — | `InstalledSkill[]` | Includes the paths associated with the active registry and a `linked` flag on local installs |
| `skills:readInstalled` | `{ skillId, installPath }` | `{ content, truncated }` | Plain-text SKILL.md preview, up to 64 KB, from a recorded install |
| `skills:install` | `InstallPayload` with optional `method: copy \| link` | `{ ok, ... }` | may return `NESTED_IDE_PATH` / `EXISTS` |
| `skills:update` | `{ skillId, version, installPaths?, all? }` | `{ ok, updated }` | `all: true` updates every recorded install from the active registry; otherwise may return `PICK_PATHS` |
| `skills:delete` | `{ skillId, installPaths?, all? }` | `{ ok, deleted, skipped }` | deletes local install dirs and records |
| `skills:openWebPage` | `{ skillId, version?, page?, version_a?, version_b? }` | `{ url }` | opens browser |
| `collections:list` | — | `Collection[]` | Active registry |
| `collections:get` | `collectionRef: string` | `{ collection, skills }` | |
| `collections:install` | Collection ref, install targets and optional `method: copy \| link` | `{ ok, ... }` | |

`Registry` is `{ profile, baseUrl }`. The UI sends it for server changes, authentication writes, and remote installation or update actions so the bridge can reject stale operations.

## Shared implementation

Logic lives in `cli/lib/desktop-handlers.mjs` (`registerDesktopHandlers`).
Channel list: `cli/lib/desktop-ipc-channels.mjs`.
Platform hooks injected via `deps`: `pickDirectory`, `revealPath`, `openExternal`, `getProjectRoot`, `setProjectRoot`.

## Tauri routing

- **Bridge (Node HTTP)**: all channels except native shell hooks when Tauri handles them in Rust.
- **Rust native**: `project:pickRoot`, `project:pickInstallDir`, `shell:revealPath`, `auth:openLogin`, `skills:openWebPage` (dialog/opener plugins).

Bridge listens on `127.0.0.1:<random>` — `POST /invoke` body: `{ "channel": "...", "args": [...] }`.
