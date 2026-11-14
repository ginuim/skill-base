import chalk from 'chalk';
import prompts from 'prompts';
import {
  getConfig,
  loadProfiles,
  saveProfiles,
  normalizeBaseUrl,
  getActiveProfileName
} from '../config.js';
import { loadAllCredentials, removeCredentials, renameCredentials } from '../auth.js';
import { pickMessage } from '../i18n.js';

const NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

const M = {
  empty: {
    zh: '还没有任何配置。添加: skb config add <name> --server <url>',
    en: 'No profiles yet. Add one: skb config add <name> --server <url>'
  },
  notFound: { zh: '配置不存在: ', en: 'Profile not found: ' },
  exists: { zh: '配置已存在: ', en: 'Profile already exists: ' },
  invalidName: {
    zh: '配置名只能包含字母、数字、点、下划线和短横线',
    en: 'Profile name may only contain letters, digits, ".", "_" and "-"'
  },
  invalidUrl: { zh: '无效的服务器 URL: ', en: 'Invalid server URL: ' },
  needServer: { zh: '请通过 --server <url> 指定服务器地址', en: 'Please pass --server <url>' },
  nothingToSet: {
    zh: '没有要修改的内容，请指定 --server 或 --rename',
    en: 'Nothing to change; pass --server and/or --rename'
  },
  added: { zh: '✓ 已添加配置 ', en: '✓ Added profile ' },
  updated: { zh: '✓ 已更新配置 ', en: '✓ Updated profile ' },
  switched: { zh: '✓ 已切换到配置 ', en: '✓ Switched to profile ' },
  removed: { zh: '✓ 已删除配置 ', en: '✓ Removed profile ' },
  confirmRemove: { zh: '确认删除配置（含本地登录凭据）', en: 'Remove profile (including saved credentials)' },
  cancelled: { zh: '已取消', en: 'Cancelled' },
  notLoggedIn: { zh: '未登录', en: 'not logged in' },
  loginHint: { zh: '该配置尚未登录，可执行: ', en: 'Not logged in for this profile. Run: ' },
  envOverride: {
    zh: '注意：SKB_BASE_URL 环境变量会覆盖配置中的服务器地址: ',
    en: 'Note: SKB_BASE_URL env var overrides the profile server: '
  },
  current: { zh: '当前', en: 'current' },
  name: { zh: '名称', en: 'Name' },
  server: { zh: '服务器', en: 'Server' },
  user: { zh: '用户', en: 'User' },
  token: { zh: '令牌', en: 'Token' },
  active: { zh: '生效中', en: 'Active' }
};

function fail(msg) {
  console.error(chalk.red(msg));
  process.exit(1);
}

function assertName(name) {
  if (!NAME_PATTERN.test(name || '')) fail(pickMessage(M.invalidName));
}

function parseServer(server) {
  const url = normalizeBaseUrl(server);
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error('protocol');
  } catch {
    fail(`${pickMessage(M.invalidUrl)}${server}`);
  }
  return url;
}

