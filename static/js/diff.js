/**
 * Skill Base - Diff 对比页逻辑
 */

// 全局状态
let skillId = null;
let currentSkill = null;
let versions = [];
let currentVersionA = null;
let currentVersionB = null;
let currentFilePath = null;
let zipA = null;
let zipB = null;
let outputFormat = 'side-by-side'; // 默认左右分栏
let changedFiles = [];

// 二进制文件扩展名
const BINARY_EXTS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.ttf', '.otf', '.woff', '.woff2',
]);

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  skillId = params.get('id');
  currentFilePath = params.get('path') || null;
  currentVersionA = params.get('version_a') || null;
  currentVersionB = params.get('version_b') || null;

  if (!skillId) {
    showToast(t('diff.missingId'), 'error');
    setTimeout(() => window.location.href = '/', 1500);
    return;
  }

  // 1. 检查登录状态
  const user = await checkAuth();
  if (!user) return;

  // 2. 渲染导航栏
  renderNavbar(user);

  // 3. 加载 Skill 信息
  await loadSkillInfo();

  // 4. 加载版本列表填充下拉框
  await loadVersions();

  // 5. 如果有 version_a 和 version_b 参数，自动执行 diff
  if (currentVersionA && currentVersionB) {
    // 设置下拉框选中状态
    document.getElementById('version-a').value = currentVersionA;
    document.getElementById('version-b').value = currentVersionB;
    await performDiff();
  }

  // 6. 更新文件路径显示
  updateFilePathDisplay();
});

/**
 * 加载 Skill 信息
 */
async function loadSkillInfo() {
  try {
    const skill = await apiGet(`/skills/${skillId}`);
    currentSkill = skill;

    // 更新页面标题
    document.title = `${t('diff.pageTitle')}${skill.name} - Skill Base`;

    // 更新面包屑
    const breadcrumbSkill = document.getElementById('breadcrumb-skill');
    breadcrumbSkill.textContent = skill.name;
    breadcrumbSkill.href = `/skill.html?id=${encodeURIComponent(skillId)}`;

  } catch (error) {
    console.error('Failed to load Skill info:', error);
    showToast(t('diff.loadInfoFailed'), 'error');
  }
}

/**
 * 加载版本列表
 */
async function loadVersions() {
  try {
    const data = await apiGet(`/skills/${skillId}/versions`);
    versions = data.versions || [];

    // 填充两个版本下拉框
    const selectA = document.getElementById('version-a');
    const selectB = document.getElementById('version-b');

    const optionsHtml = versions.map((v, index) => {
      const label = index === 0 ? `${v.version} (${t('skill.latestTag').replace(/[()]/g,'')})` : v.version;
    return `<option value="${escapeHtml(v.version)}">${escapeHtml(label)}</option>`;
  }).join('');

    selectA.innerHTML = `<option value="">${t('diff.selectVersion')}</option>` + optionsHtml;
    selectB.innerHTML = `<option value="">${t('diff.selectVersion')}</option>` + optionsHtml;

    // 恢复选中状态
    if (currentVersionA) selectA.value = currentVersionA;
    if (currentVersionB) selectB.value = currentVersionB;

  } catch (error) {
    console.error('Failed to load version list:', error);
    showToast(t('diff.loadVersionsFailed'), 'error');
  }
}

/**
 * 版本选择变更事件
 */
function onVersionChange() {
  const selectA = document.getElementById('version-a');
  const selectB = document.getElementById('version-b');
  currentVersionA = selectA.value;
  currentVersionB = selectB.value;

  // 更新 URL
  updateUrl();
}

/**
 * 更新 URL（不刷新页面）
 */
function updateUrl() {
  const url = new URL(window.location);
  if (currentVersionA) {
    url.searchParams.set('version_a', currentVersionA);
  }
  if (currentVersionB) {
    url.searchParams.set('version_b', currentVersionB);
  }
  if (currentFilePath) {
    url.searchParams.set('path', currentFilePath);
  } else {
    url.searchParams.delete('path');
  }
  window.history.replaceState({}, '', url);
}

/**
 * 更新文件路径显示
 */
function updateFilePathDisplay() {
  const pathDisplay = document.getElementById('current-file-path');
  if (currentFilePath) {
    pathDisplay.textContent = currentFilePath;
  } else {
    pathDisplay.textContent = t('diff.allFiles');
  }
}

/**
 * 执行 Diff
 */
