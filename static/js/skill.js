/**
 * Skill Base - 详情页逻辑
 */

// 全局状态
let currentSkill = null;
let currentVersion = null;
let currentZip = null;  // 缓存已下载的 JSZip 实例
let versions = [];      // 版本列表

/** 当前打开的 Markdown 预览状态（用于 HTML / 源码切换） */
let markdownPreviewState = null;

// 文本文件扩展名列表（参考设计文档 5.3 节）
const TEXT_EXTS = new Set([
  '.md', '.py', '.sh', '.bash', '.zsh',
  '.js', '.jsx', '.ts', '.tsx', '.vue',
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.txt', '.text', '.log',
  '.html', '.htm', '.css', '.scss', '.sass', '.less',
  '.xml', '.sql', '.go', '.rs', '.java', '.c', '.cpp',
  '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt',
  '.dockerfile', '.gitignore', '.env.example',
]);

// 无扩展名但是文本文件
const TEXT_FILENAMES = new Set([
  'dockerfile', 'makefile', 'rakefile', 'readme', 'license', 'changelog',
  '.gitignore', '.gitattributes', '.editorconfig', '.env', '.env.example',
]);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  initMarkdownPreviewToggle();

  // 1. 从 URL 参数获取 skill_id
  const params = new URLSearchParams(window.location.search);
  const skillId = params.get('id');
  const requestedVersion = params.get('version');

  if (!skillId) {
    showToast(t('skill.missingId'), 'error');
    setTimeout(() => window.location.href = '/', 1500);
    return;
  }

  // 2. 检查登录状态
  const user = await checkAuth();
  if (!user) return;

  // 3. 渲染导航栏
  renderNavbar(user);

  // 4. 加载 Skill 详情
  await loadSkillDetail(skillId);

  // 5. 初始化协作者面板
  await initCollaboratorsPanel();

  // 6. 加载版本列表
  await loadVersions(skillId);

  // 7. 解析当前版本并加载 zip
  const initialVersion = resolveInitialVersion(requestedVersion);
  if (initialVersion) {
    await switchVersion(initialVersion);
  }
});

/**
 * 从请求参数、skill.latest_version 和版本列表中解析当前版本。
 * 真实数据源是 versions，数据库里的 latest_version 只是候选值。
 * @param {string | null} requestedVersion
 * @returns {string}
 */
function resolveInitialVersion(requestedVersion) {
  const versionSet = new Set(versions.map(v => v.version));

  if (requestedVersion && versionSet.has(requestedVersion)) {
    return requestedVersion;
  }

  if (currentSkill?.latest_version && versionSet.has(currentSkill.latest_version)) {
    return currentSkill.latest_version;
  }

  return versions[0]?.version || '';
}

function syncVersionInUrl(version) {
  const url = new URL(window.location.href);
  url.searchParams.set('version', version);
  window.history.replaceState({}, '', url);
}

function initMarkdownPreviewToggle() {
  const renderBtn = document.getElementById('md-view-render');
  const sourceBtn = document.getElementById('md-view-source');
  if (!renderBtn || !sourceBtn) return;
  renderBtn.addEventListener('click', () => setMarkdownPreviewMode('render'));
  sourceBtn.addEventListener('click', () => setMarkdownPreviewMode('source'));
}

function hideMarkdownPreviewActions() {
  markdownPreviewState = null;
  const wrap = document.getElementById('file-preview-md-actions');
  if (wrap) wrap.hidden = true;
}

function showMarkdownPreviewActions(content) {
  markdownPreviewState = { content, mode: 'render' };
  const wrap = document.getElementById('file-preview-md-actions');
  const renderBtn = document.getElementById('md-view-render');
  const sourceBtn = document.getElementById('md-view-source');
  if (wrap) wrap.hidden = false;
  renderBtn?.classList.add('is-active');
  sourceBtn?.classList.remove('is-active');
}

