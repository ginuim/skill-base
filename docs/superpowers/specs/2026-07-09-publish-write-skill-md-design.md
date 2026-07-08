# Publish 页「在线编写」SKILL.md 设计

## 背景

Publish 页已有两种发布方式：

1. 手动上传（文件夹 / zip）
2. 从 GitHub 导入

简单 Skill 往往只有一个 `SKILL.md`。用户为此去建目录、打 zip，或为了粘贴一段现成 Markdown 去走上传，成本偏高。需要在发布页直接写（或粘贴）单文件 `SKILL.md` 并发布。

## 目标

1. 在 Publish 页增加第三种发布方式：**在线编写**
2. Tab 顺序：`手动上传` → `在线编写` → `从 GitHub 导入`
3. 提供整份 `SKILL.md` 的 textarea，进入时预填 frontmatter + 标题 + 占位正文
4. 支持粘贴外部完整 `SKILL.md`（含 frontmatter）
5. 支持新建与更新已有 Skill（保留「选择 Skill」下拉）
6. 编辑内容经防抖解析后，同步到下方只读元信息（Skill ID / name / description）
7. 提交时在前端打成仅含 `SKILL.md` 的 zip，走现有 `POST /skills/publish`

## 非目标

1. 不做 Markdown 语法高亮 / 预览双栏
2. 不做多文件编辑（scripts、references 等）
3. 不新增后端「直接收 Markdown 文本」API
4. 不改上传 / GitHub 导入的既有行为
5. 不做富文本或可视化 frontmatter 表单（用户明确要整份粘贴）

## 方案选择

采用 **只改 PublishView + 复用现有 upload API**：

- 新增 `publishMode = 'write'`
- 客户端用 JSZip 生成单文件包
- 解析逻辑复用页面已有的 `parseSkillMdText` / `slugToSkillId`

不抽独立组件（当前只有一个入口，YAGNI）。不新增后端接口。

## 交互

### Tab

| 顺序 | mode     | 文案（中）   | 文案（英）        |
|------|----------|--------------|-------------------|
| 1    | upload   | 手动上传     | Manual upload     |
| 2    | write    | 在线编写     | Write SKILL.md    |
| 3    | github   | 从 GitHub 导入 | From GitHub     |

切换 mode 时：

- 离开 `write`：保留 `skillMdDraft` 与 changelog；不强制清空
- 进入 `write`：若 `skillMdDraft` 为空，写入预填模板；非空则不覆盖
- 覆盖 draft 的时机仅限：点「重置为模板」，或 write 模式下切换「选择 Skill」下拉
- 进入 `github`：仍走现有连通性检测；进入 write 时不触发 GitHub 检测
- 进入 `upload`：仍可清除 GitHub 预览（现有逻辑）

### 编辑器

- 单个 `<textarea>`，等宽字体，足够高度（约 16–20 行起，可纵向拉伸）
- 标签与简短 hint：说明可粘贴完整 SKILL.md；name/description 从 frontmatter 或正文解析
- 可选「重置为模板」按钮：用当前「新建 / 已选 Skill」上下文重新生成模板（会覆盖编辑器内容，需确认或直接覆盖——**定稿：直接覆盖，并 toast 提示已重置**）

### 预填模板

新建（「创建新 Skill」）时默认：

```markdown
---
name: my-skill
description: 一句话说明何时应使用此 Skill。
---

# my-skill

在此写具体指令、步骤与约束。
```

英文 UI 下模板正文用英文占位（i18n 两套模板字符串）。

选中已有 Skill 时，用该 Skill 的 `id` / `name` / `description` 生成模板：

```markdown
---
name: {skill.name 或 skill.id}
description: {skill.description，截断至 500}
---

# {skill.name 或 skill.id}

在此写具体指令、步骤与约束。
```

切换下拉「选择 Skill」时：若当前 mode 为 `write`，用新上下文重填模板（覆盖 draft）。从「已有」改回「创建新」同理。

### 元信息同步（防抖解析）

