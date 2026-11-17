<script setup>
import { computed, shallowRef, watch } from 'vue';
import { useI18n } from '../i18n/index.js';
import { agentStyle, agentBadgeVars, normalizeAgentId } from '../agents.js';
import { diffLines } from '../line-diff.js';

const props = defineProps({
  skill: { type: Object, required: true },
  profile: { type: String, default: '' },
  homeDir: { type: String, default: '' },
  local: Boolean,
  installed: Boolean,
  readInstalled: { type: Function, required: true },
  /** 全局 Agent 目标（config:getGlobalTargets），用于渲染 Agent 胶囊 */
  targets: { type: Array, default: () => [] },
  /** ({ skillId }) => versions[]，仅对比视图使用 */
  getVersions: { type: Function, default: null },
  /** ({ skillId, version }) => { content, truncated }，仅对比视图使用 */
  readVersion: { type: Function, default: null },
  /** 正在同步的胶囊 key（`${skillId}:${agentId}`），空字符串表示空闲 */
  agentBusy: { type: String, default: '' },
  rollbackBusy: Boolean
});

const emit = defineEmits(['install', 'versions', 'delete', 'reveal', 'online', 'toggle-agent', 'rollback']);
const { t } = useI18n();
const skillId = computed(() => props.skill.skillId || props.skill.id);
const version = computed(() => props.local ? props.skill.latest : props.skill.latest_version);
const canManageVersions = computed(() => props.local && props.skill.remoteAvailable);
const previewPath = shallowRef('');
const preview = shallowRef(null);
const previewFailed = shallowRef(false);

const mode = shallowRef('view');
const versionList = shallowRef(null);
const baseVersion = shallowRef('');
const diffState = shallowRef('idle');
const diffResult = shallowRef(null);
const diffError = shallowRef('');
let diffRequest = 0;

function displayPath(path) {
  const normalized = path.replaceAll('\\', '/');
  const home = props.homeDir.replaceAll('\\', '/').replace(/\/$/, '');
  return home && normalized.startsWith(home + '/') ? '~' + normalized.slice(home.length) : path;
}

watch(() => props.skill, () => {
  if (!props.skill.installs?.some((item) => item.installPath === previewPath.value)) {
    previewPath.value = '';
  }
});

watch([previewPath, () => props.skill], async ([installPath], _, onCleanup) => {
  preview.value = null;
  previewFailed.value = false;
  if (!installPath) return;
  let active = true;
  onCleanup(() => { active = false; });
  try {
    const result = await props.readInstalled({ skillId: skillId.value, installPath });
    if (active) preview.value = result;
  } catch {
    if (active) previewFailed.value = true;
  }
});

/** Agent 胶囊：全局目标 + 已有安装记录中的其它 Agent（只能移除） */
const agentCapsules = computed(() => {
  if (!props.local) return [];
  const byKey = new Map();
  for (const target of props.targets) {
    const key = normalizeAgentId(target.ide || target.id);
    if (!key || byKey.has(key)) continue;
    byKey.set(key, { key, name: target.name || key, target, installs: [] });
  }
  for (const install of props.skill.installs || []) {
    const key = normalizeAgentId(install.ide);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, { key, name: key, target: null, installs: [] });
    byKey.get(key).installs.push(install);
  }
  return [...byKey.values()].map((capsule) => ({ ...capsule, ...agentStyle(capsule.key, capsule.name) }));
});

const installedAgentCount = computed(() => agentCapsules.value.filter((capsule) => capsule.installs.length).length);

function capsuleBusy(capsule) {
  return Boolean(props.agentBusy) && props.agentBusy === `${skillId.value}:${capsule.key}`;
}

function capsuleTitle(capsule) {
  if (capsule.installs.length) return t('detail.agentOn', { agent: capsule.name });
  if (capsule.target && capsule.target.writable === false) {
    return capsule.target.writeError || t('install.dirNotWritableDetail');
  }
  return t('detail.agentOff', { agent: capsule.name });
}