/**
 * 将 Markdown 渲染为 HTML，并做表格包裹（避免撑破布局）
 * @param {string} content
 * @returns {HTMLElement}
 */
function buildMarkdownBodyElement(content) {
  const html = marked.parse(content);
  const wrapper = document.createElement('div');
  wrapper.className = 'markdown-body';
  wrapper.innerHTML = html;
  wrapper.querySelectorAll('table').forEach((table) => {
    if (table.closest('.md-table-wrap')) return;
    const outer = document.createElement('div');
    outer.className = 'md-table-wrap';
    table.parentNode.insertBefore(outer, table);
    outer.appendChild(table);
  });
  const hl = typeof hljs !== 'undefined' ? hljs : null;
  wrapper.querySelectorAll('pre code').forEach((block) => {
    if (hl && typeof hl.highlightElement === 'function') {
      hl.highlightElement(block);
    }
  });
  return wrapper;
}

/**
 * @param {'render'|'source'} mode
 */
function setMarkdownPreviewMode(mode) {
  if (!markdownPreviewState) return;
  markdownPreviewState.mode = mode;
  const container = document.getElementById('file-content');
  if (!container) return;
  const renderBtn = document.getElementById('md-view-render');
  const sourceBtn = document.getElementById('md-view-source');
  renderBtn?.classList.toggle('is-active', mode === 'render');
  sourceBtn?.classList.toggle('is-active', mode === 'source');
  renderMarkdownPreview(container, markdownPreviewState.content, mode);
}

/**
 * @param {HTMLElement} container
 * @param {string} content
 * @param {'render'|'source'} mode
 */
function renderMarkdownPreview(container, content, mode) {
  if (mode === 'source') {
    container.innerHTML = `<pre class="md-source-pre"><code>${escapeHtml(content)}</code></pre>`;
    return;
  }
  container.innerHTML = '';
  container.appendChild(buildMarkdownBodyElement(content));
}

/**
 * 加载 Skill 详情
 * @param {string} skillId - Skill ID
 */
async function loadSkillDetail(skillId) {
  try {
    const skill = await apiGet(`/skills/${skillId}`);
    currentSkill = skill;

    // 更新页面标题
    document.title = `${skill.name} - Skill Base`;
    document.getElementById('breadcrumb-name').textContent = skill.name;

  // 渲染基本信息
  const currentUserObj = currentUser; // 从 app.js 中拿到缓存的用户
  renderSkillInfo(skill, currentUserObj);

  } catch (error) {
    console.error('Failed to load Skill detail:', error);
    showToast(t('skill.loadFailed') + ': ' + error.message, 'error');
    document.getElementById('skill-info').innerHTML = `
      <div class="empty-preview flex flex-col items-center justify-center py-10">
        <div class="empty-preview-icon text-4xl mb-4 opacity-50">❌</div>
        <p class="text-base-400 font-mono">${t('skill.loadFailed')}</p>
        <a href="/" class="mt-4 px-4 py-2 border border-neon-500 text-neon-400 bg-[rgba(0,255,163,0.05)] rounded hover:bg-[rgba(0,255,163,0.1)] transition-colors font-mono text-sm">${t('nav.home')}</a>
      </div>
    `;
  }
}

/**
 * 渲染 Skill 基本信息
 * @param {object} skill - Skill 数据
 */