- 对 `skillMdDraft` 做约 **300ms** 防抖
- 调用现有 `parseSkillMdText`
- Skill ID：`slugToSkillId(parsed.name)`；解析不到则不强制清空已有 `form.skillId`（避免打字中间态抖动）；若解析结果有效则更新
- `form.name` / `form.description`：有解析结果则更新；description 截断 500
- 解析失败或空内容：不弹 error banner；提交时再校验
- 下方 Skill ID / name / description 在 write 模式下仍为 **只读**（与 upload 一致），由解析填充
- 可见性选择器：新建时显示（与现有 `showVisibilitySelector` 逻辑对齐；write 模式按 `isNewSkill`）

### 选择 Skill 下拉

- write 模式下 **可用**（不禁用）
- github 模式仍禁用（现有行为）
- 更新已有时：提交前校验解析出的 Skill ID 与下拉所选一致（与 upload 相同规则）

### 提交

1. 校验 draft 非空
2. 再解析一次（不依赖防抖是否已跑完）
3. Skill ID、新建时 name/description 校验同 upload
4. `JSZip`：写入路径 `SKILL.md`（单文件，无目录包裹）
5. `FormData`：`zip_file` + `skill_id` +（新建时）`name` / `description` / `visibility` + 可选 `changelog`
6. `skillsApi.upload`；进度条与成功跳转复用现有逻辑

zip 内路径约定：根级 `SKILL.md`。平台已有 `pickSkillMdPath` 兼容任意深度；根级最简单。

### canPublish（write）

- draft 非空（trim 后）
- 新建：解析后 name 非空，且能得到合法 skillId（或 form.skillId 合法）
- 更新：selectedFiles 语义改为「有可发布内容」——write 下用 draft 非空即可；仍要求 skillId 合法；若选了已有 Skill，skillId 须与所选一致

具体实现可把 `canPublish` 扩成三分支：`github` | `write` | `upload`。

## 数据流

```
skillMdDraft (textarea)
    │
    ├─ debounce 300ms ──► parseSkillMdText / slugToSkillId ──► form.skillId, name, description
    │
    └─ submit ──► parse again ──► JSZip(SKILL.md) ──► skillsApi.upload(FormData)
```

状态字段（新增）：

- `publishMode`: `'upload' | 'write' | 'github'`
- `skillMdDraft: string`
- 防抖 timer（组件内，卸载时 clear）

不改 API、不改 DB。

## i18n

在 `useI18n.ts` 中英各增至少：

- `publish.tabWrite`
- `publish.writeHeading` / `publish.writeHint`
- `publish.writePlaceholder`（可选）
- `publish.writeResetTemplate`
- `publish.writeTemplate`（整份默认模板，或拆 name/description/body 占位再拼接）
- `publish.writeEmpty` / `publish.writeParseFailed`（提交错误文案）

模板字符串建议用函数或带占位的 i18n，避免中英硬编码在逻辑里分叉过多。

## 错误处理

| 场景 | 行为 |
|------|------|
| draft 为空点发布 | error：请编写或粘贴 SKILL.md |
| 无 name / 无法得到 skillId | error：与现有「SKILL.md 中缺少…」同类文案 |
| 更新时 ID 与下拉不一致 | 同 upload 现有提示 |
| 上传 API 失败 | 同现有 `err.message` |

## 测试建议

手工：

1. 新建：默认模板 → 改 name/description → 元信息防抖更新 → 发布成功
2. 粘贴外部完整 SKILL.md → 元信息正确 → 发布
3. 选已有 Skill → 模板带入 → 改正文发布新版本
4. 选已有但改 frontmatter name 导致 ID 不一致 → 提交报错
5. Tab 切换：write ↔ upload ↔ github，互不污染关键状态
6. 中英文切换下模板与 Tab 文案正确

自动化（可选，本迭代不强制）：对 `buildSkillMdTemplate` / 防抖解析抽纯函数后单测。

## 文件改动范围

- `web/src/views/PublishView.vue` — Tab、编辑器、模式逻辑、提交
- `web/src/composables/useI18n.ts` — 文案

不改：

- `src/routes/publish.js` / `publish-skill` 工具
- API 类型（仍用 FormData upload）

## 风险与后续

- 防抖实时解析在「边打 frontmatter」时可能短暂显示半截 name；可接受，上线后按手感再调（改为失焦解析等）
- PublishView 会继续变长；若后续再加模式，再抽 composable / 子组件
