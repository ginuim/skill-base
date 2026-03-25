/**
 * Skill Base - 发布页逻辑
 */

const DESC_MAX = 500;

let selectedZipBlob = null;  // 最终要上传的 zip blob
let selectedFileName = '';
let isNewSkill = true;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 检查登录状态 + 渲染导航栏
  const user = await checkAuth();
  if (!user) return;
  renderNavbar(user);

  // 2. 加载已有 Skill 列表
  await loadExistingSkills();

  // 3. 绑定事件
  setupDropZone();
  setupZipFileInput();
  setupSkillSelect();
  setupFormSubmit();
  setupClearFiles();
  setupDescriptionCounter();
});

/**
 * 描述字数统计（与 maxlength 一致）
 */
function setupDescriptionCounter() {
  const ta = document.getElementById('skill-description');
  const countEl = document.getElementById('skill-description-count');
  if (!ta || !countEl) return;
  const sync = () => {
    countEl.textContent = String(ta.value.length);
  };
  sync();
}

/**
 * 从文件夹名 / zip 文件名得到合法 Skill ID，无法得到则返回 ''
 */
function slugToSkillId(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let s = raw.trim().replace(/\.zip$/i, '');
  s = s
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '');
  s = s.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (!s || !/^[a-z0-9\-_]+$/.test(s)) return '';
  return s;
}

function pickSkillMdPath(paths) {
  const matches = paths.filter((p) => /(^|\/)SKILL\.md$/i.test(p));
  if (!matches.length) return null;
  return matches.slice().sort((a, b) => a.length - b.length)[0];
}

/**
 * 解析 SKILL.md 简单 YAML frontmatter（name / description）
 */
function parseYamlFrontmatterBlock(yaml) {
  const out = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) {
      i += 1;
      continue;
    }
    const key = m[1];
    let rest = m[2].trimEnd();
    const blockStarter =
      rest === '>' ||
      rest === '|' ||
      rest === '>-' ||
      rest === '>+' ||
      rest === '|-' ||
      rest === '|+';
    if (blockStarter) {
      i += 1;
      const buf = [];
      while (i < lines.length) {
        const L = lines[i];
        const nextKey = L.match(/^([\w-]+):\s/);
        if (nextKey && !L.startsWith('  ') && buf.length) break;
        if (L.startsWith('  ') || (L === '' && buf.length)) {
          buf.push(L.startsWith('  ') ? L.slice(2) : '');
        } else if (buf.length) break;
        else if (L === '') {
          i += 1;
          continue;
        } else break;
        i += 1;
      }
      out[key] = buf.join('\n').trim();
      continue;
    }
    out[key] = rest.replace(/^["'](.+)["']$/, '$1').trim();
    i += 1;
  }
  return out;
}

/**
 * 从 SKILL.md 全文解析 name、description（frontmatter 优先，正文兜底）
 */
function parseSkillMd(full) {
  let rest = full;
  let name = '';
  let description = '';
  const fmMatch = full.match(/^---\r?\n([\s\S]*?)\r?\n---\s*\r?\n?/);
  if (fmMatch) {
    const y = parseYamlFrontmatterBlock(fmMatch[1]);
    name = (y.name || '').trim();
    description = (y.description || '').trim();
    rest = full.slice(fmMatch[0].length);
  }
  if (!name) {
    const h1 = rest.match(/^#\s+(.+)$/m);
    if (h1) name = h1[1].trim();
  }
  if (!description) {
    const afterH1 = rest.replace(/^#\s+.+$/m, '').trim();
    const para = afterH1.split(/\n\n+/).find((p) => {
      const t = p.trim();
      return t && !t.startsWith('#') && !t.startsWith('```');
    });
    if (para) description = para.replace(/\s*\n\s*/g, ' ').trim();
  }
  if (description.length > DESC_MAX) description = description.slice(0, DESC_MAX);
  return { name, description };
}

/**
 * 根据 SKILL.md 与包名填表（Skill ID / 名称 / 描述只读，仅来自上传包）
 */
function applyAutofillFromSkill(slugFromPackage, parsed) {
  const idInput = document.getElementById('skill-id');
  if (slugFromPackage) idInput.value = slugFromPackage;
  document.getElementById('skill-name').value = (parsed.name || '').trim();
  const descEl = document.getElementById('skill-description');
  descEl.value = (parsed.description || '').slice(0, DESC_MAX);
  const countEl = document.getElementById('skill-description-count');
  if (countEl) countEl.textContent = String(descEl.value.length);
}

async function readSkillMdFromZipInstance(zip, fileList) {
  const skillPath = pickSkillMdPath(fileList);
  if (!skillPath) return null;
  const f = zip.file(skillPath);
  if (!f) return null;
  return f.async('string');
}

/**
 * 加载已有 Skill 列表
 */
async function loadExistingSkills() {
  try {
    const data = await apiGet('/skills');
    const select = document.getElementById('skill-select');
    
    if (data.skills && data.skills.length > 0) {
      data.skills.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill.skill_id;
        option.textContent = `${skill.name} (${skill.skill_id})`;
        option.dataset.name = skill.name;
        option.dataset.description = skill.description || '';
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('加载 Skill 列表失败:', error);
    // 不显示错误，允许用户继续创建新 Skill
  }
}

/**
 * 设置 Skill 选择下拉框事件
 */
function setupSkillSelect() {
  const select = document.getElementById('skill-select');

  select.addEventListener('change', () => {
    toggleMode(select.value === '');
  });
}

/**
 * 切换新建/更新模式（元信息始终只读，来自上传包）
 */
function toggleMode(isNew) {
  isNewSkill = isNew;
}

// ========================================
// 拖拽目录处理
// ========================================

/**
 * 设置拖拽上传区域
 */
function setupDropZone() {
  const dropZone = document.getElementById('drop-zone');

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    await handleDrop(e);
  });

  // 点击选择目录
  dropZone.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = (e) => handleDirectorySelect(e.target.files);
    input.click();
  });
}

