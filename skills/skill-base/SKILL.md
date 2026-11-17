---
name: skill-base
description: Find, install, update, and publish skills on a Skill Base instance using its Web UI, ZIP downloads, or HTTP API. Use when the user shares a Skill Base URL or wants to work without Node.js or the skb CLI. For running or deploying the server, use skill-base-web-deploy.
---

# Use Skill Base

Start from the user's Skill Base instance or skill link. Keep any deployment prefix, such as `https://example.com/team/`. In the examples below, `BASE` is that instance URL without the trailing slash.

## Find and install

1. Use the Web catalog or search `GET {BASE}/api/v1/skills?q=<URL-encoded keyword>`. Use `GET {BASE}/api/v1/collections` for curated collections. Public reads work without logging in.
2. Open the skill detail page or request `GET {BASE}/api/v1/skills/<skill_id>`. Its `latest_version` is the current Head, which can point to an earlier release. Get version notes from `GET {BASE}/api/v1/skills/<skill_id>/versions`.
3. Use the selected version's ZIP from the detail page or `GET {BASE}/api/v1/skills/<skill_id>/versions/<version>/download`. Use the explicit version from the previous step. Collections use `GET {BASE}/api/v1/collections/<collection_ref>/download` and contain a separate directory per skill.
4. Confirm the Agent's supported skills directory and the project or personal scope. Extract safely, rejecting paths that escape the destination. Keep one directory per skill with `SKILL.md` at its root and preserve companion files. If the ZIP already wraps the skill in a top-level folder, keep that folder without adding a second wrapper.
5. Report the path and installed version. If a directory already exists, confirm before replacing it. Read the local version from reliable records when checking for updates. If it is unknown, report Head and the changelog without guessing the local version.

## Private skills and publishing

Use an existing authorized PAT for direct HTTP calls by configuring `Authorization: Bearer <PAT>` in the HTTP client. Public reads and downloads need no PAT. If the Agent has no token, use the signed-in Web UI. For private downloads, have the user sign in and provide the downloaded ZIP if the Agent cannot use their browser session. Keep passwords, cookies, and tokens out of chat and command output.

To publish, review the target instance, skill ID, visibility, and file list with the user before submitting. In the Web Publish page, upload a folder or ZIP, or preview a public GitHub import. With an authorized PAT, alternatively send a `multipart/form-data` POST to `{BASE}/api/v1/skills/publish` with `skill_id`, `zip_file`, and `name` for a new skill. Include explicit `visibility` for a new skill and add `changelog` when applicable. Keep `SKILL.md` and the working files in the archive and exclude credentials and generated clutter. Publishing an existing skill requires permission on that skill. Verify the returned version and share its detail-page link.

If the Agent already has the instance's MCP connection, it can also use the available Skill Base tools. Check the current tool list before calling a tool.