async function performDiff() {
  if (!currentVersionA || !currentVersionB) {
    showToast(t('diff.selectBoth'), 'warning');
    return;
  }

  if (currentVersionA === currentVersionB) {
    showToast(t('diff.selectBoth'), 'warning');
    return;
  }

  const outputContainer = document.getElementById('diff-output-container');
  const outputDiv = document.getElementById('diff-output');

  // 显示 loading
  outputDiv.innerHTML = `
    <div class="loading-content">
      <div class="spinner"></div>
      <p style="margin-top: var(--spacing-md); color: var(--text-secondary);">${t('diff.computing')}</p>
    </div>
  `;

  try {
    // 1. 并发下载两个版本的 zip
    const [bufA, bufB] = await Promise.all([
      fetch(`${API_BASE}/skills/${skillId}/versions/${currentVersionA}/download`, { credentials: 'same-origin' }).then(r => {
        if (!r.ok) throw new Error(`Failed to download version ${currentVersionA}`);
        return r.arrayBuffer();
      }),
      fetch(`${API_BASE}/skills/${skillId}/versions/${currentVersionB}/download`, { credentials: 'same-origin' }).then(r => {
        if (!r.ok) throw new Error(`Failed to download version ${currentVersionB}`);
        return r.arrayBuffer();
      })
    ]);

    // 2. JSZip 解压
    [zipA, zipB] = await Promise.all([
      JSZip.loadAsync(bufA),
      JSZip.loadAsync(bufB)
    ]);

    if (currentFilePath) {
      // 单文件 diff
      document.getElementById('changed-files').style.display = 'none';
      await diffSingleFile(currentFilePath);
    } else {
      // 整体对比：列出所有变更的文件
      await diffAllFiles();
    }

  } catch (error) {
    console.error('Diff failed:', error);
    showToast(t('diff.computeFailed') + ': ' + error.message, 'error');
    outputDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <p>${t('diff.computeFailed')}: ${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

/**
 * 单文件 Diff
 * @param {string} filePath - 文件路径
 */
async function diffSingleFile(filePath) {
  const outputDiv = document.getElementById('diff-output');
  const statsDiv = document.getElementById('diff-stats');

  // 检查是否为二进制文件
  if (isBinaryExt(filePath)) {
    outputDiv.innerHTML = `
      <div class="binary-diff-notice">
        <div class="empty-state-icon">📦</div>
        <p>${t('diff.binaryDiff')}</p>
        <p class="text-muted mt-1">${escapeHtml(filePath)}</p>
      </div>
    `;
    statsDiv.style.display = 'none';
    return;
  }

  try {
    const fileA = zipA.file(filePath);
    const fileB = zipB.file(filePath);

    const contentA = fileA ? await fileA.async('string') : '';
    const contentB = fileB ? await fileB.async('string') : '';

    // 如果内容完全相同
    if (contentA === contentB) {
      outputDiv.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">✅</div>
          <p>Files are identical, no differences</p>
        </div>
      `;
      statsDiv.style.display = 'none';
      return;
    }

    // 使用 Diff.createPatch 生成 unified diff
    const patch = Diff.createPatch(
      filePath,
      contentA,
      contentB,
      `Version ${currentVersionA}`,
      `Version ${currentVersionB}`
    );

    // 使用 diff2html 渲染
    renderDiff(patch);

    // 更新统计信息
    updateDiffStats(patch, 1);
    statsDiv.style.display = 'flex';

  } catch (error) {
    console.error('单文件 Diff 失败:', error);
    outputDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <p>对比失败: ${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}

/**
 * 全文件 Diff（列出所有变更文件）
 */
async function diffAllFiles() {
  const outputDiv = document.getElementById('diff-output');
  const statsDiv = document.getElementById('diff-stats');
  const changedFilesDiv = document.getElementById('changed-files');
  const changedFilesListDiv = document.getElementById('changed-files-list');

  // 收集所有文件
  const filesA = new Set();
  const filesB = new Set();

  zipA.forEach((path, entry) => {
    if (!entry.dir) filesA.add(path);
  });

  zipB.forEach((path, entry) => {
    if (!entry.dir) filesB.add(path);
  });

  const allFiles = new Set([...filesA, ...filesB]);
  changedFiles = [];

  // 检查每个文件的变更状态
  for (const file of allFiles) {
    const inA = filesA.has(file);
    const inB = filesB.has(file);

    let status;
    if (!inA && inB) {
      status = 'added';
    } else if (inA && !inB) {
      status = 'deleted';
    } else {
      // 比较内容
      const contentA = await zipA.file(file)?.async('string') ?? '';
      const contentB = await zipB.file(file)?.async('string') ?? '';
      if (contentA !== contentB) {
        status = 'modified';
      } else {
        continue; // 内容相同，跳过
      }
    }

    changedFiles.push({ file, status });
  }

  // 排序：按状态和文件名
  changedFiles.sort((a, b) => {
    const statusOrder = { added: 0, deleted: 1, modified: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.file.localeCompare(b.file);
  });

  // 如果没有变更
  if (changedFiles.length === 0) {
    outputDiv.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">✅</div>
        <p>The two versions are identical, no differences</p>
      </div>
    `;
    statsDiv.style.display = 'none';
    changedFilesDiv.style.display = 'none';
    return;
  }

  // 渲染变更文件列表
  renderChangedFileList(changedFiles);
  changedFilesDiv.style.display = 'block';

  // 生成所有文件的合并 diff
  let combinedPatch = '';
  for (const change of changedFiles) {
    if (isBinaryExt(change.file)) {
      combinedPatch += `diff --git a/${change.file} b/${change.file}\n`;
      combinedPatch += `Binary files differ\n`;
      continue;
    }

    const contentA = await zipA.file(change.file)?.async('string') ?? '';
    const contentB = await zipB.file(change.file)?.async('string') ?? '';

    const patch = Diff.createPatch(
      change.file,
      contentA,
      contentB,
      `Version ${currentVersionA}`,
      `Version ${currentVersionB}`
    );
    combinedPatch += patch;
  }

  // 渲染 diff
  renderDiff(combinedPatch);

  // 更新统计信息
  updateDiffStats(combinedPatch, changedFiles.length);
  statsDiv.style.display = 'flex';
}

/**
 * 渲染变更文件列表
 * @param {array} changes - 变更文件数组
 */
function renderChangedFileList(changes) {
  const listDiv = document.getElementById('changed-files-list');

  const statusLabels = {
    added: t('diff.added'),
    deleted: t('diff.deleted'),
    modified: t('diff.modified')
  };

  listDiv.innerHTML = changes.map((change, index) => `
    <div class="changed-file-item" data-file="${escapeHtml(change.file)}" onclick="selectChangedFile('${escapeHtml(change.file)}', ${index})">
      <span class="changed-file-status ${change.status}">${statusLabels[change.status]}</span>
      <span class="changed-file-path">${escapeHtml(change.file)}</span>
    </div>
  `).join('');
}

/**
 * 选择变更文件进行单独 diff
 * @param {string} filePath - 文件路径
 * @param {number} index - 索引
 */
async function selectChangedFile(filePath, index) {
  // 更新选中状态
  document.querySelectorAll('.changed-file-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });

  currentFilePath = filePath;
  updateFilePathDisplay();
  updateUrl();

  await diffSingleFile(filePath);
}

/**
 * 渲染 Diff（使用 diff2html）
 * @param {string} patch - unified diff 字符串
 */
function renderDiff(patch) {
  const outputDiv = document.getElementById('diff-output');

  // 使用 Diff2HtmlUI API
  const targetElement = document.getElementById('diff-output');
  const configuration = {
    drawFileList: false,
    matching: 'lines',
    outputFormat: outputFormat, // 'side-by-side' 或 'line-by-line'
    renderNothingWhenEmpty: false
  };
  
  const diff2htmlUi = new Diff2HtmlUI(targetElement, patch, configuration);
  diff2htmlUi.draw();
}

/**
 * 更新 Diff 统计
 * @param {string} patch - unified diff 字符串
 * @param {number} fileCount - 文件数量
 */
function updateDiffStats(patch, fileCount) {
  let added = 0;
  let removed = 0;

  patch.split('\n').forEach(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      added++;
    }
    if (line.startsWith('-') && !line.startsWith('---')) {
      removed++;
    }
  });

  document.getElementById('stats-added').textContent = `+${added} lines`;
  document.getElementById('stats-removed').textContent = `-${removed} lines`;
  document.getElementById('stats-files').textContent = `${fileCount} ${t('diff.filesChanged')}`;
}

/**
 * 切换视图格式
 * @param {string} format - 'side-by-side' 或 'line-by-line'
 */
function toggleOutputFormat(format) {
  outputFormat = format;

  // 更新按钮状态
  document.getElementById('btn-side-by-side').classList.toggle('active', format === 'side-by-side');
  document.getElementById('btn-line-by-line').classList.toggle('active', format === 'line-by-line');

  // 如果已经有 diff 结果，重新渲染
  if (zipA && zipB) {
    if (currentFilePath) {
      diffSingleFile(currentFilePath);
    } else if (changedFiles.length > 0) {
      // 重新生成合并 diff
      performDiff();
    }
  }
}

/**
 * 判断是否为二进制文件扩展名
 * @param {string} filePath - 文件路径
 * @returns {boolean}
 */
function isBinaryExt(filePath) {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return BINARY_EXTS.has(ext);
}

/**
 * 返回 Skill 详情页
 */
function goToSkillDetail() {
  if (skillId) {
    window.location.href = `/skill.html?id=${encodeURIComponent(skillId)}`;
  } else {
    window.location.href = '/';
  }
}

/**
 * 清除文件选择，显示全部变更
 */
function clearFileSelection() {
  currentFilePath = null;
  updateFilePathDisplay();
  updateUrl();

  // 清除选中状态
  document.querySelectorAll('.changed-file-item').forEach(el => {
    el.classList.remove('active');
  });

  // 重新执行全文件 diff
  if (zipA && zipB) {
    diffAllFiles();
  }
}