/** 版本对比：当前版本固定为已安装版本，基准版本可选 */
const currentVersion = computed(() => props.skill.version || '');
const baseOptions = computed(() => (versionList.value || []).filter((item) => item.version !== currentVersion.value));
const baseIsOlder = computed(() => {
  const list = versionList.value || [];
  const current = list.findIndex((item) => item.version === currentVersion.value);
  const base = list.findIndex((item) => item.version === baseVersion.value);
  // 列表按发布时间倒序，基准下标更大即更旧
  return current === -1 || base === -1 ? true : base > current;
});
const rollbackLabel = computed(() => (baseIsOlder.value
  ? t('detail.rollbackTo', { version: baseVersion.value })
  : t('detail.switchTo', { version: baseVersion.value })));
const diffBusy = computed(() => diffState.value === 'loading');

function pickDefaultBase() {
  const list = versionList.value || [];
  const index = list.findIndex((item) => item.version === currentVersion.value);
  if (index !== -1 && list[index + 1]) return list[index + 1].version;
  return baseOptions.value[0]?.version || '';
}

async function refreshDiff() {
  if (!props.local || mode.value !== 'diff' || !props.getVersions || !props.readVersion) return;
  const request = ++diffRequest;
  const id = skillId.value;
  diffState.value = 'loading';
  try {
    if (!versionList.value) {
      const versions = await props.getVersions(id);
      if (request !== diffRequest) return;
      versionList.value = versions || [];
    }
    if (!baseOptions.value.some((item) => item.version === baseVersion.value)) {
      baseVersion.value = pickDefaultBase();
    }
    if (!baseVersion.value || !currentVersion.value) {
      diffResult.value = null;
      diffState.value = 'empty';
      return;
    }
    const [from, to] = await Promise.all([
      props.readVersion({ skillId: id, version: baseVersion.value }),
      props.readVersion({ skillId: id, version: currentVersion.value })
    ]);
    if (request !== diffRequest) return;
    const result = diffLines(from.content, to.content);
    diffResult.value = result;
    diffState.value = result.tooLarge ? 'tooLarge' : (result.hunks.length ? 'ready' : 'same');
  } catch (e) {
    if (request !== diffRequest) return;
    diffError.value = e?.message || String(e);
    diffState.value = 'error';
  }
}

function setMode(next) {
  mode.value = next;
}

function onBaseChange(event) {
  baseVersion.value = event.target.value;
  refreshDiff();
}

watch([mode, currentVersion, skillId], refreshDiff);
</script>

