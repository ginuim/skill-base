/**
 * zh vs en — same strategy as bin/skill-base.js + src/utils/detect-language.js
 */
import { execFileSync } from 'node:child_process';

function parseLocaleTag(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const first = raw.trim().split(':')[0].split('.')[0].split('@')[0];
  if (!first || first === 'C' || first === 'POSIX') return null;
  const norm = first.toLowerCase().replace(/_/g, '-');
  if (norm.startsWith('zh')) return 'zh';
  if (norm.startsWith('en')) return 'en';
  return null;
}

function detectDarwinLocalePreference() {
  if (process.platform !== 'darwin') return null;
  try {
    const out = execFileSync('/usr/bin/defaults', ['read', '-g', 'AppleLocale'], {
      encoding: 'utf8',
      maxBuffer: 256,
      timeout: 3000
    });
    return parseLocaleTag(out);
  } catch {
    return null;
  }
}

export function detectSystemLanguage() {
  const envKeys = ['LC_ALL', 'LC_MESSAGES', 'LANG', 'LANGUAGE'];
  for (const k of envKeys) {
    const v = process.env[k];
    if (!v) continue;
    const tag = parseLocaleTag(v);
    if (tag) return tag;
  }

  const fromDarwin = detectDarwinLocalePreference();
  if (fromDarwin) return fromDarwin;

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

export const lang = detectSystemLanguage();

/**
 * @param {string | { zh?: string, en?: string }} message
 * @returns {string}
 */
export function pickMessage(message) {
  if (typeof message === 'string') return message;
  if (!message || typeof message !== 'object') return '';
  return message[lang] || message.en || message.zh || '';
}

/** 列表/记录中的时间展示（与系统语言一致） */
export function formatDisplayTime(value) {
  if (!value) return pickMessage({ zh: '未知时间', en: 'Unknown time' });
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', { hour12: false });
}
