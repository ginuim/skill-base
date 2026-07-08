# Publish Write SKILL.md Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Publish 页增加「在线编写」Tab（位于上传与 GitHub 之间），支持预填/粘贴整份 SKILL.md，防抖解析元信息，并打成单文件 zip 走现有 publish API。

**Architecture:** 仅改前端。`publishMode` 扩展为 `'upload' | 'write' | 'github'`；`skillMdDraft` 驱动 textarea；复用页面内 `parseSkillMdText` / `slugToSkillId`；提交时用 JSZip 生成根级 `SKILL.md` 再 `skillsApi.upload`。模板文案走 i18n。

**Tech Stack:** Vue 3 `<script setup>` + TypeScript, JSZip, 现有 `useI18n` / `skillsApi`

**Spec:** `docs/superpowers/specs/2026-07-09-publish-write-skill-md-design.md`

---

## File map

| File | Responsibility |
|------|----------------|
| `web/src/composables/useI18n.ts` | 中英 Tab / 编辑器 / 模板 / 错误文案 |
| `web/src/views/PublishView.vue` | Tab、编辑器 UI、draft/防抖/提交逻辑 |
| `web/src/utils/publish-skill-md.ts` | 纯函数：拼模板、从解析结果推导 skillId（便于阅读与后续单测） |

不改后端、不改 API。

**Note on tests:** `web/` 无 Vitest/Jest。本计划用 `pnpm type-check` + 手工清单验收；纯函数放独立文件，不强制新增 node 测试 harness。

---

### Task 1: i18n 文案

**Files:**
- Modify: `web/src/composables/useI18n.ts`

- [ ] **Step 1: 在中文 `messages`（约 `publish.tabGithub` 附近）插入键**

在 `'publish.tabUpload': '手动上传',` 与 `'publish.tabGithub': '从 GitHub 导入',` 之间加入：

```ts
'publish.tabWrite': '在线编写',
```

在同一中文 publish 区块（`visibility` 键之前）追加：

```ts
'publish.writeHeading': '编写 SKILL.md',
'publish.writeHint':
  '可直接粘贴完整 SKILL.md（含 frontmatter）。名称与描述会从 frontmatter 或正文标题/首段解析到下方。',
'publish.writePlaceholder': '在此编写或粘贴 SKILL.md…',
'publish.writeResetTemplate': '重置为模板',
'publish.writeResetToast': '已重置为模板',
'publish.writeEmpty': '请编写或粘贴 SKILL.md',
'publish.writeMissingId': '无法从 SKILL.md 解析出合法 Skill ID（请检查 frontmatter name）',
'publish.writeBodyPlaceholder': '在此写具体指令、步骤与约束。',
'publish.writeDefaultName': 'my-skill',
'publish.writeDefaultDescription': '一句话说明何时应使用此 Skill。',
```

- [ ] **Step 2: 在英文 `messages` 对应位置插入**

```ts
'publish.tabWrite': 'Write SKILL.md',
'publish.writeHeading': 'Write SKILL.md',
'publish.writeHint':
  'Paste a full SKILL.md (including frontmatter) if you have one. Name and description sync below from frontmatter or the first heading/paragraph.',
'publish.writePlaceholder': 'Write or paste SKILL.md here…',
'publish.writeResetTemplate': 'Reset to template',
'publish.writeResetToast': 'Reset to template',
'publish.writeEmpty': 'Write or paste a SKILL.md first',
'publish.writeMissingId':
  'Could not derive a valid Skill ID from SKILL.md (check frontmatter name)',
'publish.writeBodyPlaceholder': 'Write instructions, steps, and constraints here.',
'publish.writeDefaultName': 'my-skill',
'publish.writeDefaultDescription': 'One sentence on when to use this skill.',
```

- [ ] **Step 3: Commit**

```bash
git add web/src/composables/useI18n.ts
git commit -m "$(cat <<'EOF'
feat(i18n): add publish write-mode copy

EOF
)"
```

（若在工作时间 9:00–19:00 工作日提交，按 git-commit-skill 将 AUTHOR/COMMITTER 时间调到当天早上，且晚于上一次 commit。）

---

### Task 2: 纯函数 `publish-skill-md.ts`

**Files:**
- Create: `web/src/utils/publish-skill-md.ts`