<template>
  <article class="skill-detail" aria-labelledby="skill-detail-title">
    <header class="detail-header">
      <div class="detail-identity">
        <span class="detail-icon" aria-hidden="true"><i class="fa-solid fa-cube"></i></span>
        <div>
          <h1 id="skill-detail-title">{{ skill.name || skillId }}</h1>
          <p class="detail-id">{{ skillId }}</p>
        </div>
      </div>
      <div class="detail-actions">
        <template v-if="local">
          <div class="mode-switch" role="tablist" :aria-label="t('detail.modeLabel')">
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'view'"
              :class="{ 'mode-switch-btn--active': mode === 'view' }"
              @click="setMode('view')"
            >{{ t('detail.view') }}</button>
            <button
              type="button"
              role="tab"
              :aria-selected="mode === 'diff'"
              :class="{ 'mode-switch-btn--active': mode === 'diff' }"
              @click="setMode('diff')"
            >{{ t('detail.diff') }}</button>
          </div>
          <button
            v-if="canManageVersions"
            type="button"
            :class="skill.hasUpdate ? 'btn-primary' : 'btn-ghost'"
            @click="emit('versions', skill)"
          >
            <i class="fa-solid fa-code-branch"></i>
            {{ t(skill.hasUpdate ? 'installed.update' : 'workspace.manageVersions') }}
          </button>
          <button type="button" class="btn-ghost" @click="emit('delete', skill)">
            <i class="fa-solid fa-trash-can"></i>
            {{ t('workspace.remove') }}
          </button>
        </template>
        <template v-else>
          <button type="button" class="btn-ghost" @click="emit('online', skill)">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            {{ t('workspace.openOnline') }}
          </button>
          <button v-if="!installed" type="button" class="btn-primary" @click="emit('install', skill)">
            <i class="fa-solid fa-download"></i>
            {{ t('market.install') }}
          </button>
          <span v-else class="installed-label"><i class="fa-solid fa-check"></i> {{ t('market.installed') }}</span>
        </template>
      </div>
    </header>

    <dl v-if="!local || canManageVersions" class="detail-meta">
      <div>
        <dt>{{ t('workspace.source') }}</dt>
        <dd>{{ profile }}</dd>
      </div>
      <div v-if="version">
        <dt>{{ t('workspace.latestVersion') }}</dt>
        <dd class="font-mono">{{ version }}</dd>
      </div>
      <div v-if="!local && (skill.owner?.name || skill.owner?.username)">
        <dt>{{ t('workspace.author') }}</dt>
        <dd>{{ skill.owner?.name || skill.owner?.username }}</dd>
      </div>
      <div v-if="!local">
        <dt>{{ t('market.downloads') }}</dt>
        <dd>{{ skill.download_count ?? 0 }}</dd>
      </div>
      <div v-if="!local">
        <dt>{{ t('market.favoriteCount') }}</dt>
        <dd>{{ skill.favorite_count ?? 0 }}</dd>
      </div>
    </dl>

    <section class="detail-section">
      <h2>{{ t('workspace.description') }}</h2>
      <p class="detail-description">{{ skill.description || t('collections.noDesc') }}</p>
      <ul v-if="!local && skill.tags?.length" class="detail-tags">
        <li v-for="tag in skill.tags" :key="tag.id">{{ tag.name }}</li>
      </ul>
    </section>

    <section v-if="local && agentCapsules.length" class="detail-section">
      <header class="section-heading">
        <h2>{{ t('detail.agents') }}</h2>
        <span>{{ installedAgentCount }}/{{ agentCapsules.length }}</span>
      </header>
      <p class="agent-hint">{{ t('detail.agentsHint') }}</p>
      <div class="agent-capsules">
        <button
          v-for="capsule in agentCapsules"
          :key="capsule.key"
          type="button"
          class="agent-capsule"
          :class="{ 'agent-capsule--on': capsule.installs.length > 0 }"
          :style="agentBadgeVars(capsule)"
          :aria-pressed="capsule.installs.length > 0"
          :disabled="Boolean(agentBusy) || rollbackBusy"
          :title="capsuleTitle(capsule)"
          @click="emit('toggle-agent', { skill, capsule })"
        >
          <span class="agent-capsule-badge" aria-hidden="true">{{ capsule.short }}</span>
          <span class="agent-capsule-name">{{ capsule.name }}</span>
          <i v-if="capsuleBusy(capsule)" class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i>
          <i v-else-if="capsule.installs.length" class="fa-solid fa-check agent-capsule-check" aria-hidden="true"></i>
        </button>
      </div>
    </section>

    <section v-if="local && mode === 'diff'" class="detail-section diff-section" aria-live="polite">
      <header class="diff-bar">
        <div class="diff-versions">
          <label class="diff-base">
            <span>{{ t('detail.diffBase') }}</span>
            <select :value="baseVersion" :disabled="diffBusy || !baseOptions.length" @change="onBaseChange">
              <option v-for="item in baseOptions" :key="item.version" :value="item.version">v{{ item.version }}</option>
            </select>
          </label>
          <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          <code class="diff-current">v{{ currentVersion }} <small>{{ t('detail.current') }}</small></code>
          <span v-if="diffState === 'ready' || diffState === 'same'" class="diff-stats">
            <b class="diff-stat-add">+{{ diffResult.additions }}</b>
            <b class="diff-stat-del">−{{ diffResult.deletions }}</b>
          </span>
        </div>
        <button
          v-if="baseVersion && skill.registryInstalls?.length"
          type="button"
          class="btn-ghost"
          :disabled="rollbackBusy || diffBusy"
          @click="emit('rollback', { skill, version: baseVersion })"
        >
          <i class="fa-solid fa-rotate-left" :class="{ 'fa-spin': rollbackBusy }"></i>
          {{ rollbackLabel }}
        </button>
      </header>

      <p v-if="diffState === 'loading'" class="diff-message">
        <i class="fa-solid fa-circle-notch fa-spin"></i> {{ t('detail.diffLoading') }}
      </p>
      <p v-else-if="diffState === 'empty'" class="diff-message">{{ t('detail.diffNoBase') }}</p>
      <p v-else-if="diffState === 'same'" class="diff-message">{{ t('detail.diffSame') }}</p>
      <p v-else-if="diffState === 'tooLarge'" class="diff-message">{{ t('detail.diffTooLarge') }}</p>
      <p v-else-if="diffState === 'error'" class="diff-message diff-message--error">
        {{ t('detail.diffFailed', { message: diffError }) }}
      </p>
      <div v-else-if="diffState === 'ready'" class="diff-file">
        <header>
          <strong>SKILL.md</strong>
          <small>v{{ baseVersion }} → v{{ currentVersion }}</small>
        </header>
        <div class="diff-lines">
          <template v-for="(hunk, hunkIndex) in diffResult.hunks" :key="hunkIndex">
            <div class="diff-hunk">{{ hunk.header }}</div>
            <div
              v-for="(line, lineIndex) in hunk.lines"
              :key="lineIndex"
              class="diff-line"
              :class="`diff-line--${line.type}`"
            ><span class="diff-sign">{{ line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' ' }}</span><span class="diff-text">{{ line.text || ' ' }}</span></div>
          </template>
        </div>
      </div>
    </section>

    <section v-if="local && mode === 'view'" class="detail-section">
      <header class="section-heading">
        <h2>{{ t('workspace.installLocations') }}</h2>
        <span>{{ skill.installs.length }}</span>
      </header>
      <ul class="install-locations">
        <li v-for="item in skill.installs" :key="item.installPath">
          <i class="fa-regular fa-folder" aria-hidden="true"></i>
          <div class="install-location">
            <button class="path-link" type="button" :title="item.installPath + '\n' + t('installed.revealHint')" @click="emit('reveal', item.installPath)">
              <i v-if="item.linked" class="fa-solid fa-link" :title="t('install.methodLink')" :aria-label="t('install.methodLink')"></i>
              {{ displayPath(item.installPath) }}
            </button>
            <span v-if="item.baseUrl" class="install-source">{{ item.baseUrl }}</span>
          </div>
          <code v-if="item.version">{{ item.version }}</code>
          <button
            type="button"
            class="btn-ghost preview-button"
            :aria-expanded="previewPath === item.installPath"
            @click="previewPath = previewPath === item.installPath ? '' : item.installPath"
          >
            {{ t('workspace.previewFile') }}
          </button>
        </li>
      </ul>
      <div v-if="previewPath" class="file-preview" aria-live="polite">
        <header>
          <strong>SKILL.md</strong>
          <small :title="previewPath">{{ displayPath(previewPath) }}</small>
        </header>
        <p v-if="previewFailed">{{ t('workspace.previewFailed') }}</p>
        <template v-else-if="preview">
          <pre>{{ preview.content }}</pre>
          <p v-if="preview.truncated">{{ t('workspace.previewTruncated') }}</p>
        </template>
        <p v-else>{{ t('installed.loading') }}</p>
      </div>
    </section>
  </article>