/**
 * 拖拽的 zip 文件（FileSystemFileEntry）
 */
async function handleDroppedZipFile(fileEntry) {
  const file = await new Promise((resolve, reject) => {
    fileEntry.file(resolve, reject);
  });
  const slug = slugToSkillId(file.name);
    showToast('正在读取 zip...', 'info');
  try {
    const zip = await JSZip.loadAsync(file);
    const paths = [];
    zip.forEach((relPath, zf) => {
      if (!zf.dir) paths.push(relPath);
    });
    if (!pickSkillMdPath(paths)) {
      showToast('zip 中未找到 SKILL.md', 'error');
      return;
    }
    const text = await readSkillMdFromZipInstance(zip, paths);
    const parsed = parseSkillMd(text);
    selectedZipBlob = file;
    selectedFileName = file.name;
    renderFilePreview(paths, file.size);
    applyAutofillFromSkill(slug, parsed);
    showToast(`已选择 zip，共 ${paths.length} 个文件`, 'success');
  } catch (error) {
    console.error('Failed to read zip:', error);
    showToast('读取 zip 失败: ' + error.message, 'error');
  }
}

/**
 * 处理拖拽的目录或 zip
 */
async function handleDrop(event) {
  const items = event.dataTransfer.items;

  if (!items || items.length === 0) {
    showToast('未检测到拖拽的文件', 'error');
    return;
  }

  const first = items[0];
  if (first.kind !== 'file') {
    showToast('请拖拽文件夹或 zip 文件', 'error');
    return;
  }

  const topEntry = first.webkitGetAsEntry();
  if (!topEntry) {
    showToast('无法读取拖拽项', 'error');
    return;
  }

  if (topEntry.isFile && topEntry.name.toLowerCase().endsWith('.zip')) {
    await handleDroppedZipFile(topEntry);
    return;
  }

  let rootSlug = '';
  if (topEntry.isDirectory) {
    rootSlug = slugToSkillId(topEntry.name);
  }

  const zip = new JSZip();
  const fileList = [];
  let totalSize = 0;

    showToast('正在读取文件...', 'info');

  try {
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          await traverseEntry(entry, zip, '', fileList, (size) => {
            totalSize += size;
          });
        }
      }
    }

    if (!pickSkillMdPath(fileList)) {
      showToast('上传的目录中未找到 SKILL.md 文件', 'error');
      return;
    }

    const skillText = await readSkillMdFromZipInstance(zip, fileList);
    const parsed = skillText != null ? parseSkillMd(skillText) : { name: '', description: '' };

    showToast('正在打包文件...', 'info');
    selectedZipBlob = await zip.generateAsync({ type: 'blob' });
    selectedFileName = 'skill-package.zip';

    renderFilePreview(fileList, totalSize);
    applyAutofillFromSkill(rootSlug, parsed);
    showToast(`已选择 ${fileList.length} 个文件`, 'success');
  } catch (error) {
    console.error('Failed to process dropped files:', error);
    showToast('处理文件失败: ' + error.message, 'error');
  }
}

/**
 * 递归遍历目录 entry
 */
