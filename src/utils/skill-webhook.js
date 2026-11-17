/**
 * Per-skill outbound webhooks: fire-and-forget POST with JSON body.
 * Invalid URLs are rejected at write time; unsafe targets are dropped at send time.
 */

const net = require('node:net');
const dns = require('node:dns');
const http = require('node:http');
const https = require('node:https');
const { createHmac } = require('node:crypto');

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
    return (u.protocol === 'http:' || u.protocol === 'https:') && !u.username && !u.password;
  } catch {
    return false;
  }
}

const blocked = new net.BlockList();
for (const [prefix, bits] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 3]
]) blocked.addSubnet(prefix, bits);

const globalV6 = new net.BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');
blocked.addSubnet('2001::', 23, 'ipv6');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');
blocked.addSubnet('3fff::', 20, 'ipv6');

function isAllowedWebhookAddress(address) {
  if (process.env.SKILL_BASE_WEBHOOK_ALLOW_LOOPBACK === 'true'
    && (address === '127.0.0.1' || address === '::1')) return true;
  const family = net.isIP(address);
  if (family === 4) return !blocked.check(address);
  return family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

function isSafeWebhookTarget(urlString) {
  if (!isValidWebhookUrl(urlString)) return false;
  const hostname = new URL(urlString).hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(hostname)) return isAllowedWebhookAddress(hostname);
  if (/^(?:localhost|.*\.localhost)\.?$/i.test(hostname)) {
    return process.env.SKILL_BASE_WEBHOOK_ALLOW_LOOPBACK === 'true';
  }
  return true;
}

function lookupWebhookTarget(hostname, options, callback) {
  dns.lookup(hostname, { all: true, family: options.family }, (error, addresses) => {
    if (error) return callback(error);
    if (!addresses.length || addresses.some(({ address }) => !isAllowedWebhookAddress(address))) {
      return callback(new Error('Webhook hostname resolves to a blocked address'));
    }
    if (options.all) return callback(null, addresses);
    const { address, family } = addresses[0];
    callback(null, address, family);
  });
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

function postWebhook(url, payload) {
  const body = JSON.stringify(payload);
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) };
  const secret = process.env.SKILL_BASE_WEBHOOK_SIGNING_SECRET;
  if (secret) {
    headers['X-SkillBase-Signature'] = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  }
  const transport = new URL(url).protocol === 'https:' ? https : http;
  const request = transport.request(url, {
    method: 'POST',
    headers,
    lookup: lookupWebhookTarget,
    agent: false,
    signal: AbortSignal.timeout(webhookTimeoutMs())
  }, (response) => response.destroy());
  request.on('error', () => {});
  request.end(body);
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
    try { postWebhook(url, payload); } catch { /* Ignore delivery failures. */ }
  });
}

module.exports = {
  isValidWebhookUrl,
  isSafeWebhookTarget,
  canViewSkillWebhook,
  parseWebhookUrlField,
  notifySkillWebhook
};
