/**
 * Skill Base - Initial Setup Page
 * Handles first-time admin account creation
 */

(function() {
  'use strict';

  const API_BASE = '/api/v1';

  // DOM elements
  const form = document.getElementById('setupForm');
  const errorEl = document.getElementById('setupError');
  const successEl = document.getElementById('setupSuccess');
  const submitBtn = document.getElementById('setupButton');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');

  // Check if system is already initialized
  async function checkInitStatus() {
    try {
      const res = await fetch(`${API_BASE}/init/status`);
      const data = await res.json();
      
      if (data.initialized) {
        // Already initialized, redirect to home
        window.location.href = '/';
      }
    } catch (err) {
      console.error('Failed to check init status:', err);
    }
  }

  // Show error message
  function showError(message) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    successEl.style.display = 'none';
  }

  // Show success message
  function showSuccess(message) {
    successEl.textContent = message;
    successEl.style.display = 'block';
    errorEl.style.display = 'none';
  }

  // Clear messages
  function clearMessages() {
    errorEl.style.display = 'none';
    successEl.style.display = 'none';
  }

  // Set button loading state
  function setLoading(loading) {
    submitBtn.disabled = loading;
    const btnText = submitBtn.querySelector('span');
    if (loading) {
      btnText.textContent = window._t ? window._t('setup.loading') : '创建中...';
    } else {
      btnText.textContent = window._t ? window._t('setup.submit') : '创建管理员账号';
    }
  }

  // Handle form submit
  async function handleSubmit(e) {
    e.preventDefault();
    clearMessages();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate
    if (!username) {
      showError(window._t ? window._t('setup.errUsername') : '请输入用户名');
      usernameInput.focus();
      return;
    }

    if (username.length < 3 || username.length > 50) {
      showError(window._t ? window._t('setup.errUsernameLength') : '用户名需要 3-50 个字符');
      usernameInput.focus();
      return;
    }

    if (!password) {
      showError(window._t ? window._t('setup.errPassword') : '请输入密码');
      passwordInput.focus();
      return;
    }

    if (password.length < 6) {
      showError(window._t ? window._t('setup.errPasswordLength') : '密码至少需要 6 个字符');
      passwordInput.focus();
      return;
    }

    if (password !== confirmPassword) {
      showError(window._t ? window._t('setup.errPasswordMismatch') : '两次输入的密码不一致');
      confirmPasswordInput.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/init/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Setup failed');
      }

      // Success
      showSuccess(window._t ? window._t('setup.success') : '管理员账号创建成功，即将跳转到登录页...');
      form.reset();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (err) {
      showError(err.message || (window._t ? window._t('setup.errFailed') : '创建失败，请重试'));
    } finally {
      setLoading(false);
    }
  }

  // Initialize
  function init() {
    // Apply i18n if available
    if (window.applyI18n) {
      window.applyI18n();
    }

    // Check init status
    checkInitStatus();

    // Bind form submit
    form.addEventListener('submit', handleSubmit);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
