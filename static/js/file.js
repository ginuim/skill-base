/**
 * Skill Base - 文件预览页逻辑
 */

// 文本文件扩展名列表
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

// 二进制文件魔数
const BINARY_MAGIC = [
  [0x89, 0x50, 0x4E, 0x47], // PNG
  [0xFF, 0xD8, 0xFF],       // JPEG
  [0x47, 0x49, 0x46, 0x38], // GIF
  [0x50, 0x4B, 0x03, 0x04], // ZIP
  [0x25, 0x50, 0x44, 0x46], // PDF
];

// 大文件阈值 (1MB)
const LARGE_FILE_SIZE = 1024 * 1024;

// 全局状态
let currentSkill = null;
let currentVersion = null;
let currentFilePath = null;
let currentZip = null;
let versions = [];

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const skillId = params.get('id');
  const version = params.get('version');
  const filePath = params.get('path');

  if (!skillId) {
    showToast('缺少 Skill ID 参数', 'error');
    setTimeout(() => window.location.href = '/', 1500);
    return;
  }

  // 1. 检查登录状态
  const user = await checkAuth();
  if (!user) return;

  // 2. 渲染导航栏
  renderNavbar(user);

  // 3. 加载 Skill 信息用于面包屑
  await loadSkillInfo(skillId);

  // 4. 加载版本列表
  await loadVersions(skillId);

  // 5. 确定当前版本
  currentVersion = version || (currentSkill?.latest_version);
  if (!currentVersion && versions.length > 0) {
    currentVersion = versions[0].version;
  }

  // 6. 下载并解压 zip
  if (currentVersion) {
    await loadZipAndTree(currentVersion);
  }

  // 7. 如果有文件路径参数，预览该文件
  if (filePath) {
    currentFilePath = filePath;
    await previewFile(filePath);
    highlightCurrentFile(filePath);
  }
});

/**
 * 加载 Skill 信息
 * @param {string} skillId - Skill ID
 */
async function loadSkillInfo(skillId) {
  try {
    const skill = await apiGet(`/skills/${skillId}`);
    currentSkill = skill;

    // 更新页面标题
    document.title = `文件预览 - ${skill.name} - Skill Base`;

    // 更新面包屑
    const breadcrumbSkill = document.getElementById('breadcrumb-skill');
    breadcrumbSkill.textContent = skill.name;
    breadcrumbSkill.href = `/skill.html?id=${encodeURIComponent(skillId)}`;

  } catch (error) {
    console.error('加载 Skill 信息失败:', error);
    showToast('加载 Skill 信息失败', 'error');
  }
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
    const select = document.getElementById('version-select');
    if (select) {
      select.innerHTML = '<option value="">选择其他版本...</option>' +
        versions.map((v, index) => {
          const label = index === 0 ? `${v.version} (最新)` : v.version;
          return `<option value="${escapeHtml(v.version)}">${escapeHtml(label)}</option>`;
        }).join('');
    }
  } catch (error) {
    console.error('加载版本列表失败:', error);
  }
}

/**
 * 加载 ZIP 并生成目录树
 * @param {string} version - 版本号
 */
async function loadZipAndTree(version) {
  const fileTreeContainer = document.getElementById('file-tree');

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

    // 更新版本显示
    document.getElementById('current-version').textContent = version;

    // 更新版本下拉框选中状态
    const select = document.getElementById('version-select');
    if (select) {
      select.value = '';
    }

    // 生成目录树
    const fileTree = generateFileTree(zip);
    renderFileTree(fileTree, fileTreeContainer, currentFilePath);

  } catch (error) {
    console.error('加载 ZIP 失败:', error);
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

  // 排序：目录在前，文件在后
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
 * @param {string} currentPath - 当前高亮的文件路径
 */
function renderFileTree(nodes, container, currentPath = null) {
  if (!nodes || nodes.length === 0) {
    container.innerHTML = `
      <div class="empty-preview">
        <p class="text-muted">空目录</p>
      </div>
    `;
    return;
  }

  const ul = document.createElement('ul');
  ul.style.paddingLeft = '0';

  renderFileTreeNodes(nodes, ul, currentPath);

  container.innerHTML = '';
  container.appendChild(ul);
}

/**
 * 递归渲染目录树节点
 * @param {array} nodes - 节点数组
 * @param {HTMLElement} container - 容器元素
 * @param {string} currentPath - 当前高亮的文件路径
 */
function renderFileTreeNodes(nodes, container, currentPath) {
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
      renderFileTreeNodes(node.children || [], childContainer, currentPath);
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
      const isSelected = currentPath && node.path === currentPath;
      li.innerHTML = `
        <div class="file-tree-item${isSelected ? ' selected' : ''}" data-path="${escapeHtml(node.path)}">
          <span class="icon">📄</span>
          <span class="name">${escapeHtml(node.name)}</span>
        </div>
      `;

      // 绑定点击预览事件
      const itemDiv = li.querySelector('.file-tree-item');
      itemDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.file-tree-item.selected').forEach(el => {
          el.classList.remove('selected');
        });
        itemDiv.classList.add('selected');
        currentFilePath = node.path;
        previewFile(node.path);
        // 更新 URL
        updateUrl(node.path);
      });
    }

    container.appendChild(li);
  });
}

/**
 * 高亮当前文件
 * @param {string} filePath - 文件路径
 */