function renderSkillInfo(skill, user) {
  const container = document.getElementById('skill-info');
  const ownerName = skill.owner?.name || skill.owner?.username || t('state.unknown');
  const createdTime = formatDate(skill.created_at);

  const isOwner = user && skill.owner_id === user.id;
  const isAdmin = user && user.role === 'admin';
  const canManage = isOwner || isAdmin;
  
  // 生成头像字母 (取大写首字母)
  const ownerInitial = (skill.owner?.username || '?').charAt(0).toUpperCase();

  container.innerHTML = `
    <div class="absolute top-0 right-0 bg-base-800 text-base-400 text-[10px] font-mono px-2 py-1 rounded-bl-lg opacity-50 select-none">ID: ${escapeHtml(skill.id.substring(0, 8))}</div>
    <h1 class="text-3xl font-bold text-white mb-3 flex items-center gap-3">
      <span class="text-neon-400 font-mono font-normal opacity-70">&gt;</span>
      ${escapeHtml(skill.name)}
    </h1>
    <p class="text-base-400 text-sm leading-relaxed max-w-5xl mb-6">
      ${escapeHtml(skill.description || t('state.noDesc'))}
    </p>
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-base-800 mt-6">
      <div class="relative w-full sm:flex-1 sm:max-w-md">
        <select id="version-select" class="w-full appearance-none bg-base-950 border border-base-800 text-white font-mono text-sm rounded-lg px-4 py-2.5 focus:outline-none focus:border-neon-500 focus:ring-1 focus:ring-neon-500 transition-colors cursor-pointer" onchange="onVersionChange(this.value)">
          <option value="">${t('skill.selectVersion')}</option>
        </select>
        <svg class="w-4 h-4 absolute right-4 top-3 pointer-events-none text-base-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
      </div>
      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4 sm:mt-0 flex-shrink-0">
        <button class="flex items-center justify-center gap-2 bg-transparent text-white border border-base-800 hover:bg-base-800 text-sm font-mono px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto" onclick="goToDiff()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
          ${t('skill.compare')}
        </button>
        <button class="flex items-center justify-center gap-2 bg-transparent border border-neon-500 text-neon-400 hover:bg-[rgba(0,255,163,0.1)] text-sm font-mono px-5 py-2.5 rounded-lg transition-colors w-full sm:w-auto shadow-[0_0_15px_rgba(0,255,163,0.1)] hover:shadow-[0_0_20px_rgba(0,255,163,0.2)]" onclick="downloadCurrentVersion()">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          ${t('skill.download')}
        </button>
      </div>
    </div>
  `;
}

/**
 * 加载版本列表
 * @param {string} skillId - Skill ID
 */
async function loadVersions(skillId) {
  try {
    const data = await apiGet(`/skills/${skillId}/versions`);
    versions = data.versions || [];

    // 渲染版本下拉框
    renderVersionSelect(versions);

    // 渲染版本历史列表
    renderVersionHistory(versions, skillId);

  } catch (error) {
    console.error('Failed to load version list:', error);
    showToast(t('skill.loadVersionsFailed'), 'error');
  }
}

/**
 * 渲染版本下拉框
 * @param {array} versions - 版本列表
 */
function renderVersionSelect(versions) {
  const select = document.getElementById('version-select');
  if (!select) return;

  select.innerHTML = versions.map((v, index) => {
    const label = index === 0 ? `${v.version} ${t('skill.latestTag')}` : v.version;
    return `<option value="${escapeHtml(v.version)}">${escapeHtml(label)}</option>`;
  }).join('');

  // 默认选中第一个（最新版本）
  if (versions.length > 0) {
    select.value = versions[0].version;
  }
}

/**
 * 渲染版本历史列表
 * @param {array} versions - 版本列表
 * @param {string} skillId - Skill ID
 */