</template>

<style scoped>
.skill-detail {
  min-inline-size: 0;
  block-size: 100%;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  padding: clamp(1.25rem, 3vw, 2.75rem);
}

.detail-header,
.detail-identity,
.detail-actions,
.detail-meta,
.section-heading,
.install-locations li {
  display: flex;
  align-items: center;
}

.detail-header {
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
}

.detail-identity { gap: 0.875rem; min-inline-size: 0; }
.detail-icon {
  display: grid;
  place-items: center;
  inline-size: 2.75rem;
  block-size: 2.75rem;
  flex: none;
  border: 1px solid var(--color-base-800);
  border-radius: 0.625rem;
  background: var(--color-base-900);
  color: var(--color-accent-light);
}

h1 {
  margin: 0;
  color: var(--color-heading);
  font-size: clamp(1.4rem, 2.25vw, 2rem);
  line-height: 1.15;
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
}

.detail-id,
.install-source,
.file-preview small {
  font: 0.75rem/1.45 ui-monospace, monospace;
  color: var(--color-fg-muted);
  overflow-wrap: anywhere;
}
.detail-id { margin: 0.35rem 0 0; }
.detail-actions { flex-wrap: wrap; gap: 0.5rem; }
.installed-label { color: var(--color-fg-muted); font-size: 0.8125rem; }

