/**
 * Per-skill outbound webhooks: fire-and-forget POST with JSON body.
 * Invalid URLs are rejected at write time; unsafe targets are dropped at send time.
 */

const net = require('node:net');

const WEBHOOK_MAX_URL_LENGTH = 2048;
const DEFAULT_TIMEOUT_MS = 10000;

function webhookTimeoutMs() {
  const n = Number(process.env.SKILL_BASE_WEBHOOK_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 60000) : DEFAULT_TIMEOUT_MS;
}

function isValidWebhookUrl(urlString) {
  if (!urlString || typeof urlString !== 'string') return false;
  if (urlString.length > WEBHOOK_MAX_URL_LENGTH) return false;
  try {
    const u = new URL(urlString);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isLocalWebhookHostname(hostname) {
  const normalized = String(hostname || '').toLowerCase();
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}

function isPrivateIpv4(hostname) {
  if (net.isIP(hostname) !== 4) return false;
  const [a, b] = hostname.split('.').map((part) => Number(part));
  if (a === 127) return false;
  if (a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 0) return true;
  return false;
}

function isBlockedIpv6(hostname) {
  if (net.isIP(hostname) !== 6) return false;
  const normalized = hostname.toLowerCase();
  if (normalized === '::1') return false;
  return normalized === '::' || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('fc') || normalized.startsWith('fd');
}
function isSafeWebhookTarget(urlString) {
  if (!isValidWebhookUrl(urlString)) return false;
  const { hostname } = new URL(urlString);
  if (isLocalWebhookHostname(hostname)) return true;
  if (isPrivateIpv4(hostname)) return false;
  if (isBlockedIpv6(hostname)) return false;
  return true;
}

function canViewSkillWebhook(currentUser, permission) {
  if (!currentUser) return false;
  if (currentUser.role === 'admin') return true;
  return permission === 'owner';
}

/**
 * @param {unknown} raw from JSON body
 * @returns {{ ok: true, value: string | null, omit: boolean } | { ok: false, detail: string }}
 */
function parseWebhookUrlField(raw) {
  if (raw === undefined) return { ok: true, value: null, omit: true };
  if (raw === null || raw === '') return { ok: true, value: null, omit: false };
  const s = String(raw).trim();
  if (!s) return { ok: true, value: null, omit: false };
  if (!isValidWebhookUrl(s)) {
    return { ok: false, detail: 'webhook_url must be http(s) URL' };
  }
  return { ok: true, value: s, omit: false };
}

async function postWebhook(url, payload) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), webhookTimeoutMs());
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {object | null | undefined} skillRow must include webhook_url when configured
 * @param {'skill.updated' | 'skill.deleted'} event
 * @param {object} data
 * @param {{ id: number, username?: string } | null} actor
 */
function notifySkillWebhook(skillRow, event, data, actor) {
  const url = skillRow && skillRow.webhook_url;
  if (!url || !isValidWebhookUrl(url) || !isSafeWebhookTarget(url)) return;

  const payload = {
    event,
    skill_id: skillRow.id,
    timestamp: new Date().toISOString(),
    actor: actor && actor.id != null
      ? { id: actor.id, username: actor.username || null }
      : null,
    data
  };

  setImmediate(() => {
    postWebhook(url, payload).catch(() => {});
  });
}

module.exports = {
  isValidWebhookUrl,
  isSafeWebhookTarget,
  canViewSkillWebhook,
  parseWebhookUrlField,
  notifySkillWebhook
};