function renderVersionHistory(versions, skillId) {
  const container = document.getElementById('version-list');

  if (versions.length === 0) {
    container.innerHTML = `
      <div class="empty-preview flex flex-col items-center justify-center h-full min-h-[200px] p-8">
        <p class="text-base-400 font-mono">${t('skill.noVersions')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = versions.map((v, index) => {
    const uploaderName = v.uploader?.name || v.uploader?.username || t('state.unknown');
    const createdTime = formatDate(v.created_at);

    return `
      <div class="relative pl-6 group/item mb-8">
        <span class="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full ${index === 0 ? 'bg-neon-400 ring-4 ring-base-900 shadow-[0_0_8px_rgba(0,255,163,0.8)]' : 'bg-base-800 ring-4 ring-base-900 group-hover/item:bg-neon-500 transition-colors'}"></span>
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <span class="${index === 0 ? 'text-neon-400 border border-neon-500/30 bg-[rgba(0,255,163,0.05)]' : 'text-base-400 border border-base-800 group-hover/item:border-neon-500/30 group-hover/item:text-neon-400'} transition-colors text-xs px-2 py-0.5 rounded font-mono">${escapeHtml(v.version)}</span>
              ${index === 0 ? '<span class="bg-base-200 text-base-900 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide font-mono uppercase">Head</span>' : ''}
            </div>
            <p class="text-sm ${index === 0 ? 'text-white' : 'text-base-200'} font-medium mt-2">${escapeHtml(v.changelog || t('skill.noChangelog'))}</p>
            <p class="text-xs text-base-400 mt-1 flex items-center gap-1.5 font-mono">
              by @${escapeHtml(uploaderName)}
            </p>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <span class="text-xs text-base-400 font-mono hidden sm:inline-block">${createdTime}</span>
            <button title="Download Version" class="flex items-center justify-center p-2 text-base-400 border border-base-800 rounded bg-base-950 hover:text-neon-400 hover:border-neon-500 hover:bg-[rgba(0,255,163,0.1)] hover:shadow-[0_0_10px_rgba(0,255,163,0.15)] transition-all group" onclick="event.stopPropagation(); window.open('/api/v1/skills/${skillId}/versions/${v.version}/download')">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * 版本选择变更事件
 * @param {string} version - 选中的版本
 */
async function onVersionChange(version) {
  if (version && version !== currentVersion) {
    await switchVersion(version);
  }
}

/**
 * 切换版本
 * @param {string} version - 版本号
 */
async function switchVersion(version) {
  if (!currentSkill) return;

  const fileTreeContainer = document.getElementById('file-tree');
  const fileContentContainer = document.getElementById('file-content');

  // 显示 Loading
  fileTreeContainer.innerHTML = `
    <div class="loading-content">
      <div class="spinner spinner-sm"></div>
    </div>
  `;

  try {
    // 下载 zip
    const downloadUrl = `/api/v1/skills/${currentSkill.id}/versions/${version}/download`;
    const response = await fetch(downloadUrl, { credentials: 'same-origin' });

    if (!response.ok) {
      throw new Error(t('skill.zipFailed'));
    }

    const zipData = await response.arrayBuffer();

    // 使用 JSZip 解压
    const zip = await JSZip.loadAsync(zipData);
    currentZip = zip;
    currentVersion = version;
    syncVersionInUrl(version);

    // 更新版本下拉框选中状态
    const select = document.getElementById('version-select');
    if (select) {
      select.value = version;
    }

    // 生成目录树
    const fileTree = generateFileTree(zip);
    renderFileTree(fileTree, fileTreeContainer);

    // 重置文件预览区域
    hideMarkdownPreviewActions();
    document.getElementById('file-preview-path').textContent = t('skill.selectFile');
    fileContentContainer.innerHTML = `
      <div class="flex items-center gap-3 opacity-30 font-mono mb-4">
        <span class="text-neon-400 animate-pulse">_</span>
        <span>EOF</span>
      </div>
      <p class="text-sm font-mono">${t('skill.clickFile')}</p>
    `;

  } catch (error) {
    console.error('Failed to switch version:', error);
    showToast(t('skill.versionFailed') + error.message, 'error');
    fileTreeContainer.innerHTML = `
        <div class="empty-preview flex flex-col items-center justify-center py-10">
          <p class="text-red-500 font-mono">${t('file.loadFailed')}</p>
        </div>
    `;
  }
}

/**
 * 生成目录树（从 JSZip 实例）
 * @param {JSZip} zip - JSZip 实例
 * @returns {array} - 目录树结构
 */
function generateFileTree(zip) {
  const root = { type: 'directory', name: '', children: [], path: '' };

  zip.forEach((relativePath, zipEntry) => {
    // 跳过空路径
    if (!relativePath) return;

    const parts = relativePath.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const isDir = zipEntry.dir || !isLast;

      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = {
          type: isDir ? 'directory' : 'file',
          name: part,
          path: relativePath,
          ...(isDir ? { children: [] } : {})
        };
        current.children.push(child);
      }
      if (isDir) current = child;
    }
  });

  // 排序：目录在前，文件在后，按名称排序
  sortTree(root.children);

  return root.children;
}

