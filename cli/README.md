# Skill Base CLI

**Language:** English | [中文](README.zh.md)

`skb` is the official Skill Base command-line client for searching, installing, updating, and publishing team Skills.

Its real value is not merely downloading files. It remembers which IDE directories each Skill was installed into, so you can batch-update, remove, and clean up records later.

Full reference: [docs/cli.md](../docs/cli.md)

## Installation

```bash
pnpm add -g skill-base-cli
```

Or run directly with npx:

```bash
npx skill-base-cli <command>
```

## Configuration

The CLI defaults to `http://localhost:8000`. Persist the server URL in local config:

```bash
skb init -s https://your-skill-base-server.com
```

Override with an environment variable:

```bash
export SKB_BASE_URL=https://your-skill-base-server.com
```

## Command overview

| Command | Description |
|---------|-------------|
| `skb init` | Initialize CLI config and set the server URL |
| `skb login` | Log in and store local credentials |
| `skb logout` | Log out and clear local credentials |
| `skb whoami` | Check whether a local token exists and verify login with the server |
| `skb search <keyword>` | Search Skills |
| `skb install <target>` | Install a Skill (`name@version`) or a collection (`--collection`) |
| `skb list` / `skb ls` | Browse locally recorded Skills; update, remove, or clear records |
| `skb delete <skill_id>` / `skb rm` | Delete one or more local install directories and sync records |
| `skb update <skill_id>` | Pick a version and update local install directories |
| `skb publish [directory]` | Publish the Skill in the current or specified directory |
| `skb import-github <source>` | Import from a public GitHub repo; alias `skb import` |
| `skb ui` | Start a local Web UI (default `127.0.0.1:9847`) |

## Authentication

```bash
skb login    # Browser login + verification code → PAT in ~/.skill-base/credentials.json
skb logout
skb whoami   # -q for exit code only; --json for scripts
```

Login is required for `publish` and `import-github`. Search, install, update, and list usually do not require login.

## Search and install

```bash
skb search vue

# Single skill
skb install vue-best-practices
skb install vue-best-practices@v20260115.120000
skb install team-vue-rules --ide cursor
skb install git-commit-rules --ide cursor --global
skb install vue-best-practices -d ./my-skills

# Collection (admin-curated pack; downloads one zip and installs all member skills)
skb install --collection 1 --ide cursor
skb install --collection frontend-team --ide cursor
```

Options:

- `target`: Skill ID or `skill_id@version` (mutually exclusive with `--collection`)
- `--collection <id_or_slug>`: Install all skills in a collection
- `-d, --dir <directory>`: Install into the given directory
- `-i, --ide <agent>`: Pick target directory using IDE rules (alias `-a, --agent`)
- `-g, --global`: Install into global IDE config directory (where supported)

Common IDE values: `cursor`, `claude-code`, `codex`, `copilot`, `windsurf`, `qoder`, `opencode`, `trae`, `openclaw`, `codebuddy`, `workbuddy`, and others — run `skb install --help` for the full list.

If a same-named Skill folder already exists, `skb install` asks before overwriting. For collections, all conflicts are listed and confirmed in one prompt; cancel skips the entire collection install.

After install, the CLI records Skill ID, path, version, timestamp, IDE type, and global flag in `~/.skill-base/config.json` for `list` and `update`.

## Manage local installs

```bash
skb list
skb ls

skb delete <skill_id>
skb rm <skill_id>
skb delete <skill_id> --all
skb delete <skill_id> -d ./target-dir -y
```

- `list` / `ls`: group by Skill (newest first); update, delete files, or clear records only
- `delete`: multi-select recorded directories, or `--all` / `-d` / `-y` for scripting; only removes paths whose directory name matches `skill_id`

## Update

```bash
skb update vue-best-practices
skb update vue-best-practices -d ./.cursor/skills
```

- Shows versions with changelog and uploader, then multi-select install directories (or updates directly when only one exists)
- `-d` bypasses local records and updates `<directory>/<skill_id>` directly
- If never recorded by the CLI, run `install` again or pass `-d`

## Publish

```bash
skb publish ./my-skill --changelog "Initial release"
skb publish --name "My Skill" --description "A useful skill"
```

Requirements: logged in; directory must contain `SKILL.md`; folder name becomes `skill_id`. Name and description can be parsed from frontmatter automatically.

## Import from GitHub

```bash
skb import-github owner/repo
skb import https://github.com/owner/repo
skb import owner/repo --ref main --subpath packages/my-skill --target my-local-id --dry-run
```

Requires login; repository must be **public** (server fetches zipball).

## Local Web UI

```bash
skb ui
skb ui --port 9000 --no-open
skb ui --host 0.0.0.0   # LAN exposure — use with care
```

Proxies to your configured Skill Base with the saved PAT. Choosing “current directory” extracts into the directory where you started `skb ui`.

## Quick start

```bash
skb init -s http://your-team-server
skb login
skb search vue
skb install team-vue-rules --ide cursor
skb install --collection frontend-team --ide cursor
skb list
skb update team-vue-rules
skb publish ./my-skill --changelog "Initial release"
```

## Publish requirements

- Directory must contain `SKILL.md`
- Folder name becomes `skill_id`
- `name` and `description` can be extracted from `SKILL.md` frontmatter; without frontmatter, the first `#` heading and following paragraph are used

## Requirements

- Node.js >= 18.0.0

## License

MIT