- [ ] **Step 1: 新建文件，导出模板与 skillId 辅助函数**

```ts
const DESC_MAX = 500

export type SkillMdTemplateInput = {
  name: string
  description: string
  bodyPlaceholder: string
}

/** Build a minimal single-file SKILL.md with YAML frontmatter. */
export function buildSkillMdTemplate(input: SkillMdTemplateInput): string {
  const name = (input.name || 'my-skill').trim() || 'my-skill'
  let description = (input.description || '').trim()
  if (description.length > DESC_MAX) description = description.slice(0, DESC_MAX)
  const body = (input.bodyPlaceholder || '').trim() || 'Write instructions here.'
  return [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    '---',
    '',
    `# ${name}`,
    '',
    body,
    '',
  ].join('\n')
}

/**
 * Prefer slug from parsed name; keep previousId when slug empty
 * so mid-edit frontmatter does not wipe the field.
 */
export function skillIdFromParsedName(parsedName: string, previousId: string): string {
  const raw = (parsedName || '').trim()
  if (!raw) return previousId
  const slug = slugifySkillId(raw)
  return slug || previousId
}

export function slugifySkillId(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''
  let s = raw.trim().replace(/\.zip$/i, '')
  s = s.toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9\-]+/g, '')
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '')
  if (!s || !/^[a-z0-9\-_]+$/.test(s)) return ''
  return s
}
```

说明：`PublishView` 里已有 `slugToSkillId`；本文件的 `slugifySkillId` 与之逻辑一致。Task 3 可让页面改用 `slugifySkillId` 替换本地 `slugToSkillId`，或暂时两处并存、页面继续用本地函数且只 import `buildSkillMdTemplate` / `skillIdFromParsedName`。**定稿：页面改用本文件的 `slugifySkillId`，删除本地 `slugToSkillId`，避免分叉。**

- [ ] **Step 2: Commit**

```bash
git add web/src/utils/publish-skill-md.ts
git commit -m "$(cat <<'EOF'
feat(web): add SKILL.md template helpers

EOF
)"
```

---

### Task 3: PublishView — Tab + 编辑器 UI

**Files:**
- Modify: `web/src/views/PublishView.vue`（template 顶部 tabs + write 面板）

- [ ] **Step 1: 在 upload 与 github 两个 tab 按钮之间插入 write tab**

```vue
<button
  type="button"
  role="tab"
  :aria-selected="publishMode === 'write'"
  class="publish-mode-tab"
  :class="{ active: publishMode === 'write' }"
  @click="setPublishMode('write')"
>
  {{ t('publish.tabWrite') }}
</button>
```

- [ ] **Step 2: 在「文件上传」`v-show="publishMode === 'upload'"` 区块之后、「Skill 选择」之前，插入 write 面板**

```vue
<!-- 在线编写 -->
<div v-show="publishMode === 'write'" class="form-group write-skill-panel">
  <div class="write-skill-header">
    <div class="min-w-0">
      <label for="skill-md-editor" class="form-label font-mono text-neon-400 mb-1 block">
        {{ t('publish.writeHeading') }}
      </label>
      <p class="write-skill-hint">{{ t('publish.writeHint') }}</p>
    </div>
    <button
      type="button"
      class="write-reset-action"
      :disabled="isPublishing"
      @click="resetSkillMdTemplate"
    >
      {{ t('publish.writeResetTemplate') }}
    </button>
  </div>
  <textarea
    id="skill-md-editor"
    v-model="skillMdDraft"
    rows="18"
    class="rounded-lg px-4 py-2.5 w-full write-skill-editor"
    :disabled="isPublishing"
    :placeholder="t('publish.writePlaceholder')"
    spellcheck="false"
  ></textarea>
