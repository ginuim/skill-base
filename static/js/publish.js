/**
 * Skill Base - 发布页逻辑
 */

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
});

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
  const skillIdInput = document.getElementById('skill-id');
  
  select.addEventListener('change', () => {
    const selectedValue = select.value;
    
    if (selectedValue === '') {
      // 创建新 Skill
      toggleMode(true);
      skillIdInput.value = '';
      skillIdInput.readOnly = false;
    } else {
      // 更新已有 Skill
      toggleMode(false);
      skillIdInput.value = selectedValue;
      skillIdInput.readOnly = true;
    }
  });
}

/**
 * 切换新建/更新模式
 */
function toggleMode(isNew) {
  isNewSkill = isNew;
  const newSkillFields = document.getElementById('new-skill-fields');
  
  if (isNew) {
    newSkillFields.classList.remove('hidden');
  } else {
    newSkillFields.classList.add('hidden');
  }
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
 * 处理拖拽的目录
 */
async function handleDrop(event) {
  const items = event.dataTransfer.items;
  
  if (!items || items.length === 0) {
    showToast('未检测到拖拽的文件', 'error');
    return;
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

    // 验证包含 SKILL.md
    if (!fileList.some(f => f.endsWith('/SKILL.md') || f === 'SKILL.md')) {
      showToast('上传的目录中未找到 SKILL.md 文件', 'error');
      return;
    }

    // 生成 zip blob
    showToast('正在打包文件...', 'info');
    selectedZipBlob = await zip.generateAsync({ type: 'blob' });
    selectedFileName = 'skill-package.zip';

    // 显示文件预览
    renderFilePreview(fileList, totalSize);
    showToast(`已选择 ${fileList.length} 个文件`, 'success');
  } catch (error) {
    console.error('处理拖拽文件失败:', error);
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

    // 验证 SKILL.md
    if (!fileList.some(f => f.includes('SKILL.md'))) {
      showToast('上传的目录中未找到 SKILL.md 文件', 'error');
      return;
    }

    showToast('正在打包文件...', 'info');
    selectedZipBlob = await zip.generateAsync({ type: 'blob' });
    selectedFileName = 'skill-package.zip';
    
    renderFilePreview(fileList, totalSize);
    showToast(`已选择 ${fileList.length} 个文件`, 'success');
  } catch (error) {
    console.error('处理目录选择失败:', error);
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
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.endsWith('.zip')) {
        showToast('请选择 .zip 文件', 'error');
        return;
      }
      
      selectedZipBlob = file;
      selectedFileName = file.name;
      renderFilePreview([file.name], file.size);
      showToast('已选择 zip 文件', 'success');
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
    more.textContent = `...及其他 ${fileList.length - maxDisplay} 个文件`;
    listContainer.appendChild(more);
  }
  
  // 显示总结
  summary.textContent = `共 ${fileList.length} 个文件，总大小: ${formatFileSize(totalSize || selectedZipBlob?.size || 0)}`;
  
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
  
  const preview = document.getElementById('file-preview');
  preview.classList.remove('visible');
  
  // 清空 zip 文件输入
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
    showToast('请输入 Skill ID', 'error');
    return;
  }

  // 验证 Skill ID 格式
  if (!/^[a-z0-9\-_]+$/.test(skillId)) {
    showToast('Skill ID 只能包含小写字母、数字、下划线和连字符', 'error');
    return;
  }

  if (isNewSkill) {
    const name = document.getElementById('skill-name').value.trim();
    if (!name) {
      showToast('新建 Skill 需要填写名称', 'error');
      return;
    }
  }

  // 构建 FormData
  const formData = new FormData();
  formData.append('zip_file', selectedZipBlob, selectedFileName);
  formData.append('skill_id', skillId);
  
  if (isNewSkill) {
    formData.append('name', document.getElementById('skill-name').value.trim());
    const desc = document.getElementById('skill-description')?.value.trim();
    if (desc) {
      formData.append('description', desc);
    }
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
    text.textContent = `正在上传... ${Math.round(progress)}%`;
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
  text.textContent = '上传完成！';
  
  // 隐藏表单
  const form = document.getElementById('publishForm');
  form.style.display = 'none';
  
  // 显示成功信息
  const successContainer = document.getElementById('success-container');
  const successMessage = document.getElementById('success-message');
  const viewLink = document.getElementById('view-skill-link');
  
  const version = result.version || result.version_number || 'v1.0.0';
  const skillId = result.skill_id || document.getElementById('skill-id').value.trim();
  
  successMessage.textContent = `版本 ${version} 已成功发布`;
  viewLink.href = `/skill.html?id=${encodeURIComponent(skillId)}`;
  
  successContainer.classList.add('visible');
}
