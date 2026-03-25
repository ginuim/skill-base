/**
 * Skill Base - 用户管理页面 JavaScript
 */

// 全局状态
let currentPage = 1;
let currentLimit = 20;
let currentQuery = '';
let currentStatusFilter = '';
let currentEditUserId = null;

// 页面初始化
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) return; // checkAuth 会自动跳转

  // 检查管理员权限
  if (user.role !== 'admin') {
    window.location.href = '/';
    return;
  }

  renderNavbar(user);
  loadUsers();
  bindEvents();
});

// 绑定事件
function bindEvents() {
  // 搜索输入（防抖）
  const searchInput = document.getElementById('searchInput');
  const debouncedSearch = debounce(() => {
    currentQuery = searchInput.value.trim();
    currentPage = 1;
    loadUsers();
  }, 300);
  searchInput.addEventListener('input', debouncedSearch);

  // 清除搜索
  const clearSearch = document.getElementById('clearSearch');
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    currentQuery = '';
    currentPage = 1;
    loadUsers();
  });

  // 状态筛选
  const statusFilter = document.getElementById('statusFilter');
  statusFilter.addEventListener('change', () => {
    currentStatusFilter = statusFilter.value;
    currentPage = 1;
    loadUsers();
  });

  // 分页按钮
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsers();
    }
  });

  document.getElementById('nextPage').addEventListener('click', () => {
    currentPage++;
    loadUsers();
  });

  // 编辑用户状态切换
  const editStatus = document.getElementById('editStatus');
  editStatus.addEventListener('change', () => {
    document.getElementById('editStatusLabel').textContent = editStatus.checked ? '启用' : '禁用';
  });

  // 重置密码按钮
  document.getElementById('resetPasswordBtn').addEventListener('click', () => {
    const userId = document.getElementById('editUserId').value;
    const username = document.getElementById('editUsername').value;
    closeModal();
    showResetPasswordModal(userId, username);
  });

  // 点击弹窗遮罩关闭
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });
  });

  // ESC 键关闭弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}

// 加载用户列表
async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  
  // 显示 loading
  tbody.innerHTML = `
    <tr>
      <td colspan="5">
        <div class="table-loading">
          <div class="spinner"></div>
        </div>
      </td>
    </tr>
  `;

  try {
    // 构建查询参数
    const params = new URLSearchParams();
    if (currentQuery) params.append('q', currentQuery);
    if (currentStatusFilter) params.append('status', currentStatusFilter);
    params.append('page', currentPage);
    params.append('limit', currentLimit);

    const data = await apiGet(`/users?${params.toString()}`);
    
    if (data.users && data.users.length > 0) {
      renderUsersTable(data.users);
      renderPagination(data.total, data.page, data.limit);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <div class="empty-state-icon">👤</div>
              <div class="empty-state-text">暂无用户</div>
            </div>
          </td>
        </tr>
      `;
      document.getElementById('pagination').classList.add('hidden');
    }
  } catch (error) {
    showToast(error.message || '加载用户列表失败', 'error');
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-state-icon">❌</div>
            <div class="empty-state-text">加载失败，请刷新重试</div>
          </div>
        </td>
      </tr>
    `;
    document.getElementById('pagination').classList.add('hidden');
  }
}

