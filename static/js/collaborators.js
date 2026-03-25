/**
 * 协作者管理模块
 * 依赖：app.js (apiGet, apiPost, apiDelete, showToast, escapeHtml, getCurrentUser, currentUser)
 * 依赖：skill.js (currentSkill 全局变量)
 */

// 联想搜索相关状态
let selectedUserId = null;  // 选中的用户 ID
let searchDebounceTimer = null;  // 防抖计时器

// 初始化协作者面板
async function initCollaboratorsPanel() {
  // currentSkill 由 skill.js 设置（全局变量）
  if (!currentSkill) return;
  
  const user = await getCurrentUser();
  const panel = document.getElementById('collaborators-panel');
  if (!panel) return;
  
  // 显示面板
  panel.style.display = 'block';
  
  // 加载协作者列表
  await loadCollaborators();
  
  // 检查当前用户是否有管理权限（owner 或 admin）
  if (user) {
    const isOwner = currentSkill.owner_id === user.id;
    const isAdmin = user.role === 'admin';
    
    if (isOwner || isAdmin) {
      // 显示添加按钮
      const addBtn = document.getElementById('add-collaborator-btn');
      if (addBtn) {
        addBtn.style.display = 'inline-block';
        addBtn.onclick = showAddCollaboratorModal;
      }
      
      // 显示危险操作区
      const dangerZone = document.getElementById('skill-danger-zone');
      if (dangerZone) {
        dangerZone.style.display = 'block';
      }
      const deleteBtn = document.getElementById('delete-skill-btn');
      if (deleteBtn) {
        deleteBtn.onclick = showDeleteSkillModal;
      }
    }
  }
}

// 加载协作者列表
async function loadCollaborators() {
  try {
    const data = await apiGet(`/skills/${currentSkill.id}/collaborators`);
    renderCollaborators(data.collaborators);
  } catch (error) {
    console.error('Failed to load collaborators:', error);
  }
}

// 渲染协作者列表
function renderCollaborators(collaborators) {
  const container = document.getElementById('collaborators-list');
  if (!container) return;
  
  // 获取当前用户用于判断是否显示移除按钮
  const user = currentUser; // 来自 app.js 缓存
  const isOwner = user && currentSkill.owner_id === user.id;
  const isAdmin = user && user.role === 'admin';
  const canManage = isOwner || isAdmin;
  
  container.innerHTML = collaborators.map(c => {
    const roleLabel = c.role === 'owner' ? t('collab.owner') : t('collab.collaborator');
    const roleClass = c.role === 'owner' ? 'owner' : '';
    const statusLabel = c.user.status === 'disabled' ? t('collab.disabled') : '';
    
    let removeBtn = '';
    if (canManage && c.role !== 'owner') {
      removeBtn = `<button class="btn btn-secondary btn-sm" onclick="removeCollaborator(${c.user.id})">${t('btn.remove')}</button>`;
    }
    
    // 显示 name（如果有）或 username
    const displayName = c.user.name || c.user.username;
    const usernameHint = c.user.name ? ` <span class="collaborator-username">@${escapeHtml(c.user.username)}</span>` : '';
    
    return `
      <div class="collaborator-item">
        <div class="collaborator-info">
          <span class="collaborator-role ${roleClass}">${roleLabel}</span>
          <span>${escapeHtml(displayName)}${usernameHint}${statusLabel}</span>
        </div>
        ${removeBtn}
      </div>
    `;
  }).join('');
}

// 显示添加协作者弹窗
function showAddCollaboratorModal() {
  document.getElementById('add-collaborator-modal').style.display = 'flex';
  document.getElementById('collaborator-username').value = '';
  selectedUserId = null;  // 重置选中状态
  hideSuggestions();  // 隐藏联想列表
  document.getElementById('collaborator-username').focus();
}

// 初始化联想搜索（在 DOM 加载后调用）
function initUserSuggestions() {
  const input = document.getElementById('collaborator-username');
  const suggestionsEl = document.getElementById('user-suggestions');
  if (!input || !suggestionsEl) return;
  
  // 监听输入事件，防抖 300ms
  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    selectedUserId = null;  // 用户手动输入时清除选中状态
    
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    if (query.length < 1) {
      hideSuggestions();
      return;
    }
    
    searchDebounceTimer = setTimeout(() => {
      searchUsers(query);
    }, 300);
  });
  
  // 点击页面其他区域关闭下拉
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.suggestions-container')) {
      hideSuggestions();
    }
  });
}

