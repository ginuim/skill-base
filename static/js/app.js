/**
 * Skill Base - 共享 API 调用封装
 */

// API 基础路径
const API_BASE = '/api/v1';

/**
 * 封装 fetch 请求
 * @param {string} path - API 路径
 * @param {object} options - fetch 选项
 * @returns {Promise<any>} - 响应数据
 */
async function api(path, options = {}) {
  const url = path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
  
  // 默认 headers
  const headers = {
    ...options.headers,
  };
  
  // 如果不是 FormData，添加 JSON content-type
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // 包含 cookies
  });
  
  // 处理 401 未授权，跳转登录页
  if (response.status === 401) {
    // 如果当前不在登录页，跳转到登录页
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login.html';
    }
    throw new Error(typeof t === 'function' ? t('login.unauthorized') : 'Unauthorized, please sign in again');
  }
  
  // 处理 204 No Content
  if (response.status === 204) {
    return null;
  }
  
  // 解析 JSON 响应
  const contentType = response.headers.get('content-type');
  let data;
  
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }
  
  // 处理错误响应
  if (!response.ok) {
    const errorMessage = data?.detail || data?.error || data?.message || `Request failed (${response.status})`;
    throw new Error(errorMessage);
  }
  
  return data;
}

/**
 * 检查系统是否已初始化，未初始化则跳转到 setup 页面
 * @returns {Promise<boolean>} - 是否已初始化
 */