</div>
```

- [ ] **Step 3: 补充 scoped 样式（贴在现有 `.publish-mode-tabs` 附近即可）**

```css
.write-skill-panel {
  border: 1px solid var(--color-base-800);
  border-radius: 1rem;
  padding: 1.25rem;
  background: color-mix(in srgb, var(--color-base-900) 82%, transparent);
}
.write-skill-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}
.write-skill-hint {
  color: var(--color-base-400);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8125rem;
  line-height: 1.65;
}
.write-reset-action {
  flex-shrink: 0;
  border: 1px solid var(--color-base-700);
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  background: color-mix(in srgb, var(--color-base-950) 72%, transparent);
  color: var(--color-base-300);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  cursor: pointer;
}
.write-reset-action:hover:not(:disabled) {
  border-color: rgba(var(--color-neon-rgb), 0.45);
  color: var(--color-fg-strong);
}
.write-reset-action:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.write-skill-editor {
  min-height: 18rem;
  resize: vertical;
  line-height: 1.55;
}
@media (max-width: 640px) {
  .write-skill-header {
    display: grid;
  }
  .write-reset-action {
    width: 100%;
  }
}
```

- [ ] **Step 4: Commit UI-only 变更（若 script 尚未改完，可与 Task 4 合并为一个 commit；推荐与 Task 4 一起提交，本步可跳过单独 commit）**

---

### Task 4: PublishView — script 逻辑

**Files:**
- Modify: `web/src/views/PublishView.vue`（`<script setup>`）

- [ ] **Step 1: 增加 import 与类型**

```ts
import { onUnmounted } from 'vue' // 若已有 onMounted，合并进同一行
import {
  buildSkillMdTemplate,
  skillIdFromParsedName,
  slugifySkillId,
} from '@/utils/publish-skill-md'
```

删除本地 `function slugToSkillId`，所有调用改为 `slugifySkillId`。

- [ ] **Step 2: 扩展 mode 与 draft 状态**

```ts
type PublishMode = 'upload' | 'write' | 'github'
const skillMdDraft = ref('')
let skillMdParseTimer: ReturnType<typeof setTimeout> | null = null

function clearSkillMdParseTimer() {
  if (skillMdParseTimer != null) {
    clearTimeout(skillMdParseTimer)
    skillMdParseTimer = null
  }
}

onUnmounted(() => {
  clearSkillMdParseTimer()
})
```

- [ ] **Step 3: 模板生成与重置**

```ts
function currentWriteTemplate(): string {
  const bodyPlaceholder = t('publish.writeBodyPlaceholder')
  if (selectedExistingId.value) {
    const skill = mySkills.value.find((s) => s.id === selectedExistingId.value)
    const name = (skill?.name || skill?.id || t('publish.writeDefaultName')).trim()
    const description = (skill?.description || t('publish.writeDefaultDescription')).trim()
    return buildSkillMdTemplate({ name, description, bodyPlaceholder })
  }
  return buildSkillMdTemplate({
    name: t('publish.writeDefaultName'),
    description: t('publish.writeDefaultDescription'),
    bodyPlaceholder,
  })
}

function applySkillMdParse(text: string) {
  const parsed = parseSkillMdText(text)
  if (parsed.name) {
    form.value.skillId = skillIdFromParsedName(parsed.name, form.value.skillId)
    form.value.name = parsed.name
  }
  if (parsed.description) {
    form.value.description = parsed.description.slice(0, DESC_MAX)
  }
}

function fillSkillMdTemplate(opts?: { toast?: boolean }) {
  skillMdDraft.value = currentWriteTemplate()
  applySkillMdParse(skillMdDraft.value)
  if (opts?.toast) globalToast.success(t('publish.writeResetToast'))
}

function resetSkillMdTemplate() {
  fillSkillMdTemplate({ toast: true })
}
```

- [ ] **Step 4: 防抖 watch + 下拉联动**

```ts
watch(skillMdDraft, (text) => {
  if (publishMode.value !== 'write') return
  clearSkillMdParseTimer()
  skillMdParseTimer = setTimeout(() => {
    skillMdParseTimer = null
    if (!text.trim()) return
    applySkillMdParse(text)
  }, 300)
})