function maskToken(token) {
  if (!token) return '';
  if (token.length <= 10) return '***';
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

function warnEnvOverride() {
  if (process.env.SKB_BASE_URL) {
    console.log(chalk.yellow(`${pickMessage(M.envOverride)}${process.env.SKB_BASE_URL}`));
  }
}

export function list(options = {}) {
  const { profiles, currentProfile } = loadProfiles();
  const creds = loadAllCredentials();
  const active = getActiveProfileName();
  const names = Object.keys(profiles);

  if (options.json) {
    console.log(JSON.stringify({
      currentProfile: currentProfile ?? null,
      activeProfile: active,
      profiles: names.map((name) => ({
        name,
        baseUrl: profiles[name].baseUrl,
        current: name === currentProfile,
        active: name === active,
        username: creds[name]?.username ?? null,
        loggedIn: Boolean(creds[name]?.token)
      }))
    }));
    return;
  }

  if (names.length === 0) {
    console.log(chalk.gray(pickMessage(M.empty)));
    return;
  }

  const width = Math.max(...names.map((n) => n.length), 4);
  for (const name of names) {
    const mark = name === active ? chalk.green('*') : ' ';
    const user = creds[name]?.token
      ? chalk.cyan(creds[name].username || '?')
      : chalk.gray(pickMessage(M.notLoggedIn));
    const label = name === active ? chalk.green(name.padEnd(width)) : name.padEnd(width);
    console.log(`${mark} ${label}  ${profiles[name].baseUrl}  ${user}`);
  }
  if (active !== currentProfile && profiles[active]) {
    console.log(chalk.gray(`\n(--profile / SKB_PROFILE → ${active}; ${pickMessage(M.current)}: ${currentProfile})`));
  }
  warnEnvOverride();
}

export function show(name, options = {}) {
  const { profiles, currentProfile } = loadProfiles();
  const target = name || getActiveProfileName();
  const profile = profiles[target];
  const cred = loadAllCredentials()[target];
  const isActive = target === getActiveProfileName();
  const effectiveUrl = isActive ? getConfig().baseUrl : profile?.baseUrl;

  if (!profile && name) fail(`${pickMessage(M.notFound)}${target}`);

  if (options.json) {
    console.log(JSON.stringify({
      name: target,
      baseUrl: profile?.baseUrl ?? null,
      effectiveBaseUrl: effectiveUrl,
      current: target === currentProfile,
      active: isActive,
      username: cred?.username ?? null,
      loggedIn: Boolean(cred?.token)
    }));
    return;
  }

  const rows = [
    [pickMessage(M.name), target + (target === currentProfile ? chalk.green(` (${pickMessage(M.current)})`) : '')],
    [pickMessage(M.server), effectiveUrl],
    [pickMessage(M.user), cred?.token ? cred.username || '?' : chalk.gray(pickMessage(M.notLoggedIn))],
    [pickMessage(M.token), cred?.token ? maskToken(cred.token) : chalk.gray('-')]
  ];
  for (const [k, v] of rows) {
    console.log(`${chalk.gray(k.padEnd(8))} ${v}`);
  }
  if (!cred?.token) {
    const flag = target === getActiveProfileName() ? '' : ` --profile ${target}`;
    console.log(chalk.gray(`\n${pickMessage(M.loginHint)}skb login${flag}`));
  }
  if (isActive) warnEnvOverride();
}

export function add(name, options = {}) {
  assertName(name);
  if (!options.server) fail(pickMessage(M.needServer));
  const baseUrl = parseServer(options.server);

  const state = loadProfiles();
  if (state.profiles[name]) fail(`${pickMessage(M.exists)}${name}`);

  state.profiles[name] = { baseUrl };
  if (options.use || !state.currentProfile) state.currentProfile = name;
  saveProfiles(state);

  console.log(chalk.green(`${pickMessage(M.added)}${name} → ${baseUrl}`));
  if (state.currentProfile === name) {
    console.log(chalk.green(`${pickMessage(M.switched)}${name}`));
  }
  console.log(chalk.gray(`${pickMessage(M.loginHint)}skb login${state.currentProfile === name ? '' : ` --profile ${name}`}`));
}

export function set(name, options = {}) {
  const state = loadProfiles();
  if (!state.profiles[name]) fail(`${pickMessage(M.notFound)}${name}`);
  if (!options.server && !options.rename) fail(pickMessage(M.nothingToSet));

  let target = name;
  if (options.server) {
    state.profiles[name] = { ...state.profiles[name], baseUrl: parseServer(options.server) };
  }
  if (options.rename && options.rename !== name) {
    assertName(options.rename);
    if (state.profiles[options.rename]) fail(`${pickMessage(M.exists)}${options.rename}`);
    state.profiles[options.rename] = state.profiles[name];
    delete state.profiles[name];
    if (state.currentProfile === name) state.currentProfile = options.rename;
    target = options.rename;
  }
  saveProfiles(state);
  if (target !== name) renameCredentials(name, target);

  console.log(chalk.green(`${pickMessage(M.updated)}${target} → ${state.profiles[target].baseUrl}`));
}

export function use(name) {
  const state = loadProfiles();
  if (!state.profiles[name]) {
    const names = Object.keys(state.profiles);
    fail(`${pickMessage(M.notFound)}${name}${names.length ? ` (${names.join(', ')})` : ''}`);
  }
  state.currentProfile = name;
  saveProfiles(state);
  console.log(chalk.green(`${pickMessage(M.switched)}${name} → ${state.profiles[name].baseUrl}`));
  if (!loadAllCredentials()[name]?.token) {
    console.log(chalk.gray(`${pickMessage(M.loginHint)}skb login`));
  }
  warnEnvOverride();
}

export async function remove(name, options = {}) {
  const state = loadProfiles();
  if (!state.profiles[name]) fail(`${pickMessage(M.notFound)}${name}`);

  if (!options.yes) {
    const { ok } = await prompts({
      type: 'confirm',
      name: 'ok',
      message: `${pickMessage(M.confirmRemove)} ${name}?`,
      initial: false
    });
    if (!ok) {
      console.log(chalk.yellow(pickMessage(M.cancelled)));
      return;
    }
  }

  delete state.profiles[name];
  if (state.currentProfile === name) {
    state.currentProfile = Object.keys(state.profiles)[0];
  }
  saveProfiles(state);
  removeCredentials(name);

  console.log(chalk.green(`${pickMessage(M.removed)}${name}`));
  if (state.currentProfile) {
    console.log(chalk.green(`${pickMessage(M.switched)}${state.currentProfile}`));
  }
}
