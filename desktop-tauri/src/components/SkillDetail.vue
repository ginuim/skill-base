<script setup>
import { computed, shallowRef, watch } from 'vue';
import { useI18n } from '../i18n/index.js';

const props = defineProps({
  skill: { type: Object, required: true },
  profile: { type: String, default: '' },
  homeDir: { type: String, default: '' },
  local: Boolean,
  installed: Boolean,
  readInstalled: { type: Function, required: true }
});

const emit = defineEmits(['install', 'versions', 'delete', 'reveal', 'online']);
const { t } = useI18n();
const skillId = computed(() => props.skill.skillId || props.skill.id);
const version = computed(() => props.local ? props.skill.latest : props.skill.latest_version);
const canManageVersions = computed(() => props.local && props.skill.remoteAvailable);
const previewPath = shallowRef('');
const preview = shallowRef(null);
const previewFailed = shallowRef(false);

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

    <section v-if="local" class="detail-section">
      <header class="section-heading">
        <h2>{{ t('workspace.installLocations') }}</h2>
        <span>{{ skill.installs.length }}</span>
      </header>
      <ul class="install-locations">
        <li v-for="item in skill.installs" :key="item.installPath">
          <i class="fa-regular fa-folder" aria-hidden="true"></i>
          <div class="install-location">
            <button class="path-link" type="button" :title="item.installPath + '\n' + t('installed.revealHint')" @click="emit('reveal', item.installPath)">
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
.section-heading span { font-size: 0.75rem; color: var(--color-fg-muted); }
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
</style>