/**
 * 对目录树排序
 * @param {array} nodes - 节点数组
 */
function sortTree(nodes) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  nodes.forEach(node => {
    if (node.children) {
      sortTree(node.children);
    }
  });
}

/**
 * 渲染目录树 DOM
 * @param {array} nodes - 目录树节点数组
 * @param {HTMLElement} container - 容器元素
 * @param {number} level - 层级深度
 */
function renderFileTree(nodes, container, level = 0) {
  if (!nodes || nodes.length === 0) {
  container.innerHTML = `
    <div class="empty-preview flex flex-col items-center justify-center py-10">
      <p class="text-base-400 font-mono">${t('state.empty')}</p>
    </div>
  `;
    return;
  }

  const ul = document.createElement('ul');
  if (level === 0) {
    ul.style.paddingLeft = '0';
  }

  nodes.forEach(node => {
    const li = document.createElement('li');

    if (node.type === 'directory') {
      li.className = 'file-tree-folder open';
      li.innerHTML = `
        <div class="file-tree-item">
          <svg class="w-4 h-4 opacity-70 flex-shrink-0 text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <span class="name font-bold truncate">${escapeHtml(node.name)}</span>
        </div>
      `;

      const childContainer = document.createElement('ul');
      renderFileTreeChildren(node.children, childContainer);
      li.appendChild(childContainer);

      // 绑定折叠/展开事件
      const itemDiv = li.querySelector('.file-tree-item');
      itemDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        li.classList.toggle('open');
        const icon = li.querySelector('svg');
        if (icon) {
           if (li.classList.contains('open')) {
             icon.outerHTML = '<svg class="w-4 h-4 opacity-70 flex-shrink-0 text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
           } else {
             icon.outerHTML = '<svg class="w-4 h-4 opacity-70 flex-shrink-0 text-base-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
           }
        }
      });

    } else {
      li.className = 'file-tree-file';
      li.innerHTML = `
        <div class="file-tree-item" data-path="${escapeHtml(node.path)}">
          <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
          <span class="name truncate">${escapeHtml(node.name)}</span>
        </div>
      `;

      // 绑定点击预览事件
      const itemDiv = li.querySelector('.file-tree-item');
      itemDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        // 移除其他选中状态
        document.querySelectorAll('.file-tree-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        itemDiv.classList.add('selected');
        previewFile(node.path);
      });
    }

    ul.appendChild(li);
  });

  container.innerHTML = '';
  container.appendChild(ul);
}

/**
 * 渲染子目录（递归辅助函数）
 * @param {array} nodes - 子节点数组
 * @param {HTMLElement} container - 容器元素
 */