async function traverseEntry(entry, zip, path, fileList, onFileSize) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => {
      entry.file(resolve, reject);
    });
    const fullPath = path + entry.name;
    zip.file(fullPath, file);
    fileList.push(fullPath);
    if (onFileSize) onFileSize(file.size);
  } else if (entry.isDirectory) {
    const dirPath = path + entry.name + '/';
    const reader = entry.createReader();
    
    const entries = await new Promise((resolve, reject) => {
      const results = [];
      const readEntries = () => {
        reader.readEntries(items => {
          if (items.length === 0) {
            resolve(results);
          } else {
            results.push(...items);
            readEntries();
          }
        }, reject);
      };
      readEntries();
    });

    for (const child of entries) {
      await traverseEntry(child, zip, dirPath, fileList, onFileSize);
    }
  }
}

/**
 * 处理选择目录（input webkitdirectory）
 */
async function handleDirectorySelect(files) {
  if (!files || files.length === 0) {
    return;
  }

  const zip = new JSZip();
  const fileList = [];
  let totalSize = 0;

    showToast('正在读取文件...', 'info');

  try {
    for (const file of files) {
      const path = file.webkitRelativePath;
      zip.file(path, file);
      fileList.push(path);
      totalSize += file.size;
    }

    if (!pickSkillMdPath(fileList)) {
      showToast('上传的目录中未找到 SKILL.md 文件', 'error');
      return;
    }

    const skillText = await readSkillMdFromZipInstance(zip, fileList);
    const parsed = skillText != null ? parseSkillMd(skillText) : { name: '', description: '' };
    const rootSlug = slugToSkillId(files[0].webkitRelativePath.split('/')[0] || '');

    showToast('正在打包文件...', 'info');
    selectedZipBlob = await zip.generateAsync({ type: 'blob' });
    selectedFileName = 'skill-package.zip';

    renderFilePreview(fileList, totalSize);
    applyAutofillFromSkill(rootSlug, parsed);
    showToast(`已选择 ${fileList.length} 个文件`, 'success');
  } catch (error) {
    console.error('Failed to process directory selection:', error);
    showToast('处理文件失败: ' + error.message, 'error');
  }
}

// ========================================
// zip 文件选择
// ========================================

/**
 * 设置 zip 文件选择
 */
function setupZipFileInput() {
  const input = document.getElementById('zip-file-input');

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      showToast('请选择 .zip 文件', 'error');
      return;
    }
    const slug = slugToSkillId(file.name);
    showToast('正在读取 zip...', 'info');
    try {
      const zip = await JSZip.loadAsync(file);
      const paths = [];
      zip.forEach((relPath, zf) => {
        if (!zf.dir) paths.push(relPath);
      });
      if (!pickSkillMdPath(paths)) {
        showToast('zip 中未找到 SKILL.md', 'error');
        input.value = '';
        return;
      }
      const text = await readSkillMdFromZipInstance(zip, paths);
      const parsed = parseSkillMd(text);
      selectedZipBlob = file;
      selectedFileName = file.name;
      renderFilePreview(paths, file.size);
      applyAutofillFromSkill(slug, parsed);
      showToast('已选择 zip 文件', 'success');
    } catch (err) {
      console.error('Failed to read zip:', err);
      showToast('读取 zip 失败: ' + err.message, 'error');
      input.value = '';
    }
  });
}

/**
 * 渲染文件预览列表
 */
function renderFilePreview(fileList, totalSize) {
  const preview = document.getElementById('file-preview');
  const listContainer = document.getElementById('file-preview-list');
  const summary = document.getElementById('file-preview-summary');
  
  // 清空列表
  listContainer.innerHTML = '';
  
  // 显示文件列表（最多 20 个）
  const maxDisplay = 20;
  const displayList = fileList.slice(0, maxDisplay);
  
  displayList.forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.textContent = file;
    listContainer.appendChild(item);
  });
  
  // 如果超过 20 个，显示省略提示
  if (fileList.length > maxDisplay) {
    const more = document.createElement('div');
    more.className = 'file-preview-more';
    more.textContent = `...and ${fileList.length - maxDisplay} more files`;
    listContainer.appendChild(more);
  }
  
  // 显示总结
  summary.textContent = `${fileList.length} files, total size: ${formatFileSize(totalSize || selectedZipBlob?.size || 0)}`;
  
  // 显示预览区域
  preview.classList.add('visible');
}

/**
 * 设置清除文件按钮
 */
function setupClearFiles() {
  const clearBtn = document.getElementById('clear-files');
  
  clearBtn.addEventListener('click', () => {
    clearSelectedFiles();
  });
}

/**
 * 清除已选文件
 */
function clearSelectedFiles() {
  selectedZipBlob = null;
  selectedFileName = '';

  document.getElementById('skill-id').value = '';
  document.getElementById('skill-name').value = '';
  const descEl = document.getElementById('skill-description');
  descEl.value = '';
  const countEl = document.getElementById('skill-description-count');
  if (countEl) countEl.textContent = '0';

  const preview = document.getElementById('file-preview');
  preview.classList.remove('visible');

  const zipInput = document.getElementById('zip-file-input');
  zipInput.value = '';

  showToast('已清除选择', 'info');
}

