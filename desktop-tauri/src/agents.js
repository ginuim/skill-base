/**
 * Agent 徽标样式：已知 IDE 使用固定缩写与颜色，未知 IDE 按 id 哈希取色，保证同一 Agent 在各处颜色一致。
 */
const KNOWN_AGENTS = {
  universal: { short: 'UA', color: '#ea580c' },
  cursor: { short: 'CU', color: '#38bdf8' },
  'claude-code': { short: 'CC', color: '#f97316' },
  codex: { short: 'CX', color: '#a1a1aa' },
  qoder: { short: 'QD', color: '#a855f7' },
  qoderwork: { short: 'QW', color: '#c084fc' },
  opencode: { short: 'OC', color: '#94a3b8' },
  trae: { short: 'TR', color: '#22c55e' },
  'trae-cn': { short: 'TC', color: '#4ade80' },
  openclaw: { short: 'CL', color: '#2dd4bf' },
  copilot: { short: 'GH', color: '#e879f9' },
  windsurf: { short: 'WS', color: '#06b6d4' },
  codebuddy: { short: 'CB', color: '#fbbf24' },
  workbuddy: { short: 'WB', color: '#facc15' },
  'iflow-cli': { short: 'IF', color: '#818cf8' },
  kilo: { short: 'KL', color: '#fb7185' },
  'kiro-cli': { short: 'KR', color: '#f472b6' },
  pi: { short: 'PI', color: '#60a5fa' },
  'qwen-code': { short: 'QC', color: '#6366f1' },
  roo: { short: 'RO', color: '#34d399' }
};

const FALLBACK_PALETTE = ['#f97316', '#38bdf8', '#a855f7', '#22c55e', '#6366f1', '#2dd4bf', '#60a5fa', '#fb923c'];

/** 与 App 中的 normalizeAgentId 保持一致：安装记录里 `_` 与 `-` 视为同一 Agent */
export function normalizeAgentId(id) {
  return (id || '').replaceAll('_', '-');
}

function abbreviate(name) {
  const words = String(name).split(/[\s\-_]+/).filter(Boolean);
  const raw = words.length > 1 ? words.map((word) => word[0]).join('') : String(name);
  return raw.slice(0, 2).toUpperCase();
}

function hashString(value) {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

export function agentStyle(id, name) {
  const key = normalizeAgentId(id);
  const known = KNOWN_AGENTS[key];
  if (known) return known;
  return {
    short: abbreviate(name || key),
    color: FALLBACK_PALETTE[hashString(key) % FALLBACK_PALETTE.length]
  };
}

/** 生成徽标用的 CSS 变量：底色与描边使用同色 + 透明度后缀（hex alpha） */
export function agentBadgeVars(style) {
  return {
    '--agent-color': style.color,
    '--agent-tint': `${style.color}2e`,
    '--agent-line': `${style.color}59`
  };
}