function highlightCurrentFile(filePath) {
  document.querySelectorAll('.file-tree-item.selected').forEach(el => {
    el.classList.remove('selected');
  });

  const targetItem = document.querySelector(`.file-tree-item[data-path="${CSS.escape(filePath)}"]`);
  if (targetItem) {
    targetItem.classList.add('selected');
    targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

/**
 * 更新 URL（不刷新页面）
 * @param {string} filePath - 文件路径
 */
function updateUrl(filePath) {
  const url = new URL(window.location);
  url.searchParams.set('path', filePath);
  url.searchParams.set('version', currentVersion);
  window.history.replaceState({}, '', url);

  // 更新面包屑
  const breadcrumbFile = document.getElementById('breadcrumb-file');
  breadcrumbFile.textContent = filePath.split('/').pop();
}

/**
 * 判断是否为二进制文件
 * @param {string} filePath - 文件路径
 * @param {Uint8Array} contentBytes - 文件内容字节
 * @returns {boolean}
 */
function isBinaryFile(filePath, contentBytes) {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  const baseName = filePath.split('/').pop()?.toLowerCase();

  if (TEXT_EXTS.has(ext) || TEXT_FILENAMES.has(baseName)) {
    return false;
  }

  if (contentBytes && contentBytes.length > 0) {
    const header = Array.from(contentBytes.slice(0, 8));
    for (const magic of BINARY_MAGIC) {
      if (magic.every((b, i) => header[i] === b)) {
        return true;
      }
    }
    return contentBytes.slice(0, 8192).some(b => b === 0);
  }
  return false;
}

/**
 * 预览文件
 * @param {string} filePath - 文件路径
 */
async function previewFile(filePath) {
  if (!currentZip) {
    showToast('请先选择版本', 'warning');
    return;
  }

  const container = document.getElementById('file-content');
  const pathDisplay = document.getElementById('file-path');
  const fileSizeDisplay = document.getElementById('file-size');

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
      fileSizeDisplay.textContent = '-';
      return;
    }

    const bytes = await file.async('uint8array');
    const fileSize = bytes.length;
    fileSizeDisplay.textContent = formatFileSize(fileSize);

    // 大文件警告
    let warningHtml = '';
    if (fileSize > LARGE_FILE_SIZE) {
      warningHtml = `
        <div class="large-file-warning">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>文件较大 (${formatFileSize(fileSize)})，加载可能较慢</span>
        </div>
      `;
    }

    if (isBinaryFile(filePath, bytes)) {
      container.innerHTML = `
        ${warningHtml}
        <div class="binary-notice">
          <div class="binary-notice-icon">📦</div>
          <p>二进制文件，无法预览</p>
          <p class="text-muted mt-1">请下载 zip 包后在本地查看</p>
        </div>
      `;
      return;
    }

    const content = new TextDecoder().decode(bytes);
    const ext = filePath.split('.').pop()?.toLowerCase();

    if (ext === 'md') {
      // Markdown 渲染
      const html = marked.parse(content);
      container.innerHTML = `${warningHtml}<div class="markdown-body">${html}</div>`;
      const hl = typeof hljs !== 'undefined' ? hljs : null;
      container.querySelectorAll('pre code').forEach((block) => {
        if (hl && typeof hl.highlightElement === 'function') {
          hl.highlightElement(block);
        }
      });
    } else {
      // 代码高亮 + 行号
      const language = getLanguage(ext);
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

      // 生成带行号的代码
      const lines = highlighted.split('\n');
      const codeWithLines = lines.map((line, index) => `
        <div class="code-line">
          <span class="code-line-number">${index + 1}</span>
          <span class="code-line-content">${line || ' '}</span>
        </div>
      `).join('');

      container.innerHTML = `
        ${warningHtml}
        <pre><code class="hljs"><div class="code-with-lines">${codeWithLines}</div></code></pre>
      `;
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
 * 获取语言名（用于 highlight.js）
 * @param {string} ext - 文件扩展名
 * @returns {string}
 */
function getLanguage(ext) {
  const langMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'scss',
    'sql': 'sql',
    'go': 'go',
    'rs': 'rust',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    'vue': 'html',
    'xml': 'xml',
    'md': 'markdown',
    'toml': 'ini',
    'ini': 'ini',
    'cfg': 'ini',
  };
  return langMap[ext] || 'plaintext';
}

/**
 * 版本选择变更事件
 * @param {string} version - 选中的版本
 */
async function onVersionChange(version) {
  if (version && version !== currentVersion) {
    await loadZipAndTree(version);
    // 如果当前有选中的文件，重新预览
    if (currentFilePath) {
      await previewFile(currentFilePath);
      highlightCurrentFile(currentFilePath);
    }
    // 更新 URL
    const url = new URL(window.location);
    url.searchParams.set('version', version);
    window.history.replaceState({}, '', url);
  }
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

  // 默认对比最新两个版本，并带上当前文件路径
  const versionA = versions[1]?.version || '';
  const versionB = versions[0]?.version || '';
  let url = `/diff.html?id=${encodeURIComponent(currentSkill.id)}&version_a=${encodeURIComponent(versionA)}&version_b=${encodeURIComponent(versionB)}`;
  if (currentFilePath) {
    url += `&path=${encodeURIComponent(currentFilePath)}`;
  }
  window.location.href = url;
}

/**
 * 返回 Skill 详情页
 */
function goToSkillDetail() {
  if (currentSkill) {
    window.location.href = `/skill.html?id=${encodeURIComponent(currentSkill.id)}`;
  } else {
    window.location.href = '/';
  }
}
