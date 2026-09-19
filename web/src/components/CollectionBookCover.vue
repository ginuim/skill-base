<template>
  <div
    class="cd-cover"
    :class="[
      `cd-cover--${size}`,
      {
        'cd-cover--interactive': interactive,
        'cd-cover--loading': loading,
      },
    ]"
  >
    <div v-if="loading" class="cd-case cd-case--skeleton">
      <div class="skeleton-shimmer" aria-hidden="true"></div>
    </div>
    <template v-else>
      <div class="cd-case" :style="caseStyle">
        <div class="cd-disc" aria-hidden="true">
          <svg class="cd-ring-text" viewBox="0 0 200 200" aria-hidden="true">
            <defs>
              <path
                :id="labelPathId"
                d="M 100,100 m -70,0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0"
              />
              <path
                :id="namePathId"
                d="M 100,100 m -83,0 a 83,83 0 1,0 166,0 a 83,83 0 1,0 -166,0"
              />
            </defs>
            <text class="cd-label-text">
              <textPath :href="`#${labelPathId}`" startOffset="7%">COLLECTION</textPath>
            </text>
            <text class="cd-name-text">
              <textPath :href="`#${namePathId}`" startOffset="51%">{{ ringName }}</textPath>
            </text>
          </svg>

          <div class="cd-core" aria-hidden="true"></div>
        </div>
        <div class="cd-insert">
          <span class="cd-eyebrow">COLLECTION</span>
          <h2 class="cd-title">{{ displayName || 'Untitled Collection' }}</h2>
          <p v-if="displayDescription" class="cd-description">{{ displayDescription }}</p>
          <div class="cd-footer">
            <span class="cd-count">{{ t('collections.coverSkillCount', { count: displaySkillCount }) }}</span>
            <span class="cd-index">#{{ catalogNumber }}</span>
          </div>
        </div>
        <span class="cd-case-notch" aria-hidden="true"></span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { getCollectionCoverPreset } from '@/composables/useCollectionCoverColors'
import type { Collection } from '@/services/api'

type CollectionCoverSource = Pick<Collection, 'id' | 'name' | 'description' | 'skill_count'>

const props = withDefaults(defineProps<{
  collection?: CollectionCoverSource
  name?: string
  description?: string | null
  skillCount?: number
  colorIndex?: number
  size?: 'sm' | 'lg'
  loading?: boolean
  interactive?: boolean
}>(), {
  skillCount: undefined,
  colorIndex: 0,
  size: 'sm',
  loading: false,
  interactive: false,
})

const { t } = useI18n()

const displayName = computed(() => props.collection?.name ?? props.name ?? '')
const displayDescription = computed(() => props.collection?.description ?? props.description ?? null)
const displaySkillCount = computed(() => props.skillCount ?? props.collection?.skill_count ?? 0)
const displayColorIndex = computed(() => props.collection?.id ?? props.colorIndex ?? 0)

const preset = computed(() => getCollectionCoverPreset(displayColorIndex.value))
const pathIdSuffix = computed(() => `${displayColorIndex.value}-${(displayName.value || 'collection').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 32)}`)
const labelPathId = computed(() => `collection-label-path-${pathIdSuffix.value}`)
const namePathId = computed(() => `collection-name-path-${pathIdSuffix.value}`)
const ringName = computed(() => {
  const name = (displayName.value || 'UNTITLED COLLECTION').toUpperCase()
  return name.length > 56 ? `${name.slice(0, 53)}...` : name
})
const catalogNumber = computed(() => String(displayColorIndex.value).padStart(2, '0').slice(-2))

const caseStyle = computed(() => ({
  '--cd-hue': String(preset.value.hue),
  '--cd-fg': preset.value.color,
  '--cd-muted': preset.value.descColor,
  '--cd-accent': preset.value.color,
  '--cd-disc-bg': preset.value.background,
  '--cd-line': 'rgba(255, 255, 255, 0.34)',
  '--cd-dark-line': 'rgba(15, 23, 42, 0.2)',
}))
</script>

<style scoped>
.cd-cover {
  position: relative;
  display: flex;
  flex-shrink: 0;
  filter:
    drop-shadow(0 10px 20px rgba(0, 0, 0, 0.28))
    drop-shadow(0 4px 10px rgba(0, 0, 0, 0.18));
  transition: transform 0.25s ease, filter 0.25s ease;
}

.cd-cover--interactive:hover {
  transform: translateY(-6px) rotate(-0.35deg);
  filter:
    drop-shadow(0 12px 24px rgba(0, 0, 0, 0.34))
    drop-shadow(0 8px 16px rgba(0, 0, 0, 0.2));
}

html[data-theme="light"] .cd-cover {
  filter:
    drop-shadow(0 8px 16px rgba(15, 23, 42, 0.12))
    drop-shadow(0 3px 8px rgba(15, 23, 42, 0.08));
}

