/**
 * Skill Base - 列表页逻辑
 */

/** 递增以丢弃过期的列表请求结果，避免乱序响应把界面刷回旧数据 */
let skillsListLoadGen = 0;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 1. 检查登录状态
  const user = await checkAuth();
  if (!user) return;

  // 2. 渲染导航栏
  renderNavbar(user);

  // 3. 加载 Skill 列表
  await loadSkills();

  // 4. 绑定搜索事件（防抖 300ms）
  const searchInput = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearch');

  const debouncedSearch = debounce((query) => {
    loadSkills(query);
  }, 300);

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    debouncedSearch(query);
    
    // 显示/隐藏清除按钮
    if (query) {
      clearBtn.classList.add('visible');
    } else {
      clearBtn.classList.remove('visible');
    }
  });

  // 清除搜索
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    loadSkills();
    searchInput.focus();
  });
});

/**
 * 加载 Skill 列表
 * @param {string} query - 搜索关键词
 */
async function loadSkills(query = '') {
  const container = document.getElementById('skill-list');
  const gen = ++skillsListLoadGen;

  // 仅首屏容器为空时用骨架屏；搜索/刷新时保留当前列表，等数据到了再一次性替换，避免整块闪烁
  if (container.children.length === 0) {
    container.innerHTML = renderSkeletonCards(6);
  }

  try {
    const url = '/skills' + (query ? '?q=' + encodeURIComponent(query) : '');
    const data = await apiGet(url);

    if (gen !== skillsListLoadGen) return;

    const skills = data.skills || [];

    if (skills.length === 0) {
      container.innerHTML = renderEmptyState(query);
      return;
    }

    container.innerHTML = skills.map(skill => renderSkillCard(skill)).join('');
  } catch (error) {
    if (gen !== skillsListLoadGen) return;
    console.error('加载 Skill 列表失败:', error);
    showToast('加载失败: ' + error.message, 'error');
    container.innerHTML = renderEmptyState();
  }
}

/**
 * 渲染单个 Skill 卡片
 * @param {object} skill - Skill 数据
 * @returns {string} - 卡片 HTML 字符串
 */
function renderSkillCard(skill) {
  // 截断描述到 100 字
  let description = skill.description || '暂无描述';
  if (description.length > 100) {
    description = description.substring(0, 100) + '...';
  }

  // 获取负责人名称（优先显示 name，没有则显示 username）
  const ownerName = skill.owner?.name || skill.owner?.username || '未知';

  // 格式化更新时间
  const updatedTime = formatDate(skill.updated_at);

  return `
    <a href="/skill.html?id=${encodeURIComponent(skill.id)}" class="skill-card">
      <div class="skill-card-header">
        <h3 class="skill-card-name">${escapeHtml(skill.name)}</h3>
      </div>
      <p class="skill-card-desc">${escapeHtml(description)}</p>
      <div class="skill-card-footer">
        <div class="skill-card-meta">
          <span class="skill-card-owner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            ${escapeHtml(ownerName)}
          </span>
        </div>
        <span>${updatedTime}</span>
      </div>
    </a>
  `;
}

/**
 * 渲染骨架屏 Loading 卡片
 * @param {number} count - 卡片数量
 * @returns {string} - 骨架屏 HTML
 */
function renderSkeletonCards(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="skeleton-card">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-desc"></div>
        <div class="skeleton skeleton-desc-short"></div>
        <div class="skeleton skeleton-footer"></div>
      </div>
    `;
  }
  return html;
}

/**
 * 渲染空状态
 * @param {string} query - 搜索关键词
 * @returns {string} - 空状态 HTML
 */
function renderEmptyState(query) {
  if (query) {
    return `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <p class="empty-state-text">未找到包含 "${escapeHtml(query)}" 的 Skill</p>
        <p class="text-muted">试试其他关键词？</p>
      </div>
    `;
  }

  return `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <div class="empty-state-icon">📦</div>
      <p class="empty-state-text">暂无 Skill，去发布第一个吧</p>
      <a href="/publish.html" class="btn btn-primary">发布 Skill</a>
    </div>
  `;
}
