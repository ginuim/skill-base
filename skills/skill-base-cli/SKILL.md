---
name: skill-base-cli
description: >-
  The official Skill Base CLI client. Use the `skb` (Skill Base CLI) command to search, install, update, publish, and import-from-GitHub skills from Skill Base, as well as configure skb. Triggered when users say "publish skill to skill base", "import skill from github", "download/update skill from skill base", "configure skb", "am I logged in", "check skb login", or "configure skill-base-cli".
keywords:
  - skill-base-cli
  - skb
  - whoami
  - install skill
  - publish skill
  - update skill
  - search skill
  - query skill
---

# Pull and Publish Skills with skb

Assistants should complete operations by **running terminal commands**. Package name **`skill-base-cli`**, command **`skb`** after installation.

## When to Use This Skill
- Users request to search, install, update, or publish specific skills using the `skb` command.
- Users need to configure the client connection address (`skb init`) or log in (`skb login`).
- Users want to **search, install, update, or publish** Skills to a privately deployed Skill Base site.

## When NOT to Use This Skill
- Users want to deploy, start, or maintain the Skill Base server itself (use `skill-base-web-deploy` instead).


## Environment

- Node.js >= 18
- Installation: `npm install -g skill-base-cli`, or `npx skill-base-cli <subcommand>`
- Server address: Environment variable **`SKB_BASE_URL`** takes priority, otherwise reads **`~/.skill-base/config.json`**, default is `http://127.0.0.1:8000`
- Set and save: `skb init --server <site root URL>` (do not include `/api`)

## Login and Authentication Rules (Important)
- **No login required**: `search`, `install`, `update`, `init` and other regular read operations usually do not require login. Assistants **should not** proactively ask users to log in before these operations.
- **Login required**: **`skb publish` must be logged in**.
- **Login flow (`skb login`)**:
  1. Execute `skb login` in the terminal.
  2. The console will output a login page URL containing `from=cli`, open the login page in a browser.
  3. After successful web login, a **verification code** (in the format `XXXX-XXXX`) will be provided.
  4. Enter the verification code in the terminal to exchange for a PAT.
- Logout: `skb logout`.
- Check login: `skb whoami` (calls `GET /api/v1/auth/me` with the saved PAT; exit `0` if valid). Use `skb whoami -q` for scripts (exit code only) or `skb whoami --json` for machine-readable output.

## Local Web UI

- `skb ui` — starts a small server on `127.0.0.1:9847` (override with `--port`), opens the browser, proxies `/api/v1/*` to the configured Skill Base with the saved PAT. Use `--no-open`, `--host <address>` (default `127.0.0.1`).

## Search and Install

```bash
skb search <keyword>
skb install <skill_id>              # Latest version
skb install <skill_id>@<version>    # Specific version, e.g., v20260327.161122
skb install <skill_id> -d <target_directory>
```

Optional: Install to an IDE's skill directory, e.g., `skb install <skill_id> -i cursor`; use `-g` for global installation (supported by some IDEs only).

## Update Installed Skills

```bash
skb update <skill_id>
skb update <skill_id> -d <directory>
skb list
skb ls
```

- `skb install` records the local install path, version, and timestamp in `~/.skill-base/config.json`
- `skb list` / `skb ls` list all locally recorded skills, then let the user choose one to update, delete local files, or clear config records
- `skb update <skill_id>` first shows the available versions with changelog and uploader, then lets the user multi-select one or more recorded install directories to update together
- `skb update <skill_id> -d <directory>` still works as an explicit one-off update for `<directory>/<skill_id>`

## Publish

- **Skill name must pass `/^[\w-]+$/` validation, e.g., skill-base-cli**
- Prepare content in a **folder named after the skill**, root directory must contain **`SKILL.md`**
- **Recommended**: Use frontmatter in SKILL.md to mark name and description as the skill name and description
- If SKILL.md frontmatter has a name field, it must match the folder name
- If **no frontmatter is used**: Use the folder name as the skill name; the first paragraph of non-`#` text under the title is the skill description (can be overridden with `--description`)
- Execute in the skill directory: `skb publish`; or execute from any location: `skb publish <skill_folder_path>`
- Common usage: `skb publish <path> --changelog "description"`
- After publishing, describe the result to the user in 2 sentences, no need to be verbose

## Import from GitHub (public repos, skill-base login required)

- `skb import-github owner/repo` or `skb import https://github.com/owner/repo`,like `https://github.com/anthropics/skills/tree/main/skills/pdf`
- Same auth as publish (`skb login`)
- Options: `--ref`, `--subpath`, `--target <skill_id>`, `--changelog`, `--dry-run` (preview JSON only)
- Server downloads the repo archive; private repos are not supported

## Troubleshooting Failures

- First confirm **`SKB_BASE_URL`** points to the instance the user wants to use, as skill-base can be deployed internally and ports can be changed, verify the address is correct
- If the user deployed skill-base on a server, most servers need inbound/outbound port configuration to be accessible, users need to check if the address is accessible in the browser
- Check if it's a network issue, can use ping/telnet to confirm
- Publish failure: First **`skb login`**; then verify **`SKB_BASE_URL`**, folder name and frontmatter **`name`** are consistent and match `[\w-]+`, check `SKILL.md` and network
- Install failure: Use **`skb search`** to verify `skill_id`; when unsure of version, use `skb install <skill_id>` to install latest