html[data-theme="light"] .cd-cover--interactive:hover {
  filter:
    drop-shadow(0 10px 20px rgba(15, 23, 42, 0.16))
    drop-shadow(0 6px 12px rgba(15, 23, 42, 0.1));
}

.cd-cover--sm {
  width: 13.5rem;
}

.cd-cover--lg {
  width: 17rem;
}

.cd-case {
  position: relative;
  flex: 1;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  overflow: visible;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.28), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.025)),
    rgba(12, 13, 17, 0.58);
  backdrop-filter: blur(10px) saturate(1.2);
  border: 1px solid var(--cd-line);
  border-radius: 0.5rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.52),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 1.15rem 0 1.25rem rgba(255, 255, 255, 0.07),
    inset -1px 0 0 var(--cd-dark-line);
}

html[data-theme="light"] .cd-case {
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.86), rgba(255, 255, 255, 0.16) 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.72), rgba(226, 232, 240, 0.34)),
    rgba(248, 250, 252, 0.58);
  border-color: rgba(100, 116, 139, 0.36);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    inset 0 0 0 1px rgba(255, 255, 255, 0.46),
    inset 1.15rem 0 1.25rem rgba(15, 23, 42, 0.04),
    inset -1px 0 0 rgba(15, 23, 42, 0.12);
}

.cd-case > * {
  z-index: 1;
}

.cd-case::before,
.cd-case::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.cd-case::before {
  z-index: 2;
  inset: 0.55rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 0.32rem;
  box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
}

html[data-theme="light"] .cd-case::before {
  border-color: rgba(15, 23, 42, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.44);
}

.cd-case::after {
  z-index: 3;
  top: 0;
  bottom: 0;
  left: 1.12rem;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  box-shadow: 0.24rem 0 0 rgba(15, 23, 42, 0.2);
}

html[data-theme="light"] .cd-case::after {
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.92), transparent);
  box-shadow: 0.24rem 0 0 rgba(15, 23, 42, 0.08);
}

.cd-case--skeleton {
  background: var(--color-base-900);
  border-color: var(--color-base-800);
  box-shadow: none;
}

html[data-theme="light"] .cd-case--skeleton {
  background: var(--color-base-900);
  border-color: var(--color-base-800);
}

.skeleton-shimmer {
  flex: 1;
  width: 100%;
  background: linear-gradient(90deg, var(--color-base-900) 25%, var(--color-base-800) 50%, var(--color-base-900) 75%);
  background-size: 200% 100%;
  animation: book-cover-skeleton 1.5s infinite;
}

@keyframes book-cover-skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.cd-disc {
  position: absolute;
  top: 11%;
  right: 7%;
  bottom: 11%;
  width: 78%;
  border-radius: 9999px;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.92) 0 10%, rgba(255, 255, 255, 0.35) 10.5% 18%, transparent 18.5%),
    conic-gradient(from 28deg, rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.84)),
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.12) 34%, rgba(255, 255, 255, 0.24) 63%, rgba(255, 255, 255, 0.07)),
    var(--cd-disc-bg);
  border: 1px solid rgba(255, 255, 255, 0.72);
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1.1rem rgba(255, 255, 255, 0.06),
    0 0 0 1px rgba(15, 23, 42, 0.06),
    -0.6rem 0.45rem 1.4rem rgba(0, 0, 0, 0.18);
  clip-path: inset(0 0 0 0 round 9999px);
  -webkit-mask: radial-gradient(circle, transparent 0 7.5%, #000 8%);
  mask: radial-gradient(circle, transparent 0 7.5%, #000 8%);
  opacity: 0.92;
  transition:
    transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1),
    box-shadow 0.38s ease,
    opacity 0.38s ease;
  will-change: transform;
}

html[data-theme="light"] .cd-disc {
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.06),
    inset 0 0 0 1.1rem rgba(255, 255, 255, 0.1),
    0 0 0 1px rgba(15, 23, 42, 0.04),
    -0.45rem 0.36rem 1rem rgba(15, 23, 42, 0.1);
}

.cd-cover--interactive:hover .cd-disc {
  transform: translateX(16%) rotate(16deg);
  opacity: 1;
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.08),
    inset 0 0 0 1.1rem rgba(255, 255, 255, 0.06),
    0 0 0 1px rgba(15, 23, 42, 0.06),
    -0.9rem 0.8rem 1.6rem rgba(0, 0, 0, 0.22);
}

html[data-theme="light"] .cd-cover--interactive:hover .cd-disc {
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.06),
    inset 0 0 0 1.1rem rgba(255, 255, 255, 0.1),
    0 0 0 1px rgba(15, 23, 42, 0.04),
    -0.75rem 0.65rem 1.35rem rgba(15, 23, 42, 0.14);
}

.cd-cover--lg.cd-cover--interactive:hover .cd-disc {
  transform: translateX(20%) rotate(18deg);
}