// ========================================
// 发布
// ========================================

/**
 * 设置表单提交
 */
function setupFormSubmit() {
  const form = document.getElementById('publishForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await publish();
  });
}

/**
 * 发布
 */
async function publish() {
  // 验证文件
  if (!selectedZipBlob) {
    showToast('请先选择要上传的文件或目录', 'error');
    return;
  }

  const skillId = document.getElementById('skill-id').value.trim();
  if (!skillId) {
    showToast('无法从上传包得到 Skill ID，请使用合法文件夹名或 zip 文件名（小写字母、数字、连字符、下划线）', 'error');
    return;
  }

  // 验证 Skill ID 格式
  if (!/^[a-z0-9\-_]+$/.test(skillId)) {
    showToast('Skill ID 只能包含小写字母、数字、下划线和连字符', 'error');
    return;
  }

  const skillSelect = document.getElementById('skill-select');
  const selectedExistingId = skillSelect.value.trim();
  if (selectedExistingId && selectedExistingId !== skillId) {
    showToast('上传包的 Skill ID 与下拉框所选已有 Skill 不一致，请重新选择或更换压缩包', 'error');
    return;
  }

  if (isNewSkill) {
    const name = document.getElementById('skill-name').value.trim();
    if (!name) {
      showToast('SKILL.md 中缺少可用的 Skill 名称（name 或首行标题）', 'error');
      return;
    }
    const desc = (document.getElementById('skill-description')?.value || '').trim();
    if (!desc) {
      showToast('SKILL.md 中缺少描述（description 或首段正文）', 'error');
      return;
    }
    if (desc.length > DESC_MAX) {
      showToast(`描述不能超过 ${DESC_MAX} 字`, 'error');
      return;
    }
  }

  // 构建 FormData
  const formData = new FormData();
  formData.append('zip_file', selectedZipBlob, selectedFileName);
  formData.append('skill_id', skillId);
  
  if (isNewSkill) {
    formData.append('name', document.getElementById('skill-name').value.trim());
    formData.append('description', document.getElementById('skill-description').value.trim());
  }
  
  const changelog = document.getElementById('changelog').value.trim();
  if (changelog) {
    formData.append('changelog', changelog);
  }

  // 禁用提交按钮
  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = '发布中...';

  // 显示进度条
  showProgress();

  try {
    const result = await apiUpload('/skills/publish', formData);
    
    // 显示成功信息
    showSuccess(result);
  } catch (err) {
    showToast('发布失败：' + err.message, 'error');
    hideProgress();
    submitBtn.disabled = false;
    submitBtn.textContent = '发布新版本';
  }
}

/**
 * 显示进度
 */
function showProgress() {
  const container = document.getElementById('progress-container');
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  
  container.classList.add('visible');
  
  // 模拟进度动画
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 90) {
      progress = 90;
      clearInterval(interval);
    }
    bar.style.width = progress + '%';
    text.textContent = `Uploading... ${Math.round(progress)}%`;
  }, 200);
  
  // 保存 interval 以便后续清除
  container.dataset.interval = interval;
}

/**
 * 隐藏进度
 */
function hideProgress() {
  const container = document.getElementById('progress-container');
  const bar = document.getElementById('progress-bar');
  
  // 清除动画
  if (container.dataset.interval) {
    clearInterval(parseInt(container.dataset.interval));
  }
  
  bar.style.width = '0%';
  container.classList.remove('visible');
}

/**
 * 显示发布成功
 */
function showSuccess(result) {
  // 完成进度条
  const bar = document.getElementById('progress-bar');
  const text = document.getElementById('progress-text');
  const container = document.getElementById('progress-container');
  
  // 清除动画
  if (container.dataset.interval) {
    clearInterval(parseInt(container.dataset.interval));
  }
  
  bar.style.width = '100%';
  text.textContent = 'Upload complete!';
  
  // 隐藏表单
  const form = document.getElementById('publishForm');
  form.style.display = 'none';
  
  // 显示成功信息
  const successContainer = document.getElementById('success-container');
  const successMessage = document.getElementById('success-message');
  const viewLink = document.getElementById('view-skill-link');
  
  const version = result.version || result.version_number || 'v1.0.0';
  const skillId = result.skill_id || document.getElementById('skill-id').value.trim();
  
  successMessage.textContent = `Version ${version} published successfully`;
  viewLink.href = `/skill.html?id=${encodeURIComponent(skillId)}`;
  
  successContainer.classList.add('visible');
}
