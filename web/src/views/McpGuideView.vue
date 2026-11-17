<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { BookOpen, ChevronDown, Copy, Download, KeyRound, Plug, Terminal } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { globalToast } from '@/composables/useToast'
import { apiBasePath, withBasePath } from '@/utils/basePath'
import { copyToClipboard } from '@/utils/clipboard'

const { t } = useI18n()
const route = useRoute()
const skillGroups = [
  {
    id: 'using-skill-base', title: 'mcp.useSkills',
    skills: [
      { id: 'skill-base', title: 'mcp.webSkill', description: 'mcp.webSkillHint', usage: 'mcp.webSkillUsage' },
      { id: 'skill-base-cli', title: 'mcp.cliSkill', description: 'mcp.cliSkillHint', usage: 'mcp.cliSkillUsage' },
    ],
  },
  {
    id: 'deploying-skill-base', title: 'mcp.deploySkills',
    skills: [
      { id: 'skill-base-web-deploy', title: 'mcp.deploySkill', description: 'mcp.deploySkillHint', usage: 'mcp.deploySkillUsage' },
    ],
  },
] as const

const tabs = [
  { id: 'manual', label: 'mcp.manualTab' },
  { id: 'agent', label: 'mcp.agentTab' },
] as const
type SetupTab = typeof tabs[number]['id']
const activeTab = ref<SetupTab>('manual')
const tabList = ref<HTMLElement | null>(null)

async function moveTab(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  if (event.key === 'Home') activeTab.value = 'manual'
  else if (event.key === 'End') activeTab.value = 'agent'
  else activeTab.value = activeTab.value === 'manual' ? 'agent' : 'manual'
  await nextTick()
  tabList.value?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus()
}

const activeGroup = computed(() =>
  skillGroups.find(group => group.skills.some(skill => skill.id === route.params.skill)),
)

function skillDownloadUrl(id: string) {
  return new URL(`${apiBasePath}/official-skills/${id}/download`, window.location.origin).href
}

function skillInstallPrompt(id: string) {
  return t('mcp.skillInstallPrompt', { id, url: skillDownloadUrl(id) })
}

const endpoint = new URL(withBasePath('/mcp'), window.location.origin).href
const agentPrompt = computed(() => t('mcp.agentPrompt', { url: endpoint }))
const tools = [
  ['search_skills', 'mcp.searchSkills'],
  ['list_collections', 'mcp.listCollections'],
  ['get_skill_versions', 'mcp.getVersions'],
  ['read_skill_file', 'mcp.readFile'],
  ['set_skill_favorite', 'mcp.setFavorite'],
  ['publish_skill', 'mcp.publishSkill'],
] as const

async function copy(text: string) {
  if (await copyToClipboard(text)) {
    globalToast.success(t('mcp.copied'))
  } else {
    globalToast.error(t('mcp.copyFailed'))
  }
}
</script>