function renderFileTreeChildren(nodes, container) {
  if (!nodes || nodes.length === 0) return;

  nodes.forEach(node => {
    const li = document.createElement('li');

    if (node.type === 'directory') {
      li.className = 'file-tree-folder open';
      li.innerHTML = `
        <div class="file-tree-item">
          <svg class="w-4 h-4 opacity-70 flex-shrink-0 text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
          <span class="name font-bold truncate">${escapeHtml(node.name)}</span>
        </div>
      `;

      const childContainer = document.createElement('ul');
      renderFileTreeChildren(node.children, childContainer);
      li.appendChild(childContainer);

      const itemDiv = li.querySelector('.file-tree-item');
      itemDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        li.classList.toggle('open');
        const icon = li.querySelector('svg');
        if (icon) {
           if (li.classList.contains('open')) {
             icon.outerHTML = '<svg class="w-4 h-4 opacity-70 flex-shrink-0 text-neon-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>';
           } else {
             icon.outerHTML = '<svg class="w-4 h-4 opacity-70 flex-shrink-0 text-base-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>';
           }
        }
      });

    } else {
      li.className = 'file-tree-file';
      li.innerHTML = `
        <div class="file-tree-item" data-path="${escapeHtml(node.path)}">
          <svg class="w-4 h-4 opacity-70 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
          <span class="name truncate">${escapeHtml(node.name)}</span>
        </div>
      `;

      const itemDiv = li.querySelector('.file-tree-item');
      itemDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.file-tree-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        itemDiv.classList.add('selected');
        previewFile(node.path);
      });
    }

    container.appendChild(li);
  });
}

/**
 * 预览文件内容
 * @param {string} filePath - 文件路径
 */
async function previewFile(filePath) {
  if (!currentZip) {
    showToast(t('skill.selectVersionFirst'), 'warning');
    return;
  }

  hideMarkdownPreviewActions();

  const container = document.getElementById('file-content');
  const pathDisplay = document.getElementById('file-preview-path');

  // 更新路径显示
  pathDisplay.textContent = filePath;

  // 显示 Loading
  container.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
    </div>
  `;

  try {
    const file = currentZip.file(filePath);
    if (!file) {
      container.innerHTML = `
        <div class="empty-preview flex flex-col items-center justify-center py-10">
          <div class="empty-preview-icon text-4xl mb-4 opacity-50">❓</div>
          <p class="text-base-400 font-mono">${t('skill.fileNotFound')}</p>
        </div>
      `;
      return;
    }

    // 判断是否为文本文件
    const isText = isTextFile(filePath);

    if (!isText) {
      // 二进制文件
      container.innerHTML = `
        <div class="binary-notice">
          <div class="binary-notice-icon">📦</div>
          <p>${t('skill.binaryFile')}</p>
          <p class="text-muted mt-1">${t('skill.binaryHint')}</p>
        </div>
      `;
      return;
    }

    // 读取文本内容
    const content = await file.async('string');
    const ext = getFileExtension(filePath).toLowerCase();

    // 根据扩展名决定渲染方式
    if (ext === '.md') {
      showMarkdownPreviewActions(content);
      renderMarkdownPreview(container, content, 'render');
    } else if (isCodeFile(ext)) {
      // 代码高亮
      const language = getLanguageFromExt(ext);
      let highlighted;
      const hl = typeof hljs !== 'undefined' ? hljs : null;
      if (hl && typeof hl.highlight === 'function') {
        try {
          highlighted = hl.highlight(content, { language }).value;
        } catch {
          highlighted = escapeHtml(content);
        }
      } else {
        highlighted = escapeHtml(content);
      }
      container.innerHTML = `<pre><code class="hljs">${highlighted}</code></pre>`;
    } else {
      // 纯文本
      container.innerHTML = `<pre><code>${escapeHtml(content)}</code></pre>`;
    }

  } catch (error) {
    console.error('Failed to preview file:', error);
    container.innerHTML = `
      <div class="empty-preview flex flex-col items-center justify-center py-10">
        <div class="empty-preview-icon text-4xl mb-4 opacity-50">❌</div>
        <p class="text-base-400 font-mono">${t('skill.previewFailed')} ${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

/**
 * 判断是否为文本文件
 * @param {string} filePath - 文件路径
 * @returns {boolean}
 */
function isTextFile(filePath) {
  const ext = getFileExtension(filePath).toLowerCase();
  const fileName = filePath.split('/').pop().toLowerCase();

  // 检查扩展名
  if (TEXT_EXTS.has(ext)) {
    return true;
  }

  // 检查特殊文件名
  if (TEXT_FILENAMES.has(fileName)) {
    return true;
  }

  // 没有扩展名的文件，默认当作文本
  if (!ext || ext === '.') {
    return true;
  }

  return false;
}

/**
 * 获取文件扩展名
 * @param {string} filePath - 文件路径
 * @returns {string}
 */
function getFileExtension(filePath) {
  const fileName = filePath.split('/').pop();
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === 0) {
    return '';
  }
  return fileName.substring(dotIndex);
}

/**
 * 判断是否为代码文件
 * @param {string} ext - 扩展名
 * @returns {boolean}
 */
function isCodeFile(ext) {
  const codeExts = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.vue',
    '.py', '.sh', '.bash', '.zsh',
    '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
    '.html', '.htm', '.css', '.scss', '.sass', '.less',
    '.xml', '.sql', '.go', '.rs', '.java', '.c', '.cpp',
    '.h', '.hpp', '.cs', '.rb', '.php', '.swift', '.kt',
  ]);
  return codeExts.has(ext);
}

