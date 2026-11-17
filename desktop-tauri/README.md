# Skill Base Desktop (Tauri)

左侧切换技能库、Agent 和 CLI profile，中栏搜索并选择技能，右侧查看说明、安装目录、版本与本地 `SKILL.md`。在连接设置中可新增配置或修改当前配置的服务器。

Vue UI 位于 `src/`，业务逻辑复用 `../cli/lib`（Node bridge）。

## 开发

```bash
# 首次：安装依赖（会自动安装 ../cli 依赖）
pnpm install

# 启动 Tauri 开发模式（Vite :5174 + Node bridge + 原生窗口）
pnpm dev

# 仅前端
pnpm dev:vite

# 仅 Node bridge（调试 HTTP /invoke）
pnpm dev:bridge

# Bridge 冒烟测试
pnpm smoke:bridge
pnpm smoke:bridge -- --bundled   # 测 esbuild 产物
pnpm smoke:channels              # 全部 bridge IPC 通道
pnpm verify:ipc                  # channel 声明 / Rust / UI 一致性
```

**开发要求**：系统 PATH 中可用 `node`（≥18），Rust/Cargo，macOS 上 Xcode CLT。

## 生产构建

Release 不依赖系统 PATH 中的 `node`，会打包：

| 资源 | 路径（bundle 内） | 说明 |
|------|-------------------|------|
| Portable Node 20 LTS | `resources/node/` | 按目标平台下载官方二进制 |
| Bridge | `resources/bridge/server.mjs` | esbuild 单文件 bundle |
| CLI fallback | `resources/cli-lib/` | 仅 `SKB_SKIP_BUNDLE=1` 时生成 |

```bash
# 完整 release（自动 prepare-resources + vite build + tauri build）
pnpm build

# 仅准备 sidecar 资源（下载 Node + bundle bridge）
pnpm prepare:resources

# 交叉指定 Node 平台（CI / 本地预下载）
SKB_NODE_TARGET=darwin-arm64 pnpm prepare:resources   # darwin-arm64 | darwin-x64 | linux-x64 | win-x64
```

### 本地构建产物

构建完成后安装包位于 `src-tauri/target/release/bundle/`：

| 平台 | 产物 |
|------|------|
| macOS | `dmg/*.dmg` |
| Windows | `nsis/*.exe` |
| Linux | `appimage/*.AppImage`、`deb/*.deb` |

### 环境变量

| 变量 | 作用 |
|------|------|
| `SKB_NODE_TARGET` | 指定下载的 Node 平台三元组 |
| `SKB_SKIP_NODE` | `1` = 跳过 Node 下载（复用已有 `src-tauri/resources/node`） |
| `SKB_SKIP_BUNDLE` | `1` = 不 esbuild，复制源码 bridge + 安装 cli-lib prod deps（需手动在 `tauri.conf.json` 添加 `resources/cli-lib/**` glob） |
| `SKB_CLI_LIB_ROOT` | Bridge 运行时 cli/lib 路径（Rust 在 fallback 模式自动注入） |

## 架构

见 [IPC.md](./IPC.md)。

- 前端：`window.skb.invoke(channel, ...args)` → Tauri `skb_invoke`
- Rust：5 个原生 channel（dialog/opener）+ 其余转发 Node bridge
- Bridge：`bridge/server.mjs` → `cli/lib/desktop-handlers.mjs`
- **Dev**：Rust 用 PATH `node` + 源码 `bridge/server.mjs`
- **Release**：Rust 用 `resource_dir/node` + bundled `resource_dir/bridge/server.mjs`

## 验收

完整清单见 [ACCEPTANCE.md](./ACCEPTANCE.md)（27 IPC channel、手动 UI 场景）。

发布前建议：

```bash
pnpm verify:ipc && pnpm smoke:channels && pnpm smoke:bridge -- --bundled
cd src-tauri && cargo check
```

## CI 与下载

[`.github/workflows/desktop-release.yml`](../.github/workflows/desktop-release.yml) — 每次 push 到 `main`（或手动 `workflow_dispatch`）在三平台构建 Tauri 安装包，并发布到 GitHub Releases 标签 **[desktop-latest](https://github.com/ginuim/skill-base/releases/tag/desktop-latest)**，用户可直接在仓库 **Releases** 页下载，无需进入 Actions 里的 Artifacts。

同时会上传 Actions Artifacts（保留 90 天）供调试。

## 故障排查

| 现象 | 处理 |
|------|------|
| `bridge exited before ready` | 确认 `../cli` 已 `pnpm install`；检查 `node bridge/server.mjs`  stderr |
| `bundled Node not found` | 先 `pnpm prepare:resources` 或完整 `pnpm build` |
| `bridge script not found` | Release 需 `src-tauri/resources/bridge/server.mjs`；dev 用 `bridge/server.mjs` |
| Windows 安装提示无法写入 `resources\\node\\node.exe` | 旧版运行中的 bridge 会锁住安装目录里的 Node。先完全退出 Skill Base（必要时结束残留 `node.exe`）再点重试，不要点“忽略”；新版安装后运行时会改用缓存目录里的 Node 副本，避免后续覆盖安装继续锁安装资源 |
| Windows 打开后出现 `node.exe` CMD 窗口 | Rust 启动 bridge 时应带 `CREATE_NO_WINDOW`；重新构建安装包后验证 |
| Windows 打包版无错误信息 | 查看 Tauri app log 目录下的 `desktop.log`（Windows 通常在 `%LOCALAPPDATA%\\com.reaidea.skillbase\\logs\\desktop.log`）；bridge 非 JSON 响应会记录 HTTP 状态码和响应体片段 |
| 日志出现 `invalid bridge response ... Content Filter - Access Denied` | 本机 bridge IPC 被系统代理/内容过滤器劫持。Rust 调用 `127.0.0.1` bridge 时必须禁用代理；更新到包含该修复的版本后再验证 |
| IPC 调用无响应 | DevTools 看 `skb_invoke` 错误；确认 bridge 子进程已输出 `BRIDGE_READY` |
| 对话框/打开浏览器无效 | 5 个原生 channel 由 Rust 处理，见 [IPC.md](./IPC.md) |
| 安装到 `Universal (.agents)` 报 `EACCES: permission denied` | `Universal (.agents)` 的全局目录是 `~/.config/agents/skills`。先检查 `~/.config` / `~/.config/agents` 是否属于当前用户并可写（例如 `ls -ld ~/.config ~/.config/agents`）；修复权限后重试，或在桌面端改用“自定义目录”选择一个已授权的目标目录 |
| 搜索/安装失败 | 检查 `config:get.baseUrl` 与 Skill Base 服务是否可达 |

## 许可与待办

- **Node.js 二进制**：来自 [nodejs.org](https://nodejs.org/) 官方发行版，遵循 [Node.js 许可](https://github.com/nodejs/node/blob/main/LICENSE)；分发时需保留其 LICENSE（当前未自动打包，后续可加）。
- **macOS 签名/公证**：见 [docs/desktop-macos-signing.md](../docs/desktop-macos-signing.md)。配置 GitHub Secrets 后 CI 自动签名；未配置时会出现「已损坏」提示。
- **macOS x64**：CI 仅在 `macos-latest`（arm64）构建；需 Intel 包时加 `darwin-x64` job 或本地 `SKB_NODE_TARGET=darwin-x64 pnpm build`。