<template>
  <article class="mcp-guide max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
    <header class="list-page-header">
      <h1>{{ t('mcp.hubTitle') }}</h1>
      <p>{{ t('mcp.hubDescription') }}</p>
    </header>

    <div class="guide-layout">
      <nav class="guide-menu" :aria-label="t('mcp.hubTitle')">
        <router-link
          :to="{ name: 'mcp-guide', params: { skill: '' } }"
          :class="{ 'is-current': !activeGroup }"
        >
          <Plug :size="16" aria-hidden="true" /> MCP
        </router-link>
        <router-link
          v-for="group in skillGroups"
          :key="group.id"
          :to="{ name: 'mcp-guide', params: { skill: group.skills[0].id } }"
          :class="{ 'is-current': activeGroup?.id === group.id }"
        >
          <component :is="group.id === 'using-skill-base' ? Terminal : BookOpen" :size="16" aria-hidden="true" />
          {{ t(group.title) }}
        </router-link>
      </nav>

      <div class="flat-page guide-content">
        <section v-if="!activeGroup" aria-labelledby="mcp-setup">
          <h2 id="mcp-setup">{{ t('mcp.menuConnection') }}</h2>
          <div ref="tabList" class="setup-tabs" role="tablist" :aria-label="t('mcp.menuConnection')" @keydown="moveTab">
            <button
              v-for="tab in tabs"
              :id="`mcp-tab-${tab.id}`"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              :aria-controls="`mcp-panel-${tab.id}`"
              :tabindex="activeTab === tab.id ? 0 : -1"
              @click="activeTab = tab.id"
            >{{ t(tab.label) }}</button>
          </div>

          <div
            v-show="activeTab === 'manual'"
            id="mcp-panel-manual"
            class="setup-panel"
            role="tabpanel"
            aria-labelledby="mcp-tab-manual"
          >
            <p>{{ t('mcp.connectHint') }}</p>
            <div class="endpoint-row">
              <code>{{ endpoint }}</code>
              <button type="button" class="flat-primary" @click="copy(endpoint)">
                <Copy :size="16" aria-hidden="true" />{{ t('mcp.copyUrl') }}
              </button>
            </div>

            <details class="auth-disclosure">
              <summary>
                <KeyRound :size="16" aria-hidden="true" />
                <span>{{ t('mcp.authTitle') }}</span>
                <ChevronDown class="auth-chevron" :size="16" aria-hidden="true" />
              </summary>
              <p>{{ t('mcp.authHint') }}</p>
              <pre><code>Authorization: Bearer &lt;PAT&gt;</code></pre>
              <p>{{ t('mcp.tokenHint') }}</p>
            </details>
          </div>

          <div
            v-show="activeTab === 'agent'"
            id="mcp-panel-agent"
            class="setup-panel"
            role="tabpanel"
            aria-labelledby="mcp-tab-agent"
          >
            <p>{{ t('mcp.agentHint') }}</p>
            <pre><code>{{ agentPrompt }}</code></pre>
            <button type="button" class="flat-secondary" @click="copy(agentPrompt)">
              <Copy :size="16" aria-hidden="true" />{{ t('mcp.copyPrompt') }}
            </button>
          </div>

          <section class="mcp-tools" aria-labelledby="mcp-tools-title">
            <h3 id="mcp-tools-title">{{ t('mcp.toolsTitle') }}</h3>
            <dl class="tool-list">
              <div v-for="[name, description] in tools" :key="name">
                <dt><code>{{ name }}</code></dt>
                <dd>{{ t(description) }}</dd>
              </div>
            </dl>
          </section>
        </section>

        <section v-else :aria-labelledby="activeGroup.id">
          <h2 :id="activeGroup.id">{{ t(activeGroup.title) }}</h2>
          <div v-for="skill in activeGroup.skills" :id="skill.id" :key="skill.id" class="skill-entry">
            <h3>{{ t(skill.title) }}</h3>
            <p>{{ t(skill.description) }}</p>
            <p>{{ t(skill.usage) }}</p>
            <div class="skill-guide-actions">
              <a :href="skillDownloadUrl(skill.id)" :download="`${skill.id}.zip`" class="flat-secondary">
                <Download :size="16" aria-hidden="true" />{{ t('mcp.downloadSkill') }}
              </a>
              <button type="button" class="flat-secondary" @click="copy(skillInstallPrompt(skill.id))">
                <Copy :size="16" aria-hidden="true" />{{ t('mcp.copyInstallPrompt') }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.guide-layout {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  align-items: start;
  gap: 36px;
}

.guide-menu {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.guide-menu a {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: var(--control-height);
  padding: 8px 10px;
  border-radius: var(--control-radius);
  color: var(--color-base-400);
  font-size: 14px;
}

.guide-menu a:hover,
.guide-menu .is-current {
  color: var(--color-fg-strong);
  background: color-mix(in srgb, var(--color-fg-strong) 8%, transparent);
}

@media (max-width: 760px) {
  .guide-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }

  .guide-menu {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

.setup-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 24px;
  border-bottom: 1px solid var(--color-base-800);
}

.setup-tabs button {
  min-height: var(--control-height);
  padding: 8px 0;
  border-bottom: 2px solid transparent;
  color: var(--color-base-400);
  font-size: 14px;
  cursor: pointer;
}

.setup-tabs button:hover,
.setup-tabs button[aria-selected="true"] {
  color: var(--color-fg-strong);
}

.setup-tabs button[aria-selected="true"] {
  border-bottom-color: var(--color-fg-strong);
  font-weight: 650;
}

.setup-panel {
  padding-top: 16px;
}

.skill-entry {
  padding: 24px 0;
}

.skill-entry + .skill-entry {
  border-top: 1px solid var(--color-base-800);
}

.skill-entry p + p {
  margin-top: 8px;
}

.mcp-tools {
  margin-top: 32px;
}

.guide-content h3 {
  margin-bottom: 8px;
  color: var(--color-fg-strong);
  font-size: 15px;
  font-weight: 650;
}

.guide-content {
  margin: 0;
  padding: 0;
  min-width: 0;
  max-width: 820px;
}

.skill-guide-actions {
  margin-top: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.mcp-guide h2 {
  color: var(--color-fg-strong);
  font-size: 18px;
  font-weight: 650;
  margin-bottom: 8px;
}

.guide-content :is(p, dd) {
  color: var(--color-base-400);
  font-size: 14px;
  line-height: 1.65;
}

.endpoint-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}

.endpoint-row code,
.mcp-guide pre {
  padding: 10px 12px;
  border-radius: var(--control-radius);
  background: color-mix(in srgb, var(--color-fg-strong) 6%, var(--color-base-950));
  font-size: 13px;
  line-height: 1.65;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.endpoint-row code {
  flex: 1 1 260px;
  min-width: 0;
  user-select: all;
}

.auth-disclosure {
  margin-top: 12px;
}

.auth-disclosure summary {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  min-height: var(--control-height);
  padding: 8px 12px;
  border-radius: var(--control-radius);
  background: color-mix(in srgb, var(--color-fg-strong) 5%, var(--color-base-950));
  color: var(--color-fg-strong);
  font-size: 14px;
  font-weight: 500;
  list-style: none;
}

.auth-disclosure summary::-webkit-details-marker {
  display: none;
}

.auth-disclosure summary:hover,
.auth-disclosure[open] summary {
  background: color-mix(in srgb, var(--color-fg-strong) 9%, var(--color-base-950));
}

.auth-disclosure summary svg {
  flex: none;
  color: var(--color-base-400);
}

.auth-chevron {
  margin-left: 4px;
}

.auth-disclosure[open] .auth-chevron {
  transform: rotate(180deg);
}

.auth-disclosure p {
  margin-top: 12px;
}

.mcp-guide pre {
  font-family: var(--font-mono);
  margin: 12px 0;
}

.tool-list > div {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 3fr;
  gap: 8px 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--color-base-800);
}

.tool-list dt {
  color: var(--color-fg-strong);
  font-size: 13px;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .tool-list > div {
    grid-template-columns: 1fr;
    gap: 4px;
  }
}
</style>
