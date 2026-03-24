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

  if (!skillId) {
    showToast('缺少 Skill ID 参数', 'error');
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

  // 5. 加载版本列表
  await loadVersions(skillId);

  // 6. 默认加载最新版本的 zip 并生成目录树
  if (currentSkill && currentSkill.latest_version) {
    await switchVersion(currentSkill.latest_version);
  }
});

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
    renderSkillInfo(skill);

  } catch (error) {
    console.error('加载 Skill 详情失败:', error);
    showToast('加载失败: ' + error.message, 'error');
    document.getElementById('skill-info').innerHTML = `
      <div class="empty-preview">
        <div class="empty-preview-icon">❌</div>
        <p>加载 Skill 详情失败</p>
        <a href="/" class="btn btn-primary mt-2">返回首页</a>
      </div>
    `;
  }
}

/**
 * 渲染 Skill 基本信息
 * @param {object} skill - Skill 数据
 */
function renderSkillInfo(skill) {
  const container = document.getElementById('skill-info');
  const ownerName = skill.owner?.username || '未知';
  const createdTime = formatDate(skill.created_at);

  container.innerHTML = `
    <div class="skill-header">
      <div>
        <h1 class="skill-title">${escapeHtml(skill.name)}</h1>
        <p class="skill-desc">${escapeHtml(skill.description || '暂无描述')}</p>
      </div>
    </div>
    <div class="skill-meta">
      <div class="skill-meta-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>负责人: ${escapeHtml(ownerName)}</span>
      </div>
      <div class="skill-meta-item">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>创建时间: ${createdTime}</span>
      </div>
    </div>
    <div class="skill-actions">
      <select id="version-select" class="version-select" onchange="onVersionChange(this.value)">
        <option value="">选择版本...</option>
      </select>
      <button class="btn btn-primary" onclick="downloadCurrentVersion()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        下载当前版本
      </button>
      <button class="btn btn-secondary" onclick="goToDiff()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
        对比版本
      </button>
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
    renderVersionHistory(versions);

  } catch (error) {
    console.error('加载版本列表失败:', error);
    showToast('加载版本列表失败', 'error');
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
    const label = index === 0 ? `${v.version} (最新)` : v.version;
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
 */
function renderVersionHistory(versions) {
  const container = document.getElementById('version-list');

  if (versions.length === 0) {
    container.innerHTML = `
      <div class="empty-preview" style="padding: var(--spacing-lg);">
        <p class="text-muted">暂无版本记录</p>
      </div>
    `;
    return;
  }

  container.innerHTML = versions.map((v, index) => {
    const uploaderName = v.uploader?.username || '未知';
    const createdTime = formatDate(v.created_at);
    const tagClass = index === 0 ? 'version-tag latest' : 'version-tag';

    return `
      <div class="version-item">
        <span class="${tagClass}">${escapeHtml(v.version)}</span>
        <div class="version-item-info">
          <div class="version-item-changelog">${escapeHtml(v.changelog || '无更新说明')}</div>
          <div class="version-item-meta">
            <span>上传者: ${escapeHtml(uploaderName)}</span>
            <span>${createdTime}</span>
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
      throw new Error('下载 zip 失败');
    }

    const zipData = await response.arrayBuffer();

    // 使用 JSZip 解压
    const zip = await JSZip.loadAsync(zipData);
    currentZip = zip;
    currentVersion = version;

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
    document.getElementById('file-preview-path').textContent = '选择文件以预览';
    fileContentContainer.innerHTML = `
      <div class="empty-preview">
        <div class="empty-preview-icon">📄</div>
        <p>点击左侧文件查看内容</p>
      </div>
    `;

  } catch (error) {
    console.error('切换版本失败:', error);
    showToast('加载版本失败: ' + error.message, 'error');
    fileTreeContainer.innerHTML = `
      <div class="empty-preview">
        <p class="text-error">加载失败</p>
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
  const root = { type: 'directory', name: '', children: [] };

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
      <div class="empty-preview">
        <p class="text-muted">空目录</p>
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
          <span class="icon">📁</span>
          <span class="name">${escapeHtml(node.name)}</span>
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
        const icon = li.querySelector('.icon');
        icon.textContent = li.classList.contains('open') ? '📁' : '📂';
      });

    } else {
      li.className = 'file-tree-file';
      li.innerHTML = `
        <div class="file-tree-item" data-path="${escapeHtml(node.path)}">
          <span class="icon">📄</span>
          <span class="name">${escapeHtml(node.name)}</span>
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
          <span class="icon">📁</span>
          <span class="name">${escapeHtml(node.name)}</span>
        </div>
      `;

      const childContainer = document.createElement('ul');
      renderFileTreeChildren(node.children, childContainer);
      li.appendChild(childContainer);

      const itemDiv = li.querySelector('.file-tree-item');
      itemDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        li.classList.toggle('open');
        const icon = li.querySelector('.icon');
        icon.textContent = li.classList.contains('open') ? '📁' : '📂';
      });

    } else {
      li.className = 'file-tree-file';
      li.innerHTML = `
        <div class="file-tree-item" data-path="${escapeHtml(node.path)}">
          <span class="icon">📄</span>
          <span class="name">${escapeHtml(node.name)}</span>
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
    showToast('请先选择版本', 'warning');
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
        <div class="empty-preview">
          <div class="empty-preview-icon">❓</div>
          <p>文件不存在</p>
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
          <p>二进制文件，无法预览</p>
          <p class="text-muted mt-1">请下载 zip 包后在本地查看</p>
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
    console.error('预览文件失败:', error);
    container.innerHTML = `
      <div class="empty-preview">
        <div class="empty-preview-icon">❌</div>
        <p>预览失败: ${escapeHtml(error.message)}</p>
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
    showToast('请先选择版本', 'warning');
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
    showToast('Skill 信息加载中', 'warning');
    return;
  }

  if (versions.length < 2) {
    showToast('至少需要两个版本才能对比', 'warning');
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