.cd-disc::before,
.cd-disc::after {
  content: '';
  position: absolute;
  border-radius: 9999px;
  pointer-events: none;
}

.cd-disc::before {
  inset: 18%;
  border: 1px solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.05);
}

html[data-theme="light"] .cd-disc::before {
  border-color: rgba(255, 255, 255, 0.78);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.04);
}

.cd-disc::after {
  inset: 36%;
  border: 1px solid rgba(255, 255, 255, 0.72);
  background:
    radial-gradient(circle, transparent 0 28%, rgba(255, 255, 255, 0.28) 30% 62%, transparent 64%);
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.05),
    0 0 0 1px rgba(255, 255, 255, 0.18);
}

html[data-theme="light"] .cd-disc::after {
  border-color: rgba(255, 255, 255, 0.86);
  box-shadow:
    inset 0 0 0 1px rgba(15, 23, 42, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.28);
}

.cd-ring-text {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  letter-spacing: 0.1em;
}

.cd-label-text {
  fill: var(--cd-accent);
  font-size: 9px;
}

.cd-name-text {
  fill: var(--cd-fg);
  font-size: 10px;
}

.cd-core {
  position: absolute;
  inset: 39%;
  z-index: 1;
  border-radius: 9999px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.62);
  box-shadow:
    inset 0 0 0 0.65rem rgba(255, 255, 255, 0.18),
    0 0 0 1px rgba(15, 23, 42, 0.04);
}

.cd-insert {
  position: absolute;
  z-index: 2;
  inset: 0.88rem 28% 0.88rem 1.45rem;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 0.85rem 0.78rem 0.72rem;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.78), rgba(255, 255, 255, 0.12) 42%, rgba(255, 255, 255, 0.28)),
    linear-gradient(160deg, hsla(var(--cd-hue), 85%, 58%, 0.34), transparent 58%),
    var(--cd-disc-bg);
  border: 1px solid rgba(255, 255, 255, 0.38);
  border-radius: 0.32rem;
  box-shadow:
    0.35rem 0 1rem rgba(0, 0, 0, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.48);
}

html[data-theme="light"] .cd-insert {
  border-color: rgba(255, 255, 255, 0.72);
  box-shadow:
    0.32rem 0 0.9rem rgba(15, 23, 42, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
}

.cd-insert::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.2), transparent 42%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 10px);
  mix-blend-mode: soft-light;
}

.cd-eyebrow,
.cd-title,
.cd-description,
.cd-footer {
  position: relative;
  z-index: 1;
}

.cd-eyebrow {
  align-self: flex-start;
  padding: 0.12rem 0.34rem;
  color: var(--cd-fg);
  background: rgba(255, 255, 255, 0.58);
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 0.22rem;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.5rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  line-height: 1.3;
}

html[data-theme="light"] .cd-eyebrow {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(15, 23, 42, 0.06);
}

.cd-title {
  margin: 0.72rem 0 0;
  color: var(--cd-fg);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.18;
  text-wrap: pretty;
  overflow-wrap: anywhere;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.cd-description {
  margin: 0.52rem 0 0;
  color: var(--cd-muted);
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.cd-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.45rem;
  margin-top: auto;
  padding-top: 0.65rem;
  font-family: 'JetBrains Mono', monospace;
}

.cd-count {
  min-width: 0;
  font-size: 0.56rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--cd-muted);
}

.cd-index {
  flex-shrink: 0;
  color: var(--cd-fg);
  font-size: 0.55rem;
  font-weight: 800;
  line-height: 1;
}

.cd-case-notch {
  position: absolute;
  z-index: 4;
  right: 0.5rem;
  top: 50%;
  width: 0.42rem;
  height: 2.4rem;
  transform: translateY(-50%);
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.18),
    0 0 0 1px rgba(15, 23, 42, 0.12);
}

html[data-theme="light"] .cd-case-notch {
  background: rgba(148, 163, 184, 0.24);
  box-shadow:
    inset 1px 0 0 rgba(255, 255, 255, 0.42),
    0 0 0 1px rgba(15, 23, 42, 0.08);
}

.cd-cover--lg .cd-insert {
  padding: 1rem 0.9rem 0.82rem;
}

.cd-cover--lg .cd-title {
  font-size: 1.08rem;
}

.cd-cover--lg .cd-description {
  font-size: 0.68rem;
  -webkit-line-clamp: 4;
}

.cd-cover--lg .cd-label-text {
  font-size: 8px;
}

.cd-cover--lg .cd-name-text {
  font-size: 9px;
}

.cd-cover--lg .cd-count {
  font-size: 0.62rem;
}

@media (prefers-reduced-motion: reduce) {
  .cd-cover,
  .cd-disc {
    transition: none;
  }

  .cd-cover--interactive:hover,
  .cd-cover--interactive:hover .cd-disc,
  .cd-cover--lg.cd-cover--interactive:hover .cd-disc {
    transform: none;
  }
}
</style>
