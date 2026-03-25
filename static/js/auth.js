/**
 * Skill Base - 登录逻辑
 */

(function() {
  'use strict';
  
  // DOM 元素
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('loginButton');
  const errorBox = document.getElementById('loginError');
  
  /**
   * 显示错误信息
   * @param {string} message - 错误消息
   */
  function showError(message) {
    if (errorBox) {
      errorBox.textContent = message;
      errorBox.classList.add('visible');
    }
  }
  
  /**
   * 隐藏错误信息
   */
  function hideError() {
    if (errorBox) {
      errorBox.classList.remove('visible');
    }
  }
  
  /**
   * 设置按钮加载状态
   * @param {boolean} loading - 是否加载中
   */
  const loginButtonIdleHtml =
    '<svg class="btn-devtools-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/></svg> 执行登录';

  function setLoading(loading) {
    if (loginButton) {
      loginButton.disabled = loading;
      loginButton.innerHTML = loading
        ? '<span class="spinner spinner-sm"></span> 登录中...'
        : loginButtonIdleHtml;
    }
  }
  
  /**
   * 处理登录表单提交
   * @param {Event} e - 提交事件
   */
  async function handleLogin(e) {
    e.preventDefault();
    
    // 隐藏之前的错误
    hideError();
    
    // 获取表单值
    const username = usernameInput?.value?.trim();
    const password = passwordInput?.value;
    
    // 前端验证
    if (!username) {
      showError('请输入用户名');
      usernameInput?.focus();
      return;
    }
    
    if (!password) {
      showError('请输入密码');
      passwordInput?.focus();
      return;
    }
    
    // 设置加载状态
    setLoading(true);
    
    try {
      // 调用登录 API
      await apiPost('/auth/login', {
        username,
        password,
      });
      
      // 登录成功，检查是否来自 CLI
      const urlParams = new URLSearchParams(window.location.search);
      const fromCli = urlParams.get('from') === 'cli';
      
      if (fromCli) {
        // 跳转到 CLI 验证码页面
        window.location.href = '/cli-code.html?from=cli';
      } else {
        // 跳转到首页
        window.location.href = '/';
      }
      
    } catch (error) {
      // 显示错误信息
      showError(error.message || '登录失败，请重试');
      
      // 清空密码
      if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
      }
    } finally {
      setLoading(false);
    }
  }
  
  /**
   * 初始化登录页面
   */
  function init() {
    // 监听表单提交
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }
    
    // 输入时隐藏错误
    if (usernameInput) {
      usernameInput.addEventListener('input', hideError);
    }
    if (passwordInput) {
      passwordInput.addEventListener('input', hideError);
    }
    
    // 自动聚焦用户名输入框
    if (usernameInput) {
      usernameInput.focus();
    }
  }
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
