import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { execFile } from 'node:child_process';
import { getConfig } from '../config.js';
import { loadCredentials } from '../auth.js';
import { listInstalledSkills, rememberSkillInstall } from '../installs.js';
import { downloadAndExtract } from './install.js';
import { buildTargetInstalls, resolveImplicitSelectedInstalls } from './update.js';
import {
  detectInsideIdeDir,
  resolveInstallDir,
  getIdeChoices,
  getSupportedIdeIds,
  IDE_CONFIGS
} from '../ide.js';
import { pickMessage, detectSystemLanguage } from '../i18n.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML_PATH = path.join(__dirname, 'ui-page.html');

function readBody(req, limit = 2_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let len = 0;
    req.on('data', (c) => {
      len += c.length;
      if (len > limit) {
        req.destroy();
        reject(new Error('body too large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function serveIndex(res) {
  let html = fs.readFileSync(HTML_PATH, 'utf-8');
  const lang = detectSystemLanguage();
  html = html.replace(/__INITIAL_LANG__/g, JSON.stringify(lang));
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html)
  });
  res.end(html);
}

async function proxyApi(req, res) {
  const { baseUrl } = getConfig();
  const targetUrl = new URL(req.url || '/', baseUrl);
  const cred = loadCredentials();
  const headers = {};
  if (cred?.token) {
    headers.Authorization = `Bearer ${cred.token}`;
  }
  const ct = req.headers['content-type'];
  if (ct) {
    headers['Content-Type'] = ct;
  }

  const method = req.method || 'GET';
  let body;
  if (!['GET', 'HEAD'].includes(method)) {
    body = await readBody(req);
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, { method, headers, body });
  } catch (e) {
    json(res, 502, { detail: `upstream fetch failed: ${e.message}` });
    return;
  }

  const isDownload =
    method === 'GET' && /\/versions\/[^/]+\/download(?:\?|$)/.test(targetUrl.pathname);

  if (isDownload && upstream.ok && upstream.body) {
    const hop = [];
    const ac = upstream.headers.get('content-type');
    if (ac) hop.push(['Content-Type', ac]);
    const cl = upstream.headers.get('content-length');
    if (cl) hop.push(['Content-Length', cl]);
    const cd = upstream.headers.get('content-disposition');
    if (cd) hop.push(['Content-Disposition', cd]);
    res.writeHead(upstream.status, hop);
    try {
      const nodeReadable = Readable.fromWeb(upstream.body);
      nodeReadable.pipe(res);
    } catch {
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.end(buf);
    }
    return;
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  const outHeaders = { 'Content-Type': upstream.headers.get('content-type') || 'application/json' };
  res.writeHead(upstream.status, outHeaders);
  res.end(buf);
}

function handleLocalConfig(res) {
  const { baseUrl } = getConfig();
  const cred = loadCredentials();
  json(res, 200, {
    baseUrl,
    username: cred?.username || null,
    hasToken: Boolean(cred?.token),
    ideChoices: [{ id: '_cwd', name: pickMessage({ zh: '当前目录', en: 'Current directory' }) }, ...getIdeChoices().map((c) => ({ id: c.value, name: c.title }))],
    supportedIdeIds: getSupportedIdeIds()
  });
}

function handleLocalInstalled(res) {
  json(res, 200, { skills: listInstalledSkills() });
}

async function handleLocalInstall(req, res, cwd) {
  let payload;
  try {
    const raw = await readBody(req, 64_000);
    payload = JSON.parse(raw.toString('utf-8') || '{}');
  } catch {
    json(res, 400, { detail: 'invalid JSON body' });
    return;
  }

  const skillId = typeof payload.skillId === 'string' ? payload.skillId.trim() : '';
  const version = typeof payload.version === 'string' && payload.version ? payload.version : 'latest';
  const ide = payload.ide;
  const global = Boolean(payload.global);
  const overwrite = Boolean(payload.overwrite);
  const acceptNested = Boolean(payload.acceptNested);

  if (!skillId) {
    json(res, 400, { detail: 'skillId required' });
    return;
  }
  if (!ide || typeof ide !== 'string') {
    json(res, 400, { detail: 'ide required' });
    return;
  }

  let targetDir;
  let selectedIdeId = null;

  try {
    if (ide === '_cwd') {
      targetDir = path.resolve(cwd);
    } else {
      if (!getSupportedIdeIds().includes(ide)) {
        json(res, 400, { detail: `Unsupported ide: ${ide}` });
        return;
      }
      if (global && !IDE_CONFIGS[ide].supportsGlobal) {
        json(res, 400, {
          detail: pickMessage({
            zh: `${IDE_CONFIGS[ide].name} 不支持全局安装`,
            en: `${IDE_CONFIGS[ide].name} does not support global installation`
          })
        });
        return;
      }
      const insideIde = detectInsideIdeDir(cwd);
      if (insideIde && !acceptNested) {
        json(res, 409, {
          code: 'NESTED_IDE_PATH',
          detail: pickMessage({
            zh: `当前目录已在 ${insideIde.name} 的 skill 路径内，若仍要安装请勾选确认嵌套。`,
            en: `cwd is inside ${insideIde.name} skill path; confirm nested install.`
          }),
          ideId: insideIde.id
        });
        return;
      }
      selectedIdeId = ide;
      targetDir = resolveInstallDir(ide, skillId, global, cwd);
    }

    const installPathCandidate = path.join(path.resolve(targetDir), skillId);
    if (fs.existsSync(installPathCandidate)) {
      if (!overwrite) {
        json(res, 409, {
          code: 'EXISTS',
          detail: pickMessage({
            zh: '目标目录已存在同名 Skill，请在界面中勾选覆盖后重试。',
            en: 'Target folder exists; enable overwrite to replace.'
          }),
          path: installPathCandidate
        });
        return;
      }
      fs.rmSync(installPathCandidate, { recursive: true, force: true });
    }

    const result = await downloadAndExtract(skillId, version, targetDir);
    const installPath = path.join(result.targetDir, skillId);
    rememberSkillInstall({
      skillId: result.skillId,
      installPath,
      version: result.version,
      ide: selectedIdeId || '',
      isGlobal: global
    });
    json(res, 200, {
      ok: true,
      skillId: result.skillId,
      version: result.version,
      installPath
    });
  } catch (e) {
    json(res, 500, { detail: e.message || String(e) });
  }
}

async function handleLocalUpdate(req, res) {
  let payload;
  try {
    const raw = await readBody(req, 64_000);
    payload = JSON.parse(raw.toString('utf-8') || '{}');
  } catch {
    json(res, 400, { detail: 'invalid JSON body' });
    return;
  }

  const skillId = typeof payload.skillId === 'string' ? payload.skillId.trim() : '';
  const version = typeof payload.version === 'string' ? payload.version.trim() : '';
  let installPaths = Array.isArray(payload.installPaths) ? payload.installPaths.filter((p) => typeof p === 'string') : null;

  if (!skillId || !version) {
    json(res, 400, { detail: 'skillId and version required' });
    return;
  }

  const options = payload.dir && typeof payload.dir === 'string' ? { dir: payload.dir } : {};
  const installs = buildTargetInstalls(skillId, options);
  if (installs.length === 0) {
    json(res, 404, {
      detail: pickMessage({
        zh: `本地没有记录到 ${skillId} 的安装目录`,
        en: `No local install path recorded for ${skillId}`
      })
    });
    return;
  }

  if (!installPaths || installPaths.length === 0) {
    const implicit = resolveImplicitSelectedInstalls(installs, options);
    if (!implicit) {
      json(res, 400, {
        code: 'PICK_PATHS',
        detail: pickMessage({
          zh: '存在多个安装目录，请在界面中选择要更新的路径。',
          en: 'Multiple install paths; select directories to update.'
        }),
        installs
      });
      return;
    }
    installPaths = implicit.map((i) => i.installPath);
  }

  const selected = installs.filter((i) => installPaths.includes(i.installPath));
  if (selected.length === 0) {
    json(res, 400, { detail: 'no matching install paths' });
    return;
  }

  const updated = [];
  try {
    for (const install of selected) {
      const result = await downloadAndExtract(skillId, version, path.dirname(install.installPath));
      rememberSkillInstall({
        skillId: result.skillId,
        installPath: install.installPath,
        version: result.version,
        ide: install.ide,
        isGlobal: install.isGlobal
      });
      updated.push({ installPath: install.installPath, version: result.version });
    }
    json(res, 200, { ok: true, updated });
  } catch (e) {
    json(res, 500, { detail: e.message || String(e) });
  }
}

function openBrowser(url) {
  const platform = process.platform;
  try {
    if (platform === 'darwin') {
      execFile('open', [url], () => {});
    } else if (platform === 'win32') {
      execFile('cmd', ['/c', 'start', '', url], { windowsHide: true }, () => {});
    } else {
      execFile('xdg-open', [url], () => {});
    }
  } catch {
    // ignore
  }
}

export default async function uiCommand(options) {
  const host = options.host || '127.0.0.1';
  const port = Number(options.port) || 9847;
  const shouldOpen = !options.noOpen;

  if (!fs.existsSync(HTML_PATH)) {
    console.error(pickMessage({ zh: '缺少界面资源文件', en: 'UI page asset missing' }));
    process.exit(1);
  }

  const cwd = process.cwd();

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const p = url.pathname;

      if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
        serveIndex(res);
        return;
      }

      if (req.method === 'GET' && p === '/skb-local/health') {
        json(res, 200, { ok: true });
        return;
      }

      if (req.method === 'GET' && p === '/skb-local/config') {
        handleLocalConfig(res);
        return;
      }

      if (req.method === 'GET' && p === '/skb-local/installed') {
        handleLocalInstalled(res);
        return;
      }

      if (req.method === 'POST' && p === '/skb-local/install') {
        await handleLocalInstall(req, res, cwd);
        return;
      }

      if (req.method === 'POST' && p === '/skb-local/update') {
        await handleLocalUpdate(req, res);
        return;
      }

      if (p.startsWith('/api/v1/')) {
        await proxyApi(req, res);
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    } catch (e) {
      if (!res.headersSent) {
        json(res, 500, { detail: e.message || String(e) });
      } else {
        res.destroy();
      }
    }
  });

  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        server.removeListener('error', reject);
        resolve();
      });
    });
  } catch (err) {
    if (err && err.code === 'EADDRINUSE') {
      console.error(
        pickMessage({
          zh: `端口 ${port} 已被占用，请使用 --port 指定其它端口。`,
          en: `Port ${port} is in use; pass --port to use another port.`
        })
      );
    } else {
      console.error(err?.message || String(err));
    }
    process.exit(1);
  }

  const displayHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  const url = `http://${displayHost}:${port}/`;
  console.log(
    pickMessage({
      zh: `Skill Base 本地 Web UI 已启动: ${url}\n在项目根目录执行本命令时，「当前目录」安装会落到该目录。\n按 Ctrl+C 停止。`,
      en: `Skill Base Web UI: ${url}\nInstall to "current directory" uses the folder where you ran this command.\nPress Ctrl+C to stop.`
    })
  );

  if (shouldOpen) {
    openBrowser(`http://${displayHost}:${port}/`);
  }
}
