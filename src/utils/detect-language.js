/**
 * For Cappy / CLI: zh vs en.
 * Order: explicit locale env vars → (macOS only) system region → Intl.
 */

const { execFileSync } = require('child_process');

function parseLocaleTag(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const first = raw.trim().split(':')[0].split('.')[0].split('@')[0];
  if (!first || first === 'C' || first === 'POSIX') return null;
  const norm = first.toLowerCase().replace(/_/g, '-');
  if (norm.startsWith('zh')) return 'zh';
  if (norm.startsWith('en')) return 'en';
  return null;
}

/**
 * Terminals often set LANG=C.UTF-8; Intl resolves to en-US, but the OS UI language may still be Chinese.
 * AppleLocale matches System Settings and needs no extra npm packages.
 */
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

function detectSystemLanguage() {
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

module.exports = { detectSystemLanguage };