async function checkSystemInit() {
  // setup 页面不需要检查
  if (window.location.pathname === '/setup' || window.location.pathname === '/setup.html') {
    return true;
  }
  
  try {
    const res = await fetch(`${API_BASE}/init/status`);
    const data = await res.json();
    
    if (!data.initialized) {
      // 未初始化，跳转到 setup 页面
      window.location.href = '/setup';
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to check system init status:', err);
    return true; // 出错时假定已初始化，避免循环
  }
}

/**
 * GET 请求
 * @param {string} path - API 路径
 * @returns {Promise<any>}
 */
async function apiGet(path) {
  return api(path, {
    method: 'GET',
  });
}

/**
 * POST JSON 请求
 * @param {string} path - API 路径
 * @param {object} data - 请求数据
 * @returns {Promise<any>}
 */
async function apiPost(path, data) {
  return api(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT JSON 请求
 * @param {string} path - API 路径
 * @param {object} data - 请求数据
 * @returns {Promise<any>}
 */
async function apiPut(path, data) {
  return api(path, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE 请求
 * @param {string} path - API 路径
 * @returns {Promise<any>}
 */
async function apiDelete(path) {
  return api(path, {
    method: 'DELETE',
  });
}

/**
 * POST FormData 请求（用于文件上传）
 * @param {string} path - API 路径
 * @param {FormData} formData - FormData 对象
 * @returns {Promise<any>}
 */
async function apiUpload(path, formData) {
  return api(path, {
    method: 'POST',
    body: formData,
    // 不设置 Content-Type，让浏览器自动设置 multipart/form-data
  });
}

/**
 * 检查登录状态
 * @returns {Promise<object|null>} - 用户信息或 null
 */
async function checkAuth() {
  try {
    const user = await apiGet('/auth/me');
    return user;
  } catch (error) {
    // 请求失败，跳转登录页
    if (!window.location.pathname.includes('/login')) {
      window.location.href = '/login.html';
    }
    return null;
  }
}

// 当前用户信息缓存
let currentUser = null;

/**
 * 获取当前用户信息（带缓存）
 * @param {boolean} forceRefresh - 是否强制刷新
 * @returns {Promise<object|null>}
 */
async function getCurrentUser(forceRefresh = false) {
  if (currentUser && !forceRefresh) {
    return currentUser;
  }
  
  try {
    currentUser = await apiGet('/auth/me');
    return currentUser;
  } catch (error) {
    currentUser = null;
    return null;
  }
}

/**
 * 登出
 * @returns {Promise<void>}
 */
async function logout() {
  try {
    await apiPost('/auth/logout', {});
  } catch (error) {
    // 忽略登出错误
  } finally {
    currentUser = null;
    window.location.href = '/login.html';
  }
}

// ========================================
// Toast 通知
// ========================================

// Toast 图标 SVG
const TOAST_ICONS = {
  success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

/**
 * 获取或创建 Toast 容器
 * @returns {HTMLElement}
 */
function getToastContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

/**
 * 显示 Toast 通知
 * @param {string} message - 消息内容
 * @param {string} type - 类型：success, error, warning, info
 * @param {number} duration - 显示时长（毫秒），默认 3000
 */
function showToast(message, type = 'info', duration = 3000) {
  const container = getToastContainer();
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;
  
  container.appendChild(toast);
  
  // 自动消失
  setTimeout(() => {
    toast.classList.add('toast-out');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

// ========================================
// 工具函数
// ========================================

/**
 * HTML 转义
 * @param {string} text - 原始文本
 * @returns {string} - 转义后的文本
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化日期
 * @param {string|Date} dateStr - 日期字符串或 Date 对象
 * @returns {string} - 格式化后的日期
 */
function formatDate(dateStr) {
  if (!dateStr) return '-';
  
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  
  const _t = typeof t === 'function' ? t : (k) => k;

  // 1分钟内
  if (diff < 60 * 1000) {
    return _t('time.justNow');
  }
  
  // 1小时内
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return window.I18N_LANG === 'zh' ? `${minutes}${_t('time.minutesAgo')}` : `${minutes}${_t('time.minutesAgo')}`;
  }
  
  // 24小时内
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return window.I18N_LANG === 'zh' ? `${hours}${_t('time.hoursAgo')}` : `${hours}${_t('time.hoursAgo')}`;
  }
  
  // 7天内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    return window.I18N_LANG === 'zh' ? `${days}${_t('time.daysAgo')}` : `${days}${_t('time.daysAgo')}`;
  }
  
  // 超过7天，显示具体日期
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  
  // 同一年不显示年份
  if (year === now.getFullYear()) {
    return `${month}-${day} ${hour}:${minute}`;
  }
  
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} - 格式化后的大小
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i];
}

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function}
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========================================
// 导航栏渲染
// ========================================

/**
 * 渲染导航栏
 * @param {object} user - 用户信息
 */
function renderNavbar(user) {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
  // 查找或创建用户区域
  let userArea = navbar.querySelector('.navbar-user');
  if (!userArea) {
    userArea = document.createElement('div');
    userArea.className = 'navbar-user';
    navbar.querySelector('.container').appendChild(userArea);
  }
  
  const _t = typeof t === 'function' ? t : (k) => k;
  const _lang = window.I18N_LANG || 'en';
  const _langLabel = _lang === 'zh' ? '中文' : 'English';
  const _langBtnHtml = `
    <div class="lang-switcher">
      <button type="button" class="lang-switcher-trigger navbar-surface-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span>${_langLabel}</span>
        <svg class="lang-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="lang-switcher-menu">
        <button class="lang-switcher-option${_lang === 'zh' ? ' active' : ''}" onclick="setLang('zh')">中文</button>
        <button class="lang-switcher-option${_lang === 'en' ? ' active' : ''}" onclick="setLang('en')">English</button>
      </div>
    </div>
  `;

  if (user) {
    // 已登录：显示用户名和下拉菜单
    userArea.innerHTML = `
      ${_langBtnHtml}
      <div class="navbar-user-dropdown">
        <button type="button" class="navbar-user-btn navbar-surface-btn">
          <span class="username">${escapeHtml(user.username)}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <div class="navbar-user-menu">
          <a href="/settings.html" class="navbar-user-menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            ${_t('nav.settings')}
          </a>
          ${user.role === 'admin' ? `
          <a href="/admin/users" class="navbar-user-menu-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            ${_t('nav.admin')}
          </a>
          ` : ''}
          <div class="navbar-user-menu-divider"></div>
          <button onclick="logout()" class="navbar-user-menu-item navbar-user-logout">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ${_t('nav.logout')}
          </button>
        </div>
      </div>
    `;
    
    // 绑定下拉菜单的点击事件（与用户菜单、语言菜单互斥）
    const dropdown = userArea.querySelector('.navbar-user-dropdown');
    const button = dropdown.querySelector('.navbar-user-btn');
    const langSwitcher = userArea.querySelector('.lang-switcher');
    const langTrigger = userArea.querySelector('.lang-switcher-trigger');

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (langSwitcher) langSwitcher.classList.remove('active');
      dropdown.classList.toggle('active');
    });

    if (langTrigger && langSwitcher) {
      langTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.remove('active');
        langSwitcher.classList.toggle('active');
      });
    }

    // 点击其他地方关闭所有菜单
    document.addEventListener('click', () => {
      dropdown.classList.remove('active');
      if (langSwitcher) langSwitcher.classList.remove('active');
    });
  } else {
    // 未登录：显示登录按钮
    userArea.innerHTML = `
      ${_langBtnHtml}
      <a href="/login.html" class="btn btn-primary btn-sm">${_t('nav.login')}</a>
    `;

    // 绑定语言切换下拉
    const langSwitcher = userArea.querySelector('.lang-switcher');
    const langTrigger = userArea.querySelector('.lang-switcher-trigger');
    if (langTrigger) {
      langTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        langSwitcher.classList.toggle('active');
      });
      document.addEventListener('click', () => {
        langSwitcher.classList.remove('active');
      });
    }
  }
}

/**
 * 初始化页面（检查系统初始化状态、登录状态并渲染导航栏）
 * 在需要登录的页面调用此函数
 */
async function initPage() {
  // 先检查系统是否已初始化
  const initialized = await checkSystemInit();
  if (!initialized) {
    return null; // 已跳转到 setup 页面
  }
  
  const user = await checkAuth();
  if (user) {
    renderNavbar(user);
  }
  return user;
}
