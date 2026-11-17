# 桌面客户端

[English](../desktop.md) | **中文**

不想只用浏览器或命令行？桌面端连接 Skill Base 服务，浏览团队目录，把 Skill 安装、更新到 Cursor、Claude Code、Codex、Qoder 等目录，不用手抄路径。

## 下载

**`main` 分支 CI 构建：** [GitHub Releases → desktop-latest](https://github.com/ginuim/skill-base/releases/tag/desktop-latest)

- macOS `.dmg`
- Windows `.exe`（NSIS）
- Linux `.AppImage` / `.deb`

终端用户无需单独安装 Node.js。

## 功能

**技能市场** — 搜索当前源，按标签或收藏筛选，在右侧详情发起安装。

**本地资产** — 每条技能显示已安装的 Agent，可按 Agent 筛选。选中技能后在右侧查看说明、各安装目录的版本和源地址，并打开文本格式的 `SKILL.md` 预览。版本管理和批量更新仅处理属于当前源的目录。无来源的历史记录按 `default` 配置处理。

**服务器配置** — 在侧栏切换当前源，在连接设置中新增配置或修改地址。桌面端与 CLI 共用当前配置，各配置分别保存登录凭证。通过桌面端修改地址后，需为新服务器重新登录。

**安装** — 选全局 Agent、项目 Agent 或自定义目录，可覆盖同名文件夹。安装单个技能或集合时，在弹窗里选「复制」（默认）或「链接（共享文件）」。链接模式把文件放在 `~/.skill-base/linked-skills`，选定的目标共用同一份文件。Windows 使用目录联接（junction）。更新只切换所选的链接，卸载时移除链接，共享文件仍保留在本地。桌面端会标记不可写的安装目标，例如 `Universal (.agents)` 的全局目录对应 `~/.config/agents/skills`，若该目录或上级目录权限异常，请先修复权限，或改用“自定义目录”选择已授权的位置。

<p align="center">
  <img src="https://github.com/ginuim/skill-base/raw/main/docs/images/desktop-install.png" alt="Skill Base 桌面端 — 安装到 Agent" width="720" />
</p>

## 从源码构建

| 目录 | 技术栈 | 构建 |
|------|--------|------|
| `desktop-tauri/` | Tauri 2 + 内置 Node 20 bridge | `pnpm install && pnpm build` |

CI：[`.github/workflows/desktop-release.yml`](../../.github/workflows/desktop-release.yml) 在推送到 `main` 时更新 `desktop-latest`。

开发文档：

- [desktop-tauri/README.md](../../desktop-tauri/README.md) — 开发、构建、排障
- [desktop-tauri/ACCEPTANCE.md](../../desktop-tauri/ACCEPTANCE.md) — 25 通道 IPC 验收
