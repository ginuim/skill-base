import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DESKTOP_IPC_CHANNELS } from './desktop-ipc-channels.mjs';
import { installSkillLinks, readManagedSkillLink } from './linked-skills.mjs';
import { parseSkillMd, displayNameAndDescriptionFromParsed } from './skill-md.js';

export { DESKTOP_IPC_CHANNELS };

function appendDesktopLog(message) {
  const logPath = process.env.SKB_DESKTOP_LOG;
  if (!logPath) return;
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // Logging must never break desktop IPC.
  }
}

/**
 * @param {object} cli merged desktop CLI module exports
 * @param {string} cliLibRoot reserved (esbuild bundle uses static cli imports)
 * @param {{
 *   pickDirectory: (defaultPath?: string) => Promise<string | null>,
 *   revealPath: (resolvedPath: string) => Promise<{ ok: true }>,
 *   openExternal: (url: string) => Promise<void>,
 *   getProjectRoot: () => string,
 *   setProjectRoot: (root: string) => void,
 * }} deps platform-specific shell hooks
 */
export function registerDesktopHandlers(cli, cliLibRoot, deps) {
  function getSavedProjectRoot() {
    const saved = cli.loadSavedConfig();
    if (saved.desktopProjectRoot && fs.existsSync(saved.desktopProjectRoot)) {
      return saved.desktopProjectRoot;
    }
    return os.homedir();
  }

  function saveProjectRoot(root) {
    cli.saveConfig({ desktopProjectRoot: root });
    deps.setProjectRoot(root);
  }

  async function readLocalSkillMeta(installPath) {
    const skillMd = path.join(installPath, 'SKILL.md');
    const fallbackName = path.basename(installPath);
    if (!fs.existsSync(skillMd)) {
      return { name: fallbackName, description: '' };
    }
    const content = fs.readFileSync(skillMd, 'utf-8');
    const parsed = parseSkillMd(content);
    const { name, description } = displayNameAndDescriptionFromParsed(parsed, fallbackName);
    return { name: name || fallbackName, description: description || '' };
  }

  function targetPathExists(targetPath) {
    try {
      return fs.existsSync(targetPath);
    } catch {
      return false;
    }
  }

  function describeFsError(err, targetPath) {
    const code = err?.code || '';
    const resolved = path.resolve(targetPath);
    if (code === 'EACCES' || code === 'EPERM') {
      return `没有权限写入安装目录：${resolved}。请修复该目录或上级目录的所有者/权限，或改用“自定义目录”选择一次目标路径后重试。`;
    }
    if (code === 'ENOTDIR') {
      return `安装路径的上级不是目录：${resolved}`;
    }
    if (code === 'EROFS') {
      return `安装目录所在文件系统是只读的：${resolved}`;
    }
    return err?.message || String(err);
  }

  function inspectWritableTarget(targetPath) {
    const resolved = path.resolve(targetPath);
    try {
      if (fs.existsSync(resolved)) {
        const stat = fs.lstatSync(resolved);
        if (!stat.isDirectory()) {
          return { writable: false, writeError: `安装目标不是目录：${resolved}` };
        }
        fs.accessSync(resolved, fs.constants.W_OK | fs.constants.X_OK);
        return { writable: true, writeError: '' };
      }

      let parent = path.dirname(resolved);
      while (!fs.existsSync(parent)) {
        const next = path.dirname(parent);
        if (next === parent) break;
        parent = next;
      }

      const parentStat = fs.lstatSync(parent);
      if (!parentStat.isDirectory()) {
        return { writable: false, writeError: `安装路径的上级不是目录：${parent}` };
      }
      fs.accessSync(parent, fs.constants.W_OK | fs.constants.X_OK);
      return { writable: true, writeError: '' };
    } catch (err) {
      return { writable: false, writeError: describeFsError(err, resolved) };
    }
  }

  function compareTargets(a, b) {
    const ae = a.exists ? 1 : 0;
    const be = b.exists ? 1 : 0;
    if (ae !== be) return be - ae;
    const au = a.ide === 'universal' ? 1 : 0;
    const bu = b.ide === 'universal' ? 1 : 0;
    if (au !== bu) return bu - au;
    return a.name.localeCompare(b.name);
  }

  function sortTargetsByExists(targets) {
    return [...targets].sort(compareTargets);
  }

  function buildGlobalTargets() {
    const { IDE_CONFIGS } = cli;
    const targets = [];
    for (const config of Object.values(IDE_CONFIGS)) {
      if (config.supportsGlobal && config.globalPath) {
        const targetPath = path.join(os.homedir(), config.globalPath);
        targets.push({
          id: `${config.id}:global`,
          name: config.name,
          path: targetPath,
          ide: config.id,
          global: true,
          exists: targetPathExists(targetPath),
          ...inspectWritableTarget(targetPath)
        });
      }
    }
    return sortTargetsByExists(targets);
  }

  function buildProjectTargetTemplates() {
    const { IDE_CONFIGS } = cli;
    return Object.values(IDE_CONFIGS)
      .map((config) => ({
        id: `${config.id}:project`,
        name: config.name,
        relPath: config.projectPath,
        ide: config.id,
        global: false,
        exists: false
      }))
      .sort(compareTargets);
  }

  function buildProjectTargets(cwd) {
    const { IDE_CONFIGS, findProjectRoot } = cli;
    const root = cwd || findProjectRoot(deps.getProjectRoot() || os.homedir());
    const targets = [];
    for (const config of Object.values(IDE_CONFIGS)) {
      const targetPath = path.join(root, config.projectPath);
      targets.push({
        id: `${config.id}:project`,
        name: config.name,
        relPath: config.projectPath,
        path: targetPath,
        ide: config.id,
        global: false,
        projectRoot: root,
        exists: targetPathExists(targetPath),
        ...inspectWritableTarget(targetPath)
      });
    }
    return sortTargetsByExists(targets);
  }

  function ensureWritableTargetDir(targetDir) {
    const status = inspectWritableTarget(targetDir);
    if (!status.writable) {
      const err = new Error(status.writeError);
      err.code = 'TARGET_NOT_WRITABLE';
      throw err;
    }
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (err) {
      throw new Error(describeFsError(err, targetDir));
    }
  }

  function resolveInstallTarget(entry, installProjectRoot) {
    if (entry.customDir) {
      const dir = path.resolve(entry.customDir);
      return {
        targetDir: dir,
        ide: '',
        global: false,
        nestedCheckDir: dir,
        label: dir,
        kind: 'custom'
      };
    }

    const targetId = entry.targetId;
    if (!targetId) return null;

    if (targetId.endsWith(':global')) {
      const target = buildGlobalTargets().find((t) => t.id === targetId);
      if (!target) return null;
      return {
        targetDir: target.path,
        ide: target.ide,
        global: true,
        nestedCheckDir: deps.getProjectRoot(),
        label: target.path,
        kind: 'global'
      };
    }

    if (targetId.endsWith(':project')) {
      const root = installProjectRoot || deps.getProjectRoot();
      if (!root) return null;
      const target = buildProjectTargets(root).find((t) => t.id === targetId);
      if (!target) return null;
      return {
        targetDir: target.path,
        ide: target.ide,
        global: false,
        nestedCheckDir: root,
        label: `${target.name} · ${target.relPath}`,
        kind: 'project'
      };
    }

    return null;
  }

  function resolveInstallTargets(rawTargets, installProjectRoot) {
    if (rawTargets.length === 0) {
      throw new Error('请至少选择一个安装目录');
    }

    const resolved = [];
    for (const entry of rawTargets) {
      const spec = resolveInstallTarget(entry, installProjectRoot);
      if (!spec) {
        throw new Error('无效的安装目标');
      }
      resolved.push(spec);
    }
    return resolved;
  }

  function checkNestedInstallTargets(resolved, acceptNested) {
    for (const spec of resolved) {
      const insideIde = cli.detectInsideIdeDir(spec.nestedCheckDir);
      if (insideIde && !acceptNested) {
        return {
          ok: false,
          code: 'NESTED_IDE_PATH',
          detail:
            spec.kind === 'custom'
              ? `所选目录已在 ${insideIde.name} 的 skill 路径内，若仍要安装请勾选确认嵌套。`
              : spec.kind === 'project'
                ? `项目目录已在 ${insideIde.name} 的 skill 路径内，若仍要安装请勾选确认嵌套。`
                : `当前目录已在 ${insideIde.name} 的 skill 路径内，若仍要安装请勾选确认嵌套。`,
          ideId: insideIde.id
        };
      }
    }
    return null;
  }

  function removeFailedInstallPath(skillId, installPath) {
    if (!cli.isSafeSkillInstallPath(skillId, installPath)) return;
    try {
      if (fs.existsSync(installPath) && fs.lstatSync(installPath).isDirectory()) {
        fs.rmSync(installPath, { recursive: true, force: true });
      }
    } catch {
      // Best-effort cleanup only; keep the original install error visible.
    }
  }

  function installErrorMessage(err, targetPath) {
    const message = describeFsError(err, targetPath);
    return targetPath ? `${message} (${targetPath})` : message;
  }

  function matchesRegistry(install, config) {
    if (install.baseUrl) return install.baseUrl === config.baseUrl;
    return config.profile === cli.DEFAULT_PROFILE && !process.env.SKB_BASE_URL;
  }

  function assertProfileEditable() {
    if (process.env.SKB_PROFILE?.trim() || process.env.SKB_BASE_URL) {
      throw new Error('SKB_PROFILE / SKB_BASE_URL overrides the saved configuration');
    }
  }

  function validateServer(value) {
    const baseUrl = cli.normalizeBaseUrl(value);
    let url;
    try { url = new URL(baseUrl); } catch { /* Invalid URL */ }
    if (!url || !['http:', 'https:'].includes(url.protocol) ||
        url.username || url.password || url.search || url.hash) {
      throw new Error('Enter an HTTP(S) server URL without credentials, query or fragment');
    }
    return baseUrl;
  }

  function assertRegistry(payload) {
    const current = cli.getConfig();
    if (payload?.profile != null &&
        (payload.profile !== current.profile || payload.baseUrl !== current.baseUrl)) {
      throw new Error('The active profile changed. Refresh and try again.');
    }
    return current;
  }

  const handlers = {
    'config:get': async () => {
      const { baseUrl, profile } = cli.getConfig();
      const { profiles } = cli.loadProfiles();
      const cred = cli.loadCredentials(profile);
      return {
        baseUrl,
        profile,
        profiles: Object.entries(profiles).map(([name, value]) => ({ name, baseUrl: value.baseUrl })),
        profileLocked: Boolean(process.env.SKB_PROFILE?.trim() || process.env.SKB_BASE_URL),
        username: cred?.username || null,
        hasToken: Boolean(cred?.token),
        agents: Object.values(cli.IDE_CONFIGS).map(({ id, name }) => ({ id, name })),
        homeDir: os.homedir(),
        projectRoot: deps.getProjectRoot()
      };
    },

    'config:setServer': async (url, expected) => {
      assertProfileEditable();
      const { profile, baseUrl } = assertRegistry(expected);
      const normalized = validateServer(url);
      const state = cli.loadProfiles();
      // Keep older installations tied to the default registry before its URL changes.
      if (profile === cli.DEFAULT_PROFILE && normalized !== baseUrl) {
        const saved = cli.loadSavedConfig();
        for (const installs of Object.values(saved.installs || {})) {
          if (!Array.isArray(installs)) continue;
          for (const install of installs) {
            if (install?.installPath && !install.baseUrl) install.baseUrl = baseUrl;
          }
        }
        if (saved.installs) cli.saveConfig({ installs: saved.installs });
      }
      if (normalized !== baseUrl) cli.removeCredentials(profile);
      state.profiles[profile] = { ...state.profiles[profile], baseUrl: normalized };
      state.currentProfile = profile;
      cli.saveProfiles(state);
      return { baseUrl: normalized };
    },

    'config:setProfile': async ({ name, baseUrl } = {}) => {
      assertProfileEditable();
      const profile = String(name || '').trim();
      if (!/^[A-Za-z0-9._-]+$/.test(profile) || Object.hasOwn(Object.prototype, profile)) {
        throw new Error('Profile names use letters, digits, dots, underscores and hyphens');
      }
      const state = cli.loadProfiles();
      const exists = Object.hasOwn(state.profiles, profile);
      if (baseUrl !== undefined) {
        if (exists) throw new Error('Profile already exists');
        state.profiles[profile] = { baseUrl: validateServer(baseUrl) };
      } else if (!exists) {
        throw new Error('Profile not found');
      }
      state.currentProfile = profile;
      cli.saveProfiles(state);
      return { profile };
    },

    'config:getGlobalTargets': async () => buildGlobalTargets(),

    'config:getProjectTargets': async (cwd) => {
      const dir = typeof cwd === 'string' && cwd.trim() ? cwd.trim() : deps.getProjectRoot();
      return buildProjectTargets(dir);
    },

    'config:getProjectTargetTemplates': async () => buildProjectTargetTemplates(),

    'project:getRoot': async () => deps.getProjectRoot(),

    'project:setRoot': async (root) => {
      const normalized = typeof root === 'string' ? root.trim() : '';
      if (!normalized) throw new Error('项目目录不能为空');
      if (!fs.existsSync(normalized)) throw new Error('项目目录不存在');
      saveProjectRoot(normalized);
      return deps.getProjectRoot();
    },

    'project:pickRoot': async () => {
      const picked = await deps.pickDirectory(deps.getProjectRoot());
      if (!picked) return null;
      saveProjectRoot(picked);
      return deps.getProjectRoot();
    },

    'project:pickInstallDir': async (defaultPath) => {
      const picked = await deps.pickDirectory(
        defaultPath || deps.getProjectRoot() || os.homedir()
      );
      return picked;
    },

    'shell:revealPath': async (rawPath) => {
      const trimmed = String(rawPath || '').trim();
      if (!trimmed) throw new Error('路径不能为空');

      const expanded = trimmed.startsWith('~')
        ? path.join(os.homedir(), trimmed.slice(1).replace(/^[/\\]/, ''))
        : trimmed;
      const resolved = path.resolve(expanded);

      if (!fs.existsSync(resolved)) throw new Error('路径不存在');

      return deps.revealPath(resolved);
    },

    'auth:openLogin': async () => {
      const { baseUrl } = cli.getConfig();
      await deps.openExternal(`${baseUrl}/login?from=cli`);
    },

    'skills:openWebPage': async (payload) => {
      const { baseUrl } = cli.getConfig();
      const base = String(baseUrl || '').replace(/\/+$/, '');
      if (!base) throw new Error('未配置服务器地址');

      const collectionRef = String(payload?.collectionRef || '').trim();
      if (collectionRef) {
        const url = `${base}/collections/${encodeURIComponent(collectionRef)}`;
        await deps.openExternal(url);
        return { url };
      }

      const skillId = String(payload?.skillId || '').trim();
      if (!skillId) throw new Error('skillId required');

      let url;
      if (payload?.page === 'diff') {
        const versionA = String(payload.version_a || '').trim();
        const versionB = String(payload.version_b || '').trim();
        if (!versionA || !versionB) throw new Error('缺少对比版本');
        const q = new URLSearchParams({
          id: skillId,
          version_a: versionA,
          version_b: versionB
        });
        url = `${base}/diff?${q.toString()}`;
      } else {
        const version = String(payload?.version || '').trim();
        url = version
          ? `${base}/skills/${encodeURIComponent(skillId)}?version=${encodeURIComponent(version)}`
          : `${base}/skills/${encodeURIComponent(skillId)}`;
      }

      await deps.openExternal(url);
      return { url };
    },

    'auth:exchangePat': async (code, expected) => {
      const config = assertRegistry(expected);
      const pattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
      const normalized = String(code || '').trim().toUpperCase();
      if (!pattern.test(normalized)) {
        throw new Error('验证码格式无效，请输入 8 位字符（例如 8A2B-9C4F）');
      }
      const client = cli.createClient();
      const result = await client.post('/auth/cli-code/verify', { code: normalized });
      if (!result.ok || !result.token || !result.user) {
        throw new Error('验证失败，请检查验证码');
      }
      assertRegistry(config);
      cli.saveCredentials({ token: result.token, username: result.user.username }, config.profile);
      return { username: result.user.username };
    },

    'auth:whoami': async () => {
      const { baseUrl } = cli.getConfig();
      const cred = cli.loadCredentials();
      if (!cred?.token) {
        return { ok: false, reason: 'no_token', baseUrl };
      }
      try {
        const client = cli.createClient();
        const me = await client.get('/auth/me');
        return { ok: true, baseUrl, user: me };
      } catch (err) {
        return { ok: false, reason: 'invalid_token', baseUrl, detail: err.message };
      }
    },

    'auth:logout': async (expected) => {
      cli.removeCredentials(assertRegistry(expected).profile);
      return { ok: true };
    },

    'skills:search': async (q) => {
      const client = cli.createClient();
      const query = String(q || '').trim();
      const result = await client.get(`/skills?q=${encodeURIComponent(query)}`);
      return result.skills || [];
    },

    'skills:getVersions': async (skillId) => {
      const client = cli.createClient();
      const result = await client.get(`/skills/${encodeURIComponent(skillId)}/versions`);
      return result.versions || [];
    },

    'skills:getRemote': async (skillId) => {
      const client = cli.createClient();
      return client.get(`/skills/${encodeURIComponent(skillId)}`);
    },

    'skills:getInstalled': async () => {
      const beforePrune = cli.listInstalledSkills();
      cli.pruneAllMissingInstalls();
      const rows = cli.listInstalledSkills();
      appendDesktopLog(`installed records before=${beforePrune.length} after=${rows.length}`);
      const client = cli.createClient();
      const config = cli.getConfig();
      const enriched = [];

      for (const row of rows) {
        let remote = null;
        const registryInstalls = row.installs.filter((install) => matchesRegistry(install, config));
        try {
          if (registryInstalls.length) remote = await client.get(`/skills/${encodeURIComponent(row.skillId)}`);
        } catch {
          // offline or skill removed from server
        }
        const firstPath = row.installs[0]?.installPath;
        appendDesktopLog(
          `installed skill=${row.skillId} installs=${row.installs.length} firstPath=${firstPath || ''} exists=${firstPath ? fs.existsSync(firstPath) : false}`
        );
        const meta = firstPath
          ? await readLocalSkillMeta(firstPath)
          : { name: row.skillId, description: '' };
        enriched.push({
          skillId: row.skillId,
          name: meta.name,
          description: meta.description,
          version: row.installs[0]?.version || '',
          latest: remote?.latest_version || row.installs[0]?.version || '',
          author: remote?.owner_username || '',
          registryInstalls,
          remoteAvailable: Boolean(remote?.latest_version),
          hasUpdate: Boolean(remote?.latest_version && registryInstalls.some((item) => item.version !== remote.latest_version)),
          installs: row.installs.map((item) => ({ ...item, linked: Boolean(readManagedSkillLink(item.installPath)) }))
        });
      }
      return enriched;
    },

    'skills:readInstalled': async ({ skillId, installPath } = {}) => {
      const install = cli.listSkillInstalls(skillId).find((item) => item.installPath === installPath);
      if (!install) throw new Error('Installation not found');
      const file = path.join(install.installPath, 'SKILL.md');
      const realDir = fs.realpathSync(install.installPath);
      if (fs.realpathSync(file) !== path.join(realDir, 'SKILL.md') || !fs.statSync(file).isFile()) {
        throw new Error('SKILL.md is not a regular file inside the installation');
      }
      const handle = fs.openSync(file, 'r');
      try {
        const buffer = Buffer.alloc(64 * 1024 + 1);
        const length = fs.readSync(handle, buffer, 0, buffer.length, 0);
        return {
          content: buffer.toString('utf8', 0, Math.min(length, buffer.length - 1)),
          truncated: length === buffer.length
        };
      } finally {
        fs.closeSync(handle);
      }
    },

    'skills:install': async (payload) => {
      const config = assertRegistry(payload);
      const skillId = String(payload?.skillId || '').trim();
      const version = payload?.version || 'latest';
      const installProjectRoot =
        typeof payload?.projectRoot === 'string' ? payload.projectRoot.trim() : '';
      const overwrite = Boolean(payload?.overwrite);
      const link = payload?.method === 'link';
      const acceptNested = Boolean(payload?.acceptNested);
      const rawTargets = Array.isArray(payload?.targets) ? payload.targets : [];

      if (!skillId) {
        throw new Error('skillId required');
      }
      const resolved = resolveInstallTargets(rawTargets, installProjectRoot);
      const nestedProblem = checkNestedInstallTargets(resolved, acceptNested);
      if (nestedProblem) return nestedProblem;

      for (const spec of resolved) {
        const installPathCandidate = path.join(path.resolve(spec.targetDir), skillId);
        if (fs.lstatSync(installPathCandidate, { throwIfNoEntry: false }) && !overwrite) {
          return {
            ok: false,
            code: 'EXISTS',
            detail: `目标目录已存在同名 Skill，请勾选覆盖后重试：${installPathCandidate}`,
            path: installPathCandidate
          };
        }
      }

      if (link) {
        if (skillId !== path.basename(skillId) || skillId === '.' || skillId === '..') {
          throw new Error('Invalid skill directory name');
        }
        const targets = resolved.map((spec) => ({
          installPath: path.join(path.resolve(spec.targetDir), skillId), overwrite
        }));
        const result = await installSkillLinks(targets, async (store) => {
          const download = await cli.downloadAndExtract(skillId, version, store);
          assertRegistry(config);
          return download;
        });
        const installed = targets.map(({ installPath }, index) => {
          const spec = resolved[index];
          cli.rememberSkillInstall({
            skillId, installPath, version: result.version, baseUrl: config.baseUrl,
            ide: spec.ide, isGlobal: spec.global
          });
          return { installPath, version: result.version, label: spec.label };
        });
        return { ok: true, skillId, version: result.version, installed };
      }

      const installed = [];
      let actualVersion = version;

      for (const spec of resolved) {
        assertRegistry(config);
        const installPathCandidate = path.join(path.resolve(spec.targetDir), skillId);

        try {
          ensureWritableTargetDir(spec.targetDir);
          if (fs.lstatSync(installPathCandidate, { throwIfNoEntry: false })) {
            fs.rmSync(installPathCandidate, { recursive: true, force: true });
          }
          const result = await cli.downloadAndExtract(skillId, version, spec.targetDir);
          actualVersion = result.version;
          const installPath = path.join(result.targetDir, skillId);
          cli.rememberSkillInstall({
            skillId: result.skillId,
            installPath,
            version: result.version,
            baseUrl: config.baseUrl,
            ide: spec.ide,
            isGlobal: spec.global
          });
          installed.push({ installPath, version: result.version, label: spec.label });
        } catch (err) {
          removeFailedInstallPath(skillId, installPathCandidate);
          throw new Error(installErrorMessage(err, installPathCandidate));
        }
      }

      return {
        ok: true,
        skillId,
        version: actualVersion,
        installed
      };
    },

    'collections:list': async () => {
      const client = cli.createClient();
      const result = await client.get('/collections');
      return result.collections || [];
    },

    'collections:get': async (collectionRef) => {
      const ref = String(collectionRef || '').trim();
      if (!ref) throw new Error('collection ref required');
      return cli.fetchCollectionDetail(ref);
    },

    'collections:install': async (payload) => {
      const config = assertRegistry(payload);
      const collectionRef = String(payload?.collectionRef || '').trim();
      const installProjectRoot =
        typeof payload?.projectRoot === 'string' ? payload.projectRoot.trim() : '';
      const overwrite = Boolean(payload?.overwrite);
      const link = payload?.method === 'link';
      const acceptNested = Boolean(payload?.acceptNested);
      const rawTargets = Array.isArray(payload?.targets) ? payload.targets : [];

      if (!collectionRef) throw new Error('collection ref required');

      const detail = await cli.fetchCollectionDetail(collectionRef);
      const collection = detail.collection || { id: collectionRef, slug: collectionRef, name: collectionRef };
      const skills = (detail.skills || []).filter((skill) => skill.latest_version);
      if (skills.length === 0) {
        throw new Error('集合内没有可安装的 Skill');
      }

      const resolved = resolveInstallTargets(rawTargets, installProjectRoot);
      const nestedProblem = checkNestedInstallTargets(resolved, acceptNested);
      if (nestedProblem) return nestedProblem;

      const conflictPaths = [];
      for (const spec of resolved) {
        for (const skill of skills) {
          const installPathCandidate = path.join(path.resolve(spec.targetDir), skill.id);
          if (fs.lstatSync(installPathCandidate, { throwIfNoEntry: false })) conflictPaths.push(installPathCandidate);
        }
      }
      if (conflictPaths.length > 0 && !overwrite) {
        return {
          ok: false,
          code: 'EXISTS',
          detail: `目标目录已存在同名 Skill，请勾选覆盖后重试：${conflictPaths.join(', ')}`,
          paths: conflictPaths
        };
      }

      if (link) {
        const targets = resolved.flatMap((spec) => skills.map((skill) => ({
          installPath: path.join(path.resolve(spec.targetDir), skill.id), overwrite, skill, spec
        })));
        await installSkillLinks(targets, async (store) => {
          const buffer = await cli.downloadCollectionZip(collectionRef);
          await cli.extractCollectionZip(buffer, store);
          assertRegistry(config);
        });
        const installed = targets.map(({ installPath, skill, spec }) => {
          cli.rememberSkillInstall({
            skillId: skill.id, installPath, version: skill.latest_version, baseUrl: config.baseUrl,
            ide: spec.ide, isGlobal: spec.global
          });
          return { skillId: skill.id, installPath, version: skill.latest_version, label: spec.label };
        });
        return { ok: true, collection, installed, skillCount: skills.length };
      }

      const installed = [];
      for (const spec of resolved) {
        assertRegistry(config);
        const targetDir = path.resolve(spec.targetDir);

        try {
          ensureWritableTargetDir(spec.targetDir);
          for (const skill of skills) {
            const installPathCandidate = path.join(targetDir, skill.id);
            if (fs.lstatSync(installPathCandidate, { throwIfNoEntry: false })) {
              fs.rmSync(installPathCandidate, { recursive: true, force: true });
            }
          }
          const buffer = await cli.downloadCollectionZip(collectionRef);
          await cli.extractCollectionZip(buffer, spec.targetDir);
        } catch (err) {
          for (const skill of skills) {
            removeFailedInstallPath(skill.id, path.join(targetDir, skill.id));
          }
          throw new Error(installErrorMessage(err, spec.targetDir));
        }

        for (const skill of skills) {
          const installPath = path.join(targetDir, skill.id);
          if (!fs.existsSync(installPath)) continue;
          cli.rememberSkillInstall({
            skillId: skill.id,
            installPath,
            version: skill.latest_version,
            baseUrl: config.baseUrl,
            ide: spec.ide,
            isGlobal: spec.global
          });
          installed.push({
            skillId: skill.id,
            installPath,
            version: skill.latest_version,
            label: spec.label
          });
        }
      }

      return {
        ok: true,
        collection,
        installed,
        skillCount: skills.length
      };
    },

    'skills:update': async (payload) => {
      const config = assertRegistry(payload);
      const skillId = String(payload?.skillId || '').trim();
      const version = String(payload?.version || '').trim();
      const updateAll = Boolean(payload?.all);
      let installPaths = Array.isArray(payload?.installPaths)
        ? payload.installPaths.filter((p) => typeof p === 'string')
        : null;

      if (!skillId || !version) throw new Error('skillId and version required');

      const options = {};
      const installs = cli.buildTargetInstalls(skillId, options)
        .filter((install) => matchesRegistry(install, config));
      if (installs.length === 0) {
        throw new Error(`本地没有记录到 ${skillId} 的安装目录`);
      }

      if (updateAll) {
        installPaths = installs.map((i) => i.installPath);
      } else if (!installPaths || installPaths.length === 0) {
        const implicit = cli.resolveImplicitSelectedInstalls(installs, options);
        if (!implicit) {
          return {
            ok: false,
            code: 'PICK_PATHS',
            detail: '存在多个安装目录，请选择要更新的路径。',
            installs
          };
        }
        installPaths = implicit.map((i) => i.installPath);
      }

      const selected = installs.filter((i) => installPaths.includes(i.installPath));
      if (selected.length !== new Set(installPaths).size || !selected.length) {
        throw new Error('Selected install paths do not belong to the active registry');
      }

      const updated = [];
      const linked = [];
      const copied = [];
      for (const install of selected) {
        const expectedLink = readManagedSkillLink(install.installPath);
        if (expectedLink) linked.push({ ...install, expectedLink, overwrite: true });
        else copied.push(install);
      }

      function recordUpdate(install, result) {
        cli.rememberSkillInstall({
          skillId: result.skillId,
          installPath: install.installPath,
          version: result.version,
          baseUrl: config.baseUrl,
          ide: install.ide,
          isGlobal: install.isGlobal
        });
        updated.push({ installPath: install.installPath, version: result.version });
      }

      if (linked.length) {
        const result = await installSkillLinks(linked, async (store) => {
          const download = await cli.downloadAndExtract(skillId, version, store);
          assertRegistry(config);
          return download;
        });
        for (const install of linked) recordUpdate(install, result);
      }
      for (const install of copied) {
        assertRegistry(config);
        const result = await cli.downloadAndExtract(skillId, version, path.dirname(install.installPath));
        recordUpdate(install, result);
      }
      return { ok: true, updated };
    },

    'skills:delete': async (payload) => {
      const skillId = String(payload?.skillId || '').trim();
      const installPaths = Array.isArray(payload?.installPaths)
        ? payload.installPaths.filter((p) => typeof p === 'string' && p.trim())
        : [];
      const deleteAll = Boolean(payload?.all);

      if (!skillId) throw new Error('skillId required');

      const installs = cli.listSkillInstalls(skillId);
      if (installs.length === 0) {
        throw new Error(`本地没有记录到 ${skillId} 的安装目录`);
      }

      const targetPaths = deleteAll ? installs.map((item) => item.installPath) : installPaths;
      if (targetPaths.length === 0) {
        throw new Error('请至少选择一个删除目录');
      }

      const result = cli.deleteSkillInstallDirs(skillId, targetPaths);
      if (result.deleted.length === 0) {
        return {
          ok: false,
          code: 'NO_DELETED',
          detail: '未删除任何目录',
          deleted: result.deleted,
          skipped: result.skipped
        };
      }

      return { ok: true, deleted: result.deleted, skipped: result.skipped };
    }
  };

  return { handlers, getSavedProjectRoot };
}