watch(selectedExistingId, () => {
  if (publishMode.value !== 'write') return
  fillSkillMdTemplate()
})
```

注意：`fillSkillMdTemplate` 会改 `skillMdDraft`，从而触发防抖 watch；可接受（再解析一次）。若担心循环，`fillSkillMdTemplate` 内已同步 `applySkillMdParse`，防抖结果应一致。

- [ ] **Step 5: 改 `setPublishMode`**

```ts
function setPublishMode(mode: PublishMode) {
  if (mode === publishMode.value) return
  if (mode === 'upload') {
    clearGithubImport()
  }
  publishMode.value = mode
  if (mode === 'github') {
    fetchGithubConnectivity()
  }
  if (mode === 'write') {
    clearGithubImport() // 或仅清 preview；与 upload 进入时一致清 GitHub 状态即可
    if (!skillMdDraft.value.trim()) fillSkillMdTemplate()
    else applySkillMdParse(skillMdDraft.value)
  }
}
```

Spec：进入 write 时不触发 GitHub 连通性检测。离开 write 保留 draft。`clearGithubImport` 会清空 `form.name/description`——若在已有 draft 时调用，随后 `applySkillMdParse` 会填回。若 draft 为空则 `fillSkillMdTemplate` 填回。顺序必须是：先 `publishMode = write`，再 clear GitHub，再 fill/parse。

更稳妥的顺序：

```ts
function setPublishMode(mode: PublishMode) {
  if (mode === publishMode.value) return
  const prev = publishMode.value
  publishMode.value = mode
  if (mode === 'upload' && prev === 'github') clearGithubImport()
  if (mode === 'write') {
    githubPreview.value = null
    githubTargetId.value = ''
    if (!skillMdDraft.value.trim()) fillSkillMdTemplate()
    else applySkillMdParse(skillMdDraft.value)
  }
  if (mode === 'github') {
    fetchGithubConnectivity()
  }
  if (mode === 'upload' && prev === 'write') {
    // 保留 draft；不强制清 upload 文件
  }
}
```

实现时以 spec 为准：进入 upload 时「仍可清除 GitHub 预览（现有逻辑）」——保留现有 `if (mode === 'upload') clearGithubImport()`；进入 write 时清 GitHub preview 字段即可，**不要**调用会清空 form 的完整 `clearGithubImport`，除非紧接着 fill/parse。推荐进入 write 时：

```ts
githubPreview.value = null
githubTargetId.value = ''
```

- [ ] **Step 6: 扩展 `showVisibilitySelector` 与 `canPublish`**

`showVisibilitySelector`：write 与 upload 一样，非 github 时看 `isNewSkill`（现有 `return isNewSkill.value` 已覆盖 write）。

`canPublish`：

```ts
const canPublish = computed(() => {
  if (publishMode.value === 'github') {
    // 保持现有 github 分支不变
    ...
  }
  if (publishMode.value === 'write') {
    if (!skillMdDraft.value.trim()) return false
    const parsed = parseSkillMdText(skillMdDraft.value)
    const skillId = skillIdFromParsedName(parsed.name, form.value.skillId).trim()
    if (!/^[a-z0-9\-_]+$/.test(skillId)) return false
    if (selectedExistingId.value && selectedExistingId.value !== skillId) return false
    if (isNewSkill.value) {
      return !!(parsed.name || form.value.name).trim()
    }
    return true
  }
  // upload 分支保持不变
  ...
})
```

- [ ] **Step 7: Skill 下拉禁用条件保持仅 github**

```vue
:disabled="isPublishing || publishMode === 'github'"
```

（已是这样则不动。）

- [ ] **Step 8: `handlePublish` 增加 write 分支**

在 `if (publishMode.value === 'github')` 之后、`if (!selectedZipBlob.value) return` 之前：

```ts
if (publishMode.value === 'write') {
  await handleWritePublish()
  return
}
```

新增：

```ts
async function handleWritePublish() {
  const draft = skillMdDraft.value.trim()
  if (!draft) {
    error.value = t('publish.writeEmpty')
    return
  }
  const parsed = parseSkillMdText(draft)
  applySkillMdParse(draft)
  const skillId = form.value.skillId.trim()
  if (!skillId) {
    error.value = t('publish.writeMissingId')
    return
  }
  if (!/^[a-z0-9\-_]+$/.test(skillId)) {
    error.value = t('publish.invalidSkillId')
    return
  }
  if (selectedExistingId.value && selectedExistingId.value !== skillId) {
    error.value = '上传包的 Skill ID 与下拉框所选已有 Skill 不一致，请重新选择或更换压缩包'
    return
  }
  if (isNewSkill.value) {
    const name = form.value.name.trim()
    if (!name) {
      error.value = 'SKILL.md 中缺少可用的 Skill 名称'
      return
    }
    const desc = form.value.description.trim()
    if (!desc) {
      error.value = 'SKILL.md 中缺少描述'
      return
    }
    if (desc.length > DESC_MAX) {
      error.value = `描述不能超过 ${DESC_MAX} 字`
      return
    }
  }

  isPublishing.value = true
  progress.value = 0
  progressText.value = t('publish.preparing')
  error.value = ''

  try {
    const zip = new JSZip()
    zip.file('SKILL.md', skillMdDraft.value)
    const blob = await zip.generateAsync({ type: 'blob' })
    selectedZipBlob.value = blob
    selectedFileName.value = 'skill-package.zip'

    progressText.value = t('publish.uploading')
    const progressInterval = setInterval(() => {
      if (progress.value < 90) progress.value += Math.random() * 15
    }, 200)

    const formData = new FormData()
    formData.append('zip_file', blob, 'skill-package.zip')
    formData.append('skill_id', skillId)
    if (isNewSkill.value) {
      formData.append('name', form.value.name.trim())
      formData.append('description', form.value.description.trim())
      formData.append('visibility', newSkillVisibility.value)
    }
    if (form.value.changelog.trim()) {
      formData.append('changelog', form.value.changelog.trim())
    }

    await skillsApi.upload(formData)
    clearInterval(progressInterval)
    progress.value = 100
    progressText.value = t('publish.completed')
    setTimeout(() => {
      router.push('/')
    }, 1000)
  } catch (err: any) {
    error.value = err.message || t('publish.uploadFailed')
    isPublishing.value = false
  }
}
```

- [ ] **Step 9: 运行 type-check**

```bash
cd web && pnpm type-check
```

Expected: 无错误。

- [ ] **Step 10: Commit**

```bash
git add web/src/views/PublishView.vue web/src/utils/publish-skill-md.ts web/src/composables/useI18n.ts
git commit -m "$(cat <<'EOF'
feat(publish): add online SKILL.md write mode