.mode-switch {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  background: rgba(var(--color-base-950-rgb), 0.5);
}
.mode-switch button {
  padding: 0.25rem 0.625rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--color-fg-muted);
  font-size: 0.8125rem;
  cursor: pointer;
}
.mode-switch button:hover { color: var(--color-fg-strong); }
.mode-switch .mode-switch-btn--active {
  background: var(--row-active);
  color: var(--color-heading);
  font-weight: 650;
}

.detail-meta {
  margin: 1.5rem 0 0;
  padding-block: 1rem;
  border-block: 1px solid var(--color-base-800);
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.75rem 1.75rem;
}
.detail-meta div { min-inline-size: 0; }
.detail-meta dt { color: var(--color-fg-muted); font-size: 0.75rem; }
.detail-meta dd { margin: 0.375rem 0 0; color: var(--color-fg-strong); font-size: 0.875rem; overflow-wrap: anywhere; }

.detail-section { margin-top: 1.75rem; }
.detail-section + .detail-section { border-top: 1px solid var(--color-base-800); padding-top: 1.5rem; }
.detail-section h2 { margin: 0; color: var(--color-heading); font-size: 0.875rem; font-weight: 650; }
.detail-description { max-inline-size: 74ch; margin: 0.625rem 0 0; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }

.detail-tags,
.install-locations { padding: 0; list-style: none; }
.detail-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; }
.detail-tags li { padding: 0.25rem 0.5rem; border-radius: 0.375rem; background: var(--color-base-900); font-size: 0.75rem; overflow-wrap: anywhere; }
.section-heading { gap: 0.5rem; }
.section-heading span { font-size: 0.75rem; color: var(--color-fg-muted); font-variant-numeric: tabular-nums; }
.install-locations { margin: 0.75rem 0 0; }
.install-locations li {
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  padding-block: 0.75rem;
  border-bottom: 1px solid var(--color-base-800);
}
.install-locations li > i { color: var(--color-fg-muted); }
.install-location { flex: 1 1 10rem; min-inline-size: 0; }
.install-source { display: block; font-size: 0.6875rem; }
.install-locations code { color: var(--color-fg-muted); font-size: 0.75rem; overflow-wrap: anywhere; }
.path-link {
  border: 0;
  padding: 0;
  background: none;
  color: var(--color-fg-strong);
  font: 0.75rem/1.45 ui-monospace, monospace;
  text-align: start;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.path-link:hover { text-decoration: underline; }
.preview-button { font-size: 0.75rem; }
.preview-button[aria-expanded='true'] { border-color: var(--color-accent-soft); }
.file-preview {
  margin-top: 1rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  background: var(--color-base-900);
}
.file-preview header { display: grid; gap: 0.25rem; padding: 0.75rem; border-bottom: 1px solid var(--color-base-800); font-size: 0.8125rem; }
.file-preview p,
.file-preview pre { margin: 0; padding: 0.75rem; }
.file-preview pre { font-size: 0.75rem; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; }

/* Agent 胶囊：已安装使用 Agent 同色底与描边，未安装降低对比度 */
.agent-hint { margin: 0.375rem 0 0; color: var(--color-fg-muted); font-size: 0.75rem; }
.agent-capsules { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem; }
.agent-capsule {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-block-size: 1.875rem;
  padding: 0.25rem 0.625rem 0.25rem 0.3rem;
  border: 1px solid var(--color-base-800);
  border-radius: 9999px;
  background: transparent;
  color: var(--color-fg-muted);
  font-size: 0.75rem;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}
.agent-capsule:hover:not(:disabled) { opacity: 1; color: var(--color-fg-strong); }
.agent-capsule:disabled { cursor: progress; }
.agent-capsule--on {
  opacity: 1;
  color: var(--agent-color);
  background: var(--agent-tint);
  border-color: var(--agent-line);
}
.agent-capsule-badge {
  display: grid;
  place-items: center;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  border-radius: 9999px;
  color: var(--agent-color);
  background: var(--agent-tint);
  border: 1px solid var(--agent-line);
  font: 600 0.5rem/1 ui-monospace, monospace;
}
.agent-capsule--on .agent-capsule-badge { background: var(--color-base-950); }
.agent-capsule-name { font-weight: 550; }
.agent-capsule-check { font-size: 0.6875rem; }

/* 版本对比 */
.diff-section { display: grid; gap: 0.875rem; }
.diff-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  background: var(--color-base-900);
}
.diff-versions { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; min-inline-size: 0; font-size: 0.8125rem; }
.diff-versions > i { color: var(--color-fg-muted); font-size: 0.6875rem; }
.diff-base { display: inline-flex; align-items: center; gap: 0.375rem; color: var(--color-fg-muted); font-size: 0.75rem; white-space: nowrap; }
.diff-base select {
  min-block-size: 1.75rem;
  padding: 0.125rem 1.5rem 0.125rem 0.5rem;
  font: 0.75rem ui-monospace, monospace;
  background: var(--color-base-950);
}
.diff-current {
  padding: 0.125rem 0.5rem;
  border-radius: 0.375rem;
  background: var(--accent-bg-subtle);
  color: var(--color-accent-light);
  font: 0.75rem ui-monospace, monospace;
}
.diff-current small { color: var(--color-fg-muted); font-family: inherit; }
.diff-stats { display: inline-flex; gap: 0.5rem; font: 0.75rem ui-monospace, monospace; font-variant-numeric: tabular-nums; }
.diff-stat-add { color: var(--color-success); font-weight: 600; }
.diff-stat-del { color: var(--color-danger); font-weight: 600; }
.diff-message { margin: 0; padding: 1rem 0.25rem; color: var(--color-fg-muted); font-size: 0.8125rem; }
.diff-message--error { color: var(--color-danger); }
.diff-file {
  border: 1px solid var(--color-base-800);
  border-radius: 0.5rem;
  background: var(--color-base-950);
  overflow: hidden;
}
.diff-file > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-base-800);
  background: var(--color-base-900);
  font-size: 0.8125rem;
}
.diff-file > header small { color: var(--color-fg-muted); font: 0.6875rem ui-monospace, monospace; }
.diff-lines { overflow-x: auto; padding: 0.375rem 0; font: 0.75rem/1.65 ui-monospace, monospace; }
.diff-hunk { padding: 0.125rem 0.75rem; color: var(--color-fg-muted); background: rgba(var(--color-fg-muted-rgb), 0.08); white-space: pre; }
.diff-line { display: flex; min-inline-size: max-content; padding: 0 0.75rem; white-space: pre; color: var(--color-fg); }
.diff-line--add { background: rgba(var(--color-success-rgb), 0.14); color: var(--color-fg-strong); }
.diff-line--del { background: rgba(var(--color-danger-rgb), 0.14); color: var(--color-fg-strong); }
.diff-sign { flex: none; inline-size: 1.25rem; color: var(--color-fg-muted); user-select: none; }
.diff-line--add .diff-sign { color: var(--color-success); }
.diff-line--del .diff-sign { color: var(--color-danger); }
</style>