// 搜索用户
async function searchUsers(query) {
  try {
    const data = await apiGet(`/users/search?q=${encodeURIComponent(query)}`);
    renderSuggestions(data.users || []);
  } catch (error) {
    console.error('Failed to search users:', error);
    hideSuggestions();
  }
}

// 渲染联想列表
function renderSuggestions(users) {
  const suggestionsEl = document.getElementById('user-suggestions');
  if (!suggestionsEl) return;
  
  if (users.length === 0) {
    suggestionsEl.innerHTML = `<div class="suggestion-empty">${t('collab.noUsers')}</div>`;
    suggestionsEl.classList.add('is-open');
    return;
  }
  
  suggestionsEl.innerHTML = users.map(user => {
    const displayName = user.name 
      ? `<span class="suggestion-item-name">${escapeHtml(user.name)}</span><span class="suggestion-item-username">@${escapeHtml(user.username)}</span>`
      : `<span class="suggestion-item-name">@${escapeHtml(user.username)}</span>`;
    return `
      <div class="suggestion-item" data-user-id="${user.id}" data-username="${escapeHtml(user.username)}" data-name="${escapeHtml(user.name || '')}">
        ${displayName}
      </div>
    `;
  }).join('');
  
  // 绑定点击事件
  suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => selectSuggestion(item));
  });
  
  suggestionsEl.classList.add('is-open');
}

// 选择联想项
function selectSuggestion(item) {
  const userId = item.dataset.userId;
  const username = item.dataset.username;
  const name = item.dataset.name;
  
  selectedUserId = userId;
  
  // 设置输入框显示文本
  const input = document.getElementById('collaborator-username');
  input.value = name || username;
  
  hideSuggestions();
}

// 隐藏联想列表
function hideSuggestions() {
  const suggestionsEl = document.getElementById('user-suggestions');
  if (suggestionsEl) {
    suggestionsEl.classList.remove('is-open');
    suggestionsEl.innerHTML = '';
  }
}

// 关闭添加协作者弹窗
function closeCollaboratorModal() {
  document.getElementById('add-collaborator-modal').style.display = 'none';
}

// 提交添加协作者
async function submitAddCollaborator() {
  const inputValue = document.getElementById('collaborator-username').value.trim();
  if (!inputValue) {
    showToast(t('collab.enterUsername'), 'warning');
    return;
  }
  
  try {
    // 如果有选中的 user_id，使用 user_id；否则使用 username（向后兼容）
    const payload = selectedUserId 
      ? { user_id: selectedUserId }
      : { username: inputValue };
    
    await apiPost(`/skills/${currentSkill.id}/collaborators`, payload);
    showToast(t('collab.addSuccess'), 'success');
    closeCollaboratorModal();
    await loadCollaborators();
  } catch (error) {
    showToast(error.message || t('collab.addFailed'), 'error');
  }
}

// 移除协作者
async function removeCollaborator(userId) {
  if (!confirm(t('collab.removeConfirm'))) return;
  
  try {
    await apiDelete(`/skills/${currentSkill.id}/collaborators/${userId}`);
    showToast(t('collab.removeSuccess'), 'success');
    await loadCollaborators();
  } catch (error) {
    showToast(error.message || t('collab.removeFailed'), 'error');
  }
}

// 显示删除 Skill 弹窗
function showDeleteSkillModal() {
  document.getElementById('delete-skill-modal').style.display = 'flex';
  document.getElementById('delete-confirm-input').value = '';
  document.getElementById('delete-confirm-input').placeholder = currentSkill.id;
}

// 关闭删除 Skill 弹窗
function closeDeleteModal() {
  document.getElementById('delete-skill-modal').style.display = 'none';
}

// 在页面加载时初始化联想搜索
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserSuggestions);
} else {
  initUserSuggestions();
}

// 提交删除 Skill
async function submitDeleteSkill() {
  const confirmValue = document.getElementById('delete-confirm-input').value.trim();
  if (confirmValue !== currentSkill.id) {
    showToast(t('collab.deleteWrongId'), 'warning');
    return;
  }
  
  try {
    await apiDelete(`/skills/${currentSkill.id}?confirm=${encodeURIComponent(currentSkill.id)}`);
    showToast(t('collab.deleteSuccess'), 'success');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  } catch (error) {
    showToast(error.message || t('collab.deleteFailed'), 'error');
  }
}