// 渲染用户表格
function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  
  tbody.innerHTML = users.map(user => {
    const roleLabel = user.role === 'admin' ? '管理员' : '开发者';
    const roleClass = user.role === 'admin' ? 'admin' : 'developer';
    const statusLabel = user.status === 'active' ? '✅ 启用' : '⛔ 禁用';
    const statusClass = user.status === 'active' ? 'active' : 'disabled';
    
    return `
      <tr>
        <td><strong>${escapeHtml(user.username)}</strong></td>
        <td><span class="role-badge ${roleClass}">${roleLabel}</span></td>
        <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
        <td>${formatDate(user.created_at)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="showEditUserModal(${user.id})">
            编辑
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

// 渲染分页
function renderPagination(total, page, limit) {
  const pagination = document.getElementById('pagination');
  const pageInfo = document.getElementById('pageInfo');
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  
  const totalPages = Math.ceil(total / limit);
  
  if (totalPages <= 1) {
    pagination.classList.add('hidden');
    return;
  }
  
  pagination.classList.remove('hidden');
  pageInfo.textContent = `${page} / ${totalPages}`;
  
  prevBtn.disabled = page <= 1;
  nextBtn.disabled = page >= totalPages;
}

// 显示添加用户弹窗
function showAddUserModal() {
  // 重置表单
  document.getElementById('addUsername').value = '';
  document.getElementById('addPassword').value = '';
  document.querySelector('input[name="addRole"][value="developer"]').checked = true;
  
  document.getElementById('addUserModal').classList.add('visible');
  document.getElementById('addUsername').focus();
}

// 提交添加用户
async function submitAddUser() {
  const username = document.getElementById('addUsername').value.trim();
  const password = document.getElementById('addPassword').value;
  const role = document.querySelector('input[name="addRole"]:checked').value;

  if (!username) {
    showToast('请输入用户名', 'warning');
    return;
  }

  if (!password) {
    showToast('请输入初始密码', 'warning');
    return;
  }

  const submitBtn = document.getElementById('submitAddUser');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> 添加中...';

  try {
    await apiPost('/users', { username, password, role });
    showToast('用户添加成功', 'success');
    closeModal();
    loadUsers();
  } catch (error) {
    showToast(error.message || '添加用户失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '添加';
  }
}

// 显示编辑用户弹窗
async function showEditUserModal(userId) {
  currentEditUserId = userId;

  try {
    const user = await apiGet(`/users/${userId}`);
    
    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUsername').value = user.username;
    
    // 设置角色
    const roleRadio = document.querySelector(`input[name="editRole"][value="${user.role}"]`);
    if (roleRadio) roleRadio.checked = true;
    
    // 设置状态
    const isActive = user.status === 'active';
    document.getElementById('editStatus').checked = isActive;
    document.getElementById('editStatusLabel').textContent = isActive ? '启用' : '禁用';
    
    document.getElementById('editUserModal').classList.add('visible');
  } catch (error) {
    showToast(error.message || '获取用户信息失败', 'error');
  }
}

// 提交编辑用户
async function submitEditUser() {
  const userId = document.getElementById('editUserId').value;
  const role = document.querySelector('input[name="editRole"]:checked').value;
  const status = document.getElementById('editStatus').checked ? 'active' : 'disabled';

  const submitBtn = document.getElementById('submitEditUser');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> 保存中...';

  try {
    // 使用 api 函数发送 PATCH 请求
    await api(`/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role, status })
    });
    showToast('用户信息已更新', 'success');
    closeModal();
    loadUsers();
  } catch (error) {
    showToast(error.message || '更新用户失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '保存';
  }
}

// 显示重置密码弹窗
function showResetPasswordModal(userId, username) {
  document.getElementById('resetPasswordUserId').value = userId;
  document.getElementById('resetPasswordUsername').textContent = username;
  document.getElementById('newPassword').value = '';
  
  document.getElementById('resetPasswordModal').classList.add('visible');
  document.getElementById('newPassword').focus();
}

// 提交重置密码
async function submitResetPassword() {
  const userId = document.getElementById('resetPasswordUserId').value;
  const newPassword = document.getElementById('newPassword').value;

  if (!newPassword) {
    showToast('请输入新密码', 'warning');
    return;
  }

  const submitBtn = document.getElementById('submitResetPassword');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<div class="spinner spinner-sm"></div> 重置中...';

  try {
    await apiPost(`/users/${userId}/reset-password`, { new_password: newPassword });
    showToast('密码重置成功', 'success');
    closeModal();
  } catch (error) {
    showToast(error.message || '重置密码失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '确认重置';
  }
}

// 关闭所有弹窗
function closeModal() {
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.classList.remove('visible');
  });
  currentEditUserId = null;
}
