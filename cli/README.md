# Skill Base CLI

**Language:** English | [中文](README.zh.md)

Command-line tool to search, install, update, and publish AI Agent Skills.

## Installation

```bash
npm install -g skill-base-cli
```

Or run directly with npx:

```bash
npx skill-base-cli <command>
```

## Configuration

The CLI defaults to `http://localhost:8000`. Override with:

```bash
export SKB_BASE_URL=https://your-skill-base-server.com
```

## Commands

### Authentication

```bash
# Log in
skb login

# Log out
skb logout
```

### Skill management

```bash
# Search for skills
skb search <keyword>

# Install a skill
skb install <skill_id>
skb install <skill_id>@<version>
skb install <skill_id> -d ./target-dir

# List and manage locally installed skills
skb list
skb ls

# Interactive update
skb update <skill_id>
skb update <skill_id> -d ./target-dir

# Publish a skill
skb publish <directory>
skb publish <directory> --name "Skill Name" --description "Description"
skb publish <directory> --changelog "Release notes"
```

## Quick start

```bash
# 1. Log in
skb login

# 2. Search
skb search vue

# 3. Install
skb install vue-best-practices

# 4. List and manage local skills
skb list

# 5. Interactively pick version and directory to update
skb update vue-best-practices

# 6. Publish your own skill
skb publish ./my-skill --changelog "Initial release"
```

## Update behavior

- `skb install` records where each skill was installed for later `skb update`
- `skb list` / `skb ls` lists all recorded skills and lets you update, remove local files, or clear the record
- `skb update <skill_id>` shows versions, changelog, and author, then lists recorded install directories for multi-select
- To ignore local records, use `skb update <skill_id> -d <directory>`

## Publish requirements

- The directory must contain a `SKILL.md` file
- The folder name becomes `skill_id`
- `name` and `description` can be extracted from `SKILL.md` automatically

## Requirements

- Node.js >= 18.0.0

## License

MIT
