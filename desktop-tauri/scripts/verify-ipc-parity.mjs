/**
 * Verify IPC channels are declared, routed, and referenced consistently.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESKTOP_IPC_CHANNELS } from '../../cli/lib/desktop-ipc-channels.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const libRs = fs.readFileSync(path.join(root, 'src-tauri/src/lib.rs'), 'utf8');
const appVue = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
const skbJs = fs.readFileSync(path.join(root, 'src/skb.js'), 'utf8');

const RUST_NATIVE = [
  'project:pickRoot',
  'project:pickInstallDir',
  'shell:revealPath',
  'auth:openLogin',
  'skills:openWebPage'
];

const invokeRe = /skb\.invoke\(\s*['"]([^'"]+)['"]/g;
const usedInUi = new Set();
for (const m of appVue.matchAll(invokeRe)) {
  usedInUi.add(m[1]);
}

let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

console.log(`IPC channels declared: ${DESKTOP_IPC_CHANNELS.length}`);

if (DESKTOP_IPC_CHANNELS.length !== 28) {
  fail(`expected 28 channels, got ${DESKTOP_IPC_CHANNELS.length}`);
}

if (!skbJs.includes('DESKTOP_IPC_CHANNELS')) {
  fail('skb.js must validate channels via DESKTOP_IPC_CHANNELS');
}

for (const ch of RUST_NATIVE) {
  if (!libRs.includes(`"${ch}"`)) {
    fail(`lib.rs missing native route: ${ch}`);
  }
}

for (const ch of DESKTOP_IPC_CHANNELS) {
  if (!RUST_NATIVE.includes(ch) && !libRs.includes('bridge_call')) {
    fail('lib.rs missing bridge_call fallback');
    break;
  }
}

for (const ch of usedInUi) {
  if (!DESKTOP_IPC_CHANNELS.includes(ch)) {
    fail(`App.vue uses undeclared channel: ${ch}`);
  }
}

const unused = DESKTOP_IPC_CHANNELS.filter((c) => !usedInUi.has(c));
if (unused.length) {
  console.log('channels not referenced in App.vue (handlers / Rust only):');
  for (const ch of unused) {
    console.log(`  - ${ch}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('IPC parity ok');