EOF
)"
```

---

### Task 5: 手工验收

**Files:** 无代码改动

- [ ] **Step 1: 启动 web + 后端，打开 `/publish`（需登录）**

```bash
# 仓库根目录按项目习惯启动服务端；web:
cd web && pnpm dev
```

- [ ] **Step 2: 按清单勾选**

1. Tab 顺序：手动上传 | 在线编写 | 从 GitHub 导入  
2. 进「在线编写」：textarea 有默认 frontmatter 模板；下方元信息约 300ms 内填上  
3. 改 `name:` / `description:`：元信息防抖更新；Skill ID 随 name slug 变  
4. 粘贴外部完整 SKILL.md：元信息正确  
5. 「重置为模板」：覆盖内容 + toast  
6. 选已有 Skill：模板带入该 skill 的 name/description；发布走更新（需真发一次或至少 canPublish / 网络面板确认 FormData）  
7. 选已有但改 name 导致 ID 不一致：发布按钮 disabled 或提交报错  
8. 切到 GitHub 再切回 write：draft 仍在  
9. 中英文切换：Tab 与 hint / 默认模板语言正确  

- [ ] **Step 3: 若有小修，修完再 type-check + commit**

```bash
cd web && pnpm type-check
git add -u web/
git commit -m "$(cat <<'EOF'
fix(publish): polish write-mode edge cases

EOF
)"
```

---

## Spec coverage checklist

| Spec 项 | Task |
|---------|------|
| Tab 顺序 upload → write → github | 3 |
| 整份 textarea + 预填 | 2, 3, 4 |
| 粘贴完整 SKILL.md | 4（无特殊限制） |
| 新建 + 更新已有 | 4 |
| 300ms 防抖解析 | 4 |
| 单文件 zip + 现有 upload | 4 |
| i18n | 1 |
| 不改后端 | — |
| 重置模板 + toast | 4 |
| 离开 write 保留 draft | 4 |

## Self-review notes

- 无 TBD/placeholder 步骤  
- `slugifySkillId` 与页面旧 `slugToSkillId` 合并，避免双实现  
- `canPublish` write 分支与 `handleWritePublish` 校验对齐  
- 进入 write 时避免盲目 `clearGithubImport()` 把已解析 form 清掉后再忘记 fill  
