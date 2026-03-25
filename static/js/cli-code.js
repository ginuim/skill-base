/**
 * CLI 验证码页面脚本
 */

// 当前验证码信息
let currentCode = null;
let expiresAt = null;
let timerInterval = null;

/**
 * 页面初始化
 */
async function init() {
  // 检查是否来自 CLI login 的标记
  const urlParams = new URLSearchParams(window.location.search);
  const fromCli = urlParams.get('from') === 'cli';
  
  // 检查登录状态
  const user = await initPage();
  if (!user) {
    // 未登录，initPage 已处理跳转
    return;
  }

  // 如果是从 CLI 登录过来的，显示提示信息
  if (fromCli) {
    showToast(t('cliCode.fromCli'), 'info', 5000);
  }

  // 生成验证码
  await generateCode();
}

/**
 * 生成验证码
 */
async function generateCode() {
  showLoading(true);
  
  try {
    const result = await apiPost('/auth/cli-code/generate', {});
    
    if (result.ok && result.code) {
      currentCode = result.code;
      expiresAt = new Date(result.expires_at);
      
      // 显示验证码
      document.getElementById('codeValue').textContent = currentCode;
      showLoading(false);
      
      // 启动倒计时
      startTimer();
    } else {
      throw new Error(result.error || t('cliCode.generateFailed'));
    }
  } catch (error) {
    showLoading(false);
    showToast(error.message || t('cliCode.generateFailed'), 'error');
    
    // 显示错误状态
    document.getElementById('codeValue').textContent = '----';
    document.getElementById('timerText').textContent = t('cliCode.genFailed');
  }
}

/**
 * 显示/隐藏加载状态
 */
function showLoading(loading) {
  const loadingEl = document.getElementById('loadingState');
  const displayEl = document.getElementById('codeDisplay');
  
  if (loading) {
    loadingEl.classList.remove('hidden');
    displayEl.classList.add('hidden');
  } else {
    loadingEl.classList.add('hidden');
    displayEl.classList.remove('hidden');
  }
}

/**
 * 启动倒计时
 */
function startTimer() {
  // 清除之前的定时器
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  updateTimer();
  timerInterval = setInterval(updateTimer, 1000);
}

/**
 * 更新倒计时显示
 */
function updateTimer() {
  const now = new Date();
  const remaining = Math.max(0, expiresAt - now);
  const timerEl = document.getElementById('codeTimer');
  const timerTextEl = document.getElementById('timerText');
  
  if (remaining <= 0) {
    // 已过期
    timerTextEl.textContent = t('cliCode.expired');
    timerEl.classList.remove('expiring');
    timerEl.classList.add('expired');
    clearInterval(timerInterval);
    return;
  }
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;
  timerTextEl.textContent = formattedTime + t('cliCode.expires');
  
  // 最后一分钟变为警告色
  if (remaining <= 60000) {
    timerEl.classList.add('expiring');
    timerEl.classList.remove('expired');
  } else {
    timerEl.classList.remove('expiring');
    timerEl.classList.remove('expired');
  }
}

/**
 * 复制验证码
 */
async function copyCode() {
  if (!currentCode) {
    showToast(t('cliCode.noCopy'), 'warning');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(currentCode);
    showToast(t('cliCode.copiedToast'), 'success');
    
    // 按钮反馈
    const btn = document.getElementById('copyBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      ${t('cliCode.copied')}
    `;
    btn.disabled = true;
    
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);
  } catch (error) {
    // 降级方案：选中文本
    const codeEl = document.getElementById('codeValue');
    const range = document.createRange();
    range.selectNodeContents(codeEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    showToast(t('cliCode.pressCopy'), 'info');
  }
}

/**
 * 重新生成验证码
 */
async function regenerateCode() {
  const btn = document.getElementById('regenerateBtn');
  btn.disabled = true;
  
  try {
    await generateCode();
    showToast(t('cliCode.newGenerated'), 'success');
  } finally {
    btn.disabled = false;
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