/**
 * 根据扩展名获取 highlight.js 语言标识
 * @param {string} ext - 扩展名
 * @returns {string}
 */
function getLanguageFromExt(ext) {
  const langMap = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.vue': 'xml',
    '.py': 'python',
    '.sh': 'bash',
    '.bash': 'bash',
    '.zsh': 'bash',
    '.json': 'json',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'ini',
    '.ini': 'ini',
    '.cfg': 'ini',
    '.html': 'xml',
    '.htm': 'xml',
    '.xml': 'xml',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'scss',
    '.less': 'less',
    '.sql': 'sql',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.c': 'c',
    '.cpp': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.kt': 'kotlin',
  };
  return langMap[ext] || 'plaintext';
}

/**
 * 下载当前版本 zip
 */
function downloadCurrentVersion() {
  if (!currentSkill || !currentVersion) {
    showToast(t('skill.selectVersionFirst'), 'warning');
    return;
  }

  const downloadUrl = `/api/v1/skills/${currentSkill.id}/versions/${currentVersion}/download`;
  window.open(downloadUrl);
}

/**
 * 跳转到版本对比页
 */
function goToDiff() {
  if (!currentSkill) {
    showToast(t('skill.infoLoading'), 'warning');
    return;
  }

  if (versions.length < 2) {
    showToast(t('skill.needTwoVersions'), 'warning');
    return;
  }

  // 跳转到 diff 页面，默认对比最新两个版本
  const versionA = versions[1]?.version || '';
  const versionB = versions[0]?.version || '';
  window.location.href = `/diff.html?id=${encodeURIComponent(currentSkill.id)}&version_a=${encodeURIComponent(versionA)}&version_b=${encodeURIComponent(versionB)}`;
}

/**
 * 切换版本历史折叠状态
 */
function toggleVersionHistory() {
  const container = document.getElementById('version-history');
  container.classList.toggle('collapsed');
}

/**
 * 切换文件预览区全屏模式
 */
function toggleFullscreen() {
  const panel = document.getElementById('file-preview-panel');
  const expandIcon = document.getElementById('fullscreen-icon-expand');
  const collapseIcon = document.getElementById('fullscreen-icon-collapse');
  
  panel.classList.toggle('fullscreen');
  
  const isFullscreen = panel.classList.contains('fullscreen');
  expandIcon.classList.toggle('hidden', isFullscreen);
  collapseIcon.classList.toggle('hidden', !isFullscreen);
  
  // 全屏时禁止页面滚动
  document.body.style.overflow = isFullscreen ? 'hidden' : '';
}

// ESC 键退出全屏
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const panel = document.getElementById('file-preview-panel');
    if (panel && panel.classList.contains('fullscreen')) {
      toggleFullscreen();
    }
  }
});
