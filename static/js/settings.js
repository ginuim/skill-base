/**
 * 账户设置页面脚本
 */

// 页面初始化
document.addEventListener('DOMContentLoaded', async () => {
  const user = await getCurrentUser();
  if (!user) {
    // 未登录，checkAuth 会自动跳转
    return;
  }

  renderNavbar(user);
  loadUserProfile();
  bindEvents();
});

// 绑定事件
function bindEvents() {
  // 基本信息表单提交
  const profileForm = document.getElementById('profileForm');
  profileForm.addEventListener('submit', handleProfileUpdate);

  // 修改密码表单提交
  const passwordForm = document.getElementById('passwordForm');
  passwordForm.addEventListener('submit', handlePasswordChange);
}

// 加载用户资料
async function loadUserProfile() {
  try {
    const user = await getCurrentUser(true); // 强制刷新
    
    if (user) {
      document.getElementById('username').value = user.username || '';
      document.getElementById('name').value = user.name || '';
    }
  } catch (error) {
    showToast(error.message || '加载用户信息失败', 'error');
  }
}

// 处理基本信息更新
async function handleProfileUpdate(e) {
  e.preventDefault();
  
  const username = document.getElementById('username').value.trim();
  const name = document.getElementById('name').value.trim();
  
  if (!username || username.length < 1 || username.length > 50) {
    showToast('用户名长度必须在 1-50 个字符之间', 'warning');
    return;
  }
  
  const submitBtn = document.getElementById('saveProfileBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> 保存中...';
  
  try {
    const result = await api('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({ username, name })
    });
    
    if (result.ok) {
      showToast('个人信息已更新', 'success');
      // 刷新当前用户缓存
      await getCurrentUser(true);
    }
  } catch (error) {
    showToast(error.message || '更新失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '保存修改';
  }
}

// 处理密码修改
async function handlePasswordChange(e) {
  e.preventDefault();
  
  const oldPassword = document.getElementById('oldPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  
  if (!oldPassword) {
    showToast('请输入当前密码', 'warning');
    return;
  }
  
  if (newPassword.length < 6) {
    showToast('新密码长度至少 6 位', 'warning');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showToast('两次输入的新密码不一致', 'warning');
    return;
  }
  
  const submitBtn = document.getElementById('changePasswordBtn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner spinner-sm"></span> 修改中...';
  
  try {
    const result = await apiPost('/auth/me/change-password', {
      old_password: oldPassword,
      new_password: newPassword
    });
    
    if (result.ok) {
      showToast('密码修改成功', 'success');
      // 清空密码表单
      document.getElementById('oldPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmPassword').value = '';
    }
  } catch (error) {
    showToast(error.message || '修改失败', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '修改密码';
  }
}
