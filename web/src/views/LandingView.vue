<template>
  <div class="landing-page">
  <!-- 复制原始 landing.html 的完整结构 -->
  <nav class="navbar">
    <div class="container">
      <a href="#" class="nav-logo">$ Skill Base</a>
      <div class="nav-links">
        <a href="#what-is-skill">Agent Skill</a>
        <a href="#why">为什么需要</a>
        <a href="#features">核心特性</a>
        <a href="#quick-start">快速开始</a>
        <a href="#philosophy">设计哲学</a>
      </div>
      <router-link to="/login" class="nav-cta">进入平台 →</router-link>
    </div>
  </nav>

  <section class="hero">
    <div class="container">
      <div class="hero-content">
        <div class="hero-text">
          <div class="hero-badge fade-in">
            <span>Open Source</span>
          </div>
          <h1 class="fade-in stagger-1">
            <span class="highlight">Skill</span> Base
          </h1>
          <p class="hero-subtitle fade-in stagger-2">
            专为小团队打造的 AI Agent Skill 私有化管理平台
          </p>
          <p class="hero-description fade-in stagger-3">
            告别跨项目复制粘贴提示词，让你的 Cursor、OpenClaw、Cline 等 AI 助手瞬间掌握团队内部的最佳实践与业务规范。
          </p>
          <div class="hero-cta fade-in stagger-4">
            <button class="btn copy-btn" id="hero-copy-btn">
              <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              npx skill-base
            </button>
            <a href="#what-is-skill" class="btn btn-secondary">了解更多 ↓</a>
          </div>
        </div>

        <div class="hero-terminal fade-in stagger-5">
          <div class="terminal">
            <div class="terminal-header">
              <span class="terminal-dot red"></span>
              <span class="terminal-dot yellow"></span>
              <span class="terminal-dot green"></span>
              <span class="terminal-title">Terminal</span>
            </div>
            <div class="terminal-body" id="hero-terminal-body">
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider"></div>

  <section class="what-is-skill" id="what-is-skill">
    <div class="container">
      <h2 class="section-title fade-in">什么是 Agent Skill？</h2>
      <p class="section-subtitle fade-in stagger-1">
        让 AI 助手理解你们团队的编码规范和最佳实践
      </p>

      <div class="comparison-grid fade-in stagger-2">
        <div class="comparison-card before">
          <div class="comparison-label">
            <svg class="lucide-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg> AI 默认写的代码
          </div>
          <div class="comparison-code">
            <pre><code><span class="comment">// 发送 HTTP 请求</span>
<span class="keyword">import</span> axios <span class="keyword">from</span> <span class="string">'axios'</span>;

<span class="keyword">const</span> res = <span class="keyword">await</span> axios.<span class="function">get</span>(<span class="string">'/api/users'</span>);

<span class="comment">// 使用通用 UI 组件</span>
<span class="keyword">import</span> { Button } <span class="keyword">from</span> <span class="string">'antd'</span>;

<span class="comment">// 手写工具函数</span>
<span class="keyword">const</span> <span class="function">formatDate</span> = (d) => { ... }</code></pre>
          </div>
        </div>

        <div class="comparison-arrow">→</div>

        <div class="comparison-card after">
          <div class="comparison-label">
            <svg class="lucide-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> 有 Skill 后写的代码
          </div>
          <div class="comparison-code">
            <pre><code><span class="comment">// 使用团队内部请求库</span>
<span class="keyword">import</span> { request } <span class="keyword">from</span> <span class="string">'@company/http'</span>;

<span class="keyword">const</span> res = <span class="keyword">await</span> request.<span class="function">get</span>(<span class="string">'/api/users'</span>);

<span class="comment">// 使用公司组件库</span>
<span class="keyword">import</span> { Button } <span class="keyword">from</span> <span class="string">'@company/ui'</span>;

<span class="comment">// 使用已有工具库</span>
<span class="keyword">import</span> { formatDate } <span class="keyword">from</span> <span class="string">'@company/utils'</span>;</code></pre>
          </div>
        </div>
      </div>

      <div class="key-points fade-in stagger-3" data-stagger-group>
        <div class="key-point fade-in">
          <div class="key-point-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1"/><path d="M13 21v-2a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1"/><path d="M3 7V5a1 1 0 0 1 1-1h1a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1"/><path d="M7 9h10"/><path d="M17 7V5a1 1 0 0 0-1-1h-1a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1"/></svg></div>
          <h4>内部请求库</h4>
          <p>统一使用团队封装的 HTTP 客户端，内置鉴权、重试、日志</p>
        </div>
        <div class="key-point fade-in">
          <div class="key-point-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.536 11.293a1 1 0 0 0 0 1.414l2.376 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"/><path d="M2.297 11.293a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L6.088 8.916a1 1 0 0 0-1.414 0z"/><path d="M8.916 17.912a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414l-2.377-2.377a1 1 0 0 0-1.414 0z"/><path d="M8.916 4.674a1 1 0 0 0 0 1.414l2.377 2.377a1 1 0 0 0 1.414 0l2.377-2.377a1 1 0 0 0 0-1.414L12.707 2.297a1 1 0 0 0-1.414 0z"/></svg></div>
          <h4>内部组件</h4>
          <p>优先使用公司设计系统的组件，保持 UI 一致性</p>
        </div>
        <div class="key-point fade-in">
          <div class="key-point-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg></div>
          <h4>内部工具方法</h4>
          <p>复用已有的工具函数，避免重复造轮子</p>
        </div>
      </div>

      <div class="conclusion fade-in stagger-4">
        <p>Agent Skill 就是让 AI <span class="highlight">按你们团队的规矩</span>写代码</p>
      </div>
    </div>
  </section>

  <div class="section-divider"></div>

  <section class="why-skill-base" id="why">
    <div class="container">
      <h2 class="section-title fade-in">为什么需要 Skill Base？</h2>
      <p class="section-subtitle fade-in stagger-1">
        三个痛点，一个解决方案
      </p>

      <div class="pain-points" data-stagger-group>
        <div class="pain-point fade-in">
          <div class="pain-point-number">痛点 01</div>
          <h3>公共平台不适合存放私有业务</h3>
          <p class="problem">
            公司的编码规范、内部 API 文档、业务逻辑不能上传到公共平台，但又需要让 AI 理解这些内容。
          </p>
          <div class="solution">私有化部署，数据完全掌控</div>
        </div>

        <div class="pain-point fade-in">
          <div class="pain-point-number">痛点 02</div>
          <h3>告别四处复制粘贴</h3>
          <p class="problem">
            每个项目都要手动复制 .cursorrules 文件，版本混乱，更新困难，团队成员各用各的。
          </p>
          <div class="solution">像 npm 一样安装和更新</div>
        </div>

        <div class="pain-point fade-in">
          <div class="pain-point-number">痛点 03</div>
          <h3>拒绝重型架构</h3>
          <p class="problem">
            不想为了管理几个提示词文件就部署复杂的基础设施，K8s、Docker Compose 太重了。
          </p>
          <div class="solution">一行 npx 命令即可启动</div>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider"></div>

  <section class="features" id="features">
    <div class="container">
      <h2 class="section-title fade-in">核心特性</h2>
      <p class="section-subtitle fade-in stagger-1">
        为开发者精心打造的每一个细节
      </p>

      <div class="features-grid fade-in stagger-2" data-stagger-group>
        <div class="feature-card fade-in">
          <span class="feature-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg></span>
          <h3>零配置启动</h3>
          <p>一行命令启动服务，SQLite 自动初始化，开箱即用</p>
        </div>

        <div class="feature-card fade-in">
          <span class="feature-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg></span>
          <h3>npm 般的体验</h3>
          <p>search / install / publish，熟悉的工作流，零学习成本</p>
        </div>

        <div class="feature-card fade-in">
          <span class="feature-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></span>
          <h3>私有化安全</h3>
          <p>完全部署在你的内网，敏感规范不外泄</p>
        </div>

        <div class="feature-card fade-in">
          <span class="feature-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/></svg></span>
          <h3>版本控制</h3>
          <p>每次发布自动生成版本号，支持版本回溯和对比</p>
        </div>

        <div class="feature-card fade-in">
          <span class="feature-icon"><svg class="lucide-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg></span>
          <h3>双端支持</h3>
          <p>Web 界面浏览管理，CLI 集成到开发工作流</p>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider"></div>

  <section class="quick-start" id="quick-start">
    <div class="container">
      <h2 class="section-title fade-in">快速开始</h2>
      <p class="section-subtitle fade-in stagger-1">
        从安装到使用，只需几分钟
      </p>

      <div class="fade-in stagger-2">
        <div class="tabs">
          <button class="tab active" data-tab="tab-server">启动服务</button>
          <button class="tab" data-tab="tab-install">安装 CLI</button>
          <button class="tab" data-tab="tab-search">搜索安装</button>
          <button class="tab" data-tab="tab-publish">发布 Skill</button>
          <button class="tab" data-tab="tab-ide">IDE 集成</button>
        </div>

        <div id="tab-server" class="tab-content active">
          <div class="code-block">
            <div class="code-header">
              <div class="code-dots">
                <span class="code-dot red"></span>
                <span class="code-dot yellow"></span>
                <span class="code-dot green"></span>
              </div>
              <button class="code-copy">Copy</button>
            </div>
            <div class="code-body">
<span class="comment"># 一行命令启动服务（推荐指定数据目录）</span>
<span class="command">npx</span> <span class="flag">skill-base</span> <span class="flag">-d</span> ./skill-data <span class="flag">-p</span> 8000

<span class="comment"># 访问 Web 管理后台</span>
<span class="output">打开浏览器访问 http://localhost:8000</span>

<span class="comment"># 首次访问将引导设置管理员账号</span>
<span class="comment"># 通过 Web 界面即可浏览、搜索、下载和发布 Skill</span>
            </div>
          </div>
        </div>

        <div id="tab-install" class="tab-content">
          <div class="code-block">
            <div class="code-header">
              <div class="code-dots">
                <span class="code-dot red"></span>
                <span class="code-dot yellow"></span>
                <span class="code-dot green"></span>
              </div>
              <button class="code-copy">Copy</button>
            </div>
            <div class="code-body">
<span class="comment"># 全局安装 CLI 工具</span>
<span class="command">npm</span> <span class="flag">install</span> <span class="flag">-g</span> skill-base-cli

<span class="comment"># 配置你的 Skill Base 服务器地址</span>
<span class="command">skb</span> <span class="flag">init</span> <span class="flag">-s</span> <span class="string">http://your-server</span>

<span class="comment"># 登录</span>
<span class="command">skb</span> <span class="flag">login</span>
            </div>
          </div>
        </div>

        <div id="tab-search" class="tab-content">
          <div class="code-block">
            <div class="code-header">
              <div class="code-dots">
                <span class="code-dot red"></span>
                <span class="code-dot yellow"></span>
                <span class="code-dot green"></span>
              </div>
              <button class="code-copy">Copy</button>
            </div>
            <div class="code-body">
<span class="comment"># 搜索可用的 Skills</span>
<span class="command">skb</span> <span class="flag">search</span> <span class="string">react</span>

<span class="output">  NAME                 DESCRIPTION
  react-best-practice  React 开发最佳实践
  react-testing        React 测试规范</span>

<span class="comment"># 安装 Skill 到当前项目</span>
<span class="command">skb</span> <span class="flag">install</span> <span class="string">react-best-practice</span>

<span class="output">✓ Installed react-best-practice@v20240320.143022</span>
            </div>
          </div>
        </div>

        <div id="tab-publish" class="tab-content">
          <div class="code-block">
            <div class="code-header">
              <div class="code-dots">
                <span class="code-dot red"></span>
                <span class="code-dot yellow"></span>
                <span class="code-dot green"></span>
              </div>
              <button class="code-copy">Copy</button>
            </div>
            <div class="code-body">
<span class="comment"># 创建一个新的 Skill 目录</span>
<span class="command">mkdir</span> my-team-skill && <span class="command">cd</span> my-team-skill

<span class="comment"># 创建 SKILL.md 文件（必需）</span>
<span class="command">cat</span> &gt; SKILL.md &lt;&lt; <span class="string">'EOF'</span>
<span class="string"># My Team Coding Standards

这是我们团队的编码规范...

## 命名规范
- 使用 camelCase 命名变量
- 使用 PascalCase 命名组件
EOF</span>

<span class="comment"># 发布到 Skill Base</span>
<span class="command">skb</span> <span class="flag">publish</span>

<span class="output">✓ Published my-team-skill@v20240320.150000</span>
            </div>
          </div>
        </div>

        <div id="tab-ide" class="tab-content">
          <div class="code-block">
            <div class="code-header">
              <div class="code-dots">
                <span class="code-dot red"></span>
                <span class="code-dot yellow"></span>
                <span class="code-dot green"></span>
              </div>
              <button class="code-copy">Copy</button>
            </div>
            <div class="code-body">
<span class="comment"># 安装 Skill 到 Cursor</span>
<span class="command">skb</span> <span class="flag">install</span> <span class="string">my-skill</span> <span class="flag">--ide</span> <span class="string">cursor</span>
<span class="output">✓ Installed to .cursor/skills/my-skill/</span>

<span class="comment"># 安装到 Qoder</span>
<span class="command">skb</span> <span class="flag">install</span> <span class="string">my-skill</span> <span class="flag">--ide</span> <span class="string">qoder</span>
<span class="output">✓ Installed to .qoder/skills/my-skill/</span>

<span class="comment"># 支持的 IDE: cursor, qoder, windsurf, copilot, claude-code, opencode</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <div class="section-divider"></div>

  <section class="philosophy" id="philosophy">
    <div class="container">
      <h2 class="section-title fade-in">设计哲学</h2>
      <p class="section-subtitle fade-in stagger-1">
        Build to Delete — 为删除而构建
      </p>

      <div class="philosophy-grid fade-in stagger-2" data-stagger-group>
        <div class="philosophy-item fade-in">
          <h3>纯粹的搬运工</h3>
          <p>Skill Base 只做一件事：把 Skill 从服务器搬到你的项目里。不做解析，不做转换，原封不动。</p>
        </div>

        <div class="philosophy-item fade-in">
          <h3>极简优先</h3>
          <p>能用一个文件搞定的，绝不引入两个。SQLite + 单文件部署，就是这么任性。</p>
        </div>

        <div class="philosophy-item fade-in">
          <h3>本地优先</h3>
          <p>所有数据都在你本地。不想用云？断网也能跑。不想升级？永不更新也能用。</p>
        </div>
      </div>
    </div>
  </section>

  <footer class="footer">
    <div class="container">
      <div class="footer-content">
        <div class="footer-logo">
          <span class="nav-logo">$ Skill Base</span>
          <p>专为小团队打造的 AI Agent Skill 私有化管理平台</p>
        </div>
        <div class="footer-links">
          <a href="https://github.com" target="_blank">GitHub</a>
          <a href="#features">文档</a>
          <a href="#philosophy">关于</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>Open Source · Made for developers</p>
      </div>
    </div>
  </footer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.body.classList.add('landing-body')
  initTypewriter()
  initScrollAnimations()
  initTabs()
  initCopyButtons()
})

onUnmounted(() => {
  document.body.classList.remove('landing-body')
})

function initTypewriter() {
  const terminalBody = document.getElementById('hero-terminal-body')
  if (!terminalBody) return

  interface TerminalLine {
    type: string
    prompt?: string
    text: string
    class?: string
    delay?: number
  }

  const lines: TerminalLine[] = [
    { type: 'command', prompt: '~', text: 'npx skill-base -p 8000', delay: 80 },
    { type: 'output', text: '', delay: 500 },
    { type: 'output', text: 'Starting Skill Base...', class: 'info', delay: 30 },
    { type: 'output', text: '', delay: 300 },
    { type: 'output', text: '✓ Database initialized', class: 'success', delay: 30 },
    { type: 'output', text: '✓ Routes registered', class: 'success', delay: 30 },
    { type: 'output', text: '✓ Static files mounted', class: 'success', delay: 30 },
    { type: 'output', text: '', delay: 200 },
    { type: 'output', text: 'Server running at http://localhost:8000', class: 'warning', delay: 30 },
    { type: 'output', text: 'Ready to manage your AI skills!', class: 'info', delay: 30 },
  ]

  let lineIndex = 0
  let charIndex = 0
  let currentLine: HTMLElement | null = null

  function createLine(lineData: TerminalLine) {
    const lineEl = document.createElement('div')
    lineEl.className = 'terminal-line'

    if (lineData.type === 'command') {
      lineEl.innerHTML = `
        <span class="terminal-prompt">${lineData.prompt} $</span>
        <span class="terminal-command"></span>
      `
    } else {
      const classList = ['terminal-output']
      if (lineData.class) classList.push(lineData.class)
      lineEl.innerHTML = `<span class="${classList.join(' ')}"></span>`
    }

    return lineEl
  }

  function typeChar() {
    if (lineIndex >= lines.length) {
      const cursorLine = document.createElement('div')
      cursorLine.className = 'terminal-line'
      cursorLine.innerHTML = '<span class="terminal-prompt">~ $</span><span class="cursor"></span>'
      terminalBody?.appendChild(cursorLine)
      return
    }

    const lineData = lines[lineIndex]
    if (!lineData) return

    if (!currentLine) {
      currentLine = createLine(lineData)
      terminalBody?.appendChild(currentLine)

      if (!lineData.text) {
        lineIndex++
        currentLine = null
        setTimeout(typeChar, lineData.delay || 100)
        return
      }
    }

    const textEl = lineData.type === 'command'
      ? currentLine.querySelector('.terminal-command')
      : currentLine.querySelector('.terminal-output')

    if (textEl && charIndex < lineData.text.length) {
      textEl.textContent += lineData.text[charIndex]
      charIndex++
      setTimeout(typeChar, lineData.delay || 50)
    } else {
      lineIndex++
      charIndex = 0
      currentLine = null
      setTimeout(typeChar, 150)
    }
  }

  setTimeout(typeChar, 800)
}

function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1,
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  }, observerOptions)

  document.querySelectorAll('.fade-in').forEach((el) => {
    observer.observe(el)
  })
}

function initTabs() {
  const tabs = document.querySelectorAll('.tab')
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab')
      if (!tabId) return

      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'))
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'))

      tab.classList.add('active')
      const content = document.getElementById(tabId)
      if (content) content.classList.add('active')
    })
  })
}

function initCopyButtons() {
  document.querySelectorAll('.code-copy').forEach((btn) => {
    btn.addEventListener('click', () => {
      const codeBlock = btn.closest('.code-block')
      const codeBody = codeBlock?.querySelector('.code-body')
      if (codeBody) {
        const text = codeBody.textContent || ''
        navigator.clipboard.writeText(text)
        btn.textContent = 'Copied!'
        setTimeout(() => {
          btn.textContent = 'Copy'
        }, 1500)
      }
    })
  })

  const heroCopyBtn = document.getElementById('hero-copy-btn')
  if (heroCopyBtn) {
    heroCopyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText('npx skill-base')
      heroCopyBtn.classList.add('copied')
      setTimeout(() => {
        heroCopyBtn.classList.remove('copied')
      }, 1500)
    })
  }
}
</script>

<style scoped>
/* ============================================
   Skill Base Landing Page - Terminal Industrial Style
   ============================================ */

/* ===== CSS Variables ===== */
.landing-page {
  --bg-primary: #0a0a0f;
  --bg-secondary: #12121a;
  --bg-card: #1a1a2e;
  --bg-terminal: #0d1117;
  --text-primary: #e8e8f0;
  --text-secondary: #8888a0;
  --accent-green: #00ff88;
  --accent-green-dim: #00cc6a;
  --accent-amber: #ffb800;
  --accent-blue: #5888ff;
  --border-color: #2a2a3e;
  --gradient-green: linear-gradient(135deg, #00ff88, #00cc6a);
  
  --font-mono: 'JetBrains Mono', monospace;
  --font-sans: 'DM Sans', sans-serif;
  
  --max-width: 1200px;
  --section-padding: 120px 0;

  font-family: var(--font-sans);
  color: var(--text-primary);
}

/* ===== Reset & Base ===== */
.landing-page,
.landing-page *,
.landing-page *::before,
.landing-page *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* ===== Typography ===== */
.landing-page h1, .landing-page h2, .landing-page h3, .landing-page h4 {
  font-family: var(--font-mono);
  font-weight: 700;
  line-height: 1.2;
}

.landing-page h1 {
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  letter-spacing: -0.02em;
}

.landing-page h2 {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
  margin-bottom: 1rem;
}

.landing-page h3 {
  font-size: clamp(1.2rem, 2vw, 1.5rem);
}

.landing-page p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.landing-page a {
  color: var(--accent-green);
  text-decoration: none;
  transition: color 0.3s ease;
}

.landing-page a:hover {
  color: var(--accent-green-dim);
}

/* ===== Layout ===== */
.landing-page .container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 24px;
}

.landing-page section {
  padding: var(--section-padding);
  position: relative;
}

/* Section divider */
.landing-page .section-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--border-color), var(--accent-green-dim), var(--border-color), transparent);
  margin: 0 auto;
  max-width: 800px;
}

/* Section title with terminal prompt */
.landing-page .section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 1.5rem;
}

.landing-page .section-title::before {
  content: '$';
  font-family: var(--font-mono);
  color: var(--accent-green);
  font-size: 1.5rem;
}

.landing-page .section-subtitle {
  color: var(--text-secondary);
  font-size: 1.2rem;
  max-width: 600px;
  margin-bottom: 3rem;
}

/* ===== Animations ===== */
.landing-page .fade-in {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}

.landing-page .fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Stagger delays */
.landing-page .stagger-1 { transition-delay: 0.1s; }
.landing-page .stagger-2 { transition-delay: 0.2s; }
.landing-page .stagger-3 { transition-delay: 0.3s; }
.landing-page .stagger-4 { transition-delay: 0.4s; }
.landing-page .stagger-5 { transition-delay: 0.5s; }
.landing-page .stagger-6 { transition-delay: 0.6s; }

/* ===== Navbar ===== */
.landing-page .navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  background: rgba(10, 10, 15, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  height: 64px;
}

.landing-page .navbar .container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
}

.landing-page .nav-logo {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--accent-green);
  text-decoration: none;
}

.landing-page .nav-logo:hover {
  color: var(--accent-green);
}

.landing-page .nav-links {
  display: flex;
  align-items: center;
  gap: 32px;
}

.landing-page .nav-links a {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.landing-page .nav-links a:hover {
  color: var(--text-primary);
}

.landing-page .nav-cta {
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  font-family: var(--font-mono);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--accent-green);
  border: 1px solid var(--accent-green);
  border-radius: 6px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.landing-page .nav-cta:hover {
  background: rgba(0, 255, 136, 0.1);
  color: var(--accent-green);
}

/* ===== Hero Section ===== */
.landing-page .hero {
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding-top: 124px;
  position: relative;
  overflow: hidden;
}

.landing-page .hero-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.landing-page .hero-text {
  z-index: 2;
}

.landing-page .hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--accent-green);
  margin-bottom: 24px;
}

.landing-page .hero-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  background: var(--accent-green);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.landing-page .hero h1 {
  margin-bottom: 16px;
}

.landing-page .hero h1 .highlight {
  background: var(--gradient-green);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.landing-page .hero-subtitle {
  font-size: 1.4rem;
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-weight: 500;
}

.landing-page .hero-description {
  font-size: 1.15rem;
  color: var(--text-secondary);
  margin-bottom: 32px;
  max-width: 500px;
}

.landing-page .hero-cta {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.landing-page .btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.landing-page .btn-primary {
  background: var(--gradient-green);
  color: var(--bg-primary);
}

.landing-page .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 255, 136, 0.3);
}

.landing-page .btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.landing-page .btn-secondary:hover {
  border-color: var(--accent-green);
  color: var(--accent-green);
}

.landing-page .copy-btn {
  background: var(--bg-terminal);
  border: 1px solid var(--border-color);
  color: var(--accent-green);
  font-family: var(--font-mono);
  position: relative;
}

.landing-page .copy-btn:hover {
  border-color: var(--accent-green);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
}

.landing-page .copy-btn .copy-icon {
  width: 16px;
  height: 16px;
  opacity: 0.7;
}

.landing-page .copy-btn.copied::after {
  content: 'Copied!';
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent-green);
  color: var(--bg-primary);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.8rem;
  animation: fadeOut 1.5s forwards;
}

@keyframes fadeOut {
  0%, 70% { opacity: 1; }
  100% { opacity: 0; }
}

/* Hero Terminal */
.landing-page .hero-terminal {
  position: relative;
  z-index: 2;
}

.landing-page .terminal {
  background: var(--bg-terminal);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.landing-page .terminal-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid var(--border-color);
}

.landing-page .terminal-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.landing-page .terminal-dot.red { background: #ff5f57; }
.landing-page .terminal-dot.yellow { background: #febc2e; }
.landing-page .terminal-dot.green { background: #28c840; }

.landing-page .terminal-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.landing-page .terminal-body {
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.8;
  min-height: 280px;
  position: relative;
}

/* Terminal scanline effect */
.landing-page .terminal-body::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 136, 0.02) 2px,
    rgba(0, 255, 136, 0.02) 4px
  );
  pointer-events: none;
}

.landing-page .terminal-line {
  display: flex;
  margin-bottom: 4px;
}

.landing-page .terminal-prompt {
  color: var(--accent-green);
  margin-right: 8px;
}

.landing-page .terminal-command {
  color: var(--text-primary);
}

.landing-page .terminal-output {
  color: var(--text-secondary);
  margin-left: 20px;
}

.landing-page .terminal-output.success {
  color: var(--accent-green);
}

.landing-page .terminal-output.info {
  color: var(--accent-blue);
}

.landing-page .terminal-output.warning {
  color: var(--accent-amber);
}

.landing-page .cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background: var(--accent-green);
  margin-left: 4px;
  animation: blink 1s infinite;
  vertical-align: middle;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* ===== What is Agent Skill Section ===== */
.landing-page .what-is-skill {
  background: var(--bg-secondary);
}

.landing-page .comparison-grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 30px;
  align-items: stretch;
  margin-top: 40px;
}

.landing-page .comparison-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
}

.landing-page .comparison-card.before {
  border-color: rgba(255, 88, 88, 0.3);
}

.landing-page .comparison-card.after {
  border-color: rgba(0, 255, 136, 0.3);
}

.landing-page .comparison-label {
  padding: 12px 20px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.landing-page .comparison-card.before .comparison-label {
  background: rgba(255, 88, 88, 0.1);
  color: #ff5858;
}

.landing-page .comparison-card.after .comparison-label {
  background: rgba(0, 255, 136, 0.1);
  color: var(--accent-green);
}

.landing-page .comparison-code {
  padding: 20px;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.7;
  color: var(--text-secondary);
}

.landing-page .comparison-arrow {
  display: flex;
  align-items: center;
  font-size: 2rem;
  color: var(--accent-green);
}

.landing-page .key-points {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  margin-top: 60px;
}

.landing-page .key-point {
  text-align: center;
  padding: 30px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.landing-page .key-point:hover {
  border-color: var(--accent-green);
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.1);
}

.landing-page .key-point-icon {
  margin-bottom: 16px;
  color: var(--accent-green);
  display: flex;
  align-items: center;
  justify-content: center;
}

.landing-page .key-point h4 {
  color: var(--text-primary);
  margin-bottom: 8px;
}

.landing-page .key-point p {
  font-size: 0.95rem;
}

.landing-page .conclusion {
  text-align: center;
  margin-top: 60px;
  padding: 40px;
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.05), rgba(88, 136, 255, 0.05));
  border: 1px solid var(--border-color);
  border-radius: 12px;
}

.landing-page .conclusion p {
  font-size: 1.3rem;
  color: var(--text-primary);
  font-family: var(--font-mono);
}

.landing-page .conclusion .highlight {
  color: var(--accent-green);
}

/* ===== Why Skill Base Section ===== */
.landing-page .pain-points {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-top: 50px;
}

.landing-page .pain-point {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 40px 30px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.landing-page .pain-point::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 4px;
  background: var(--gradient-green);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
}

.landing-page .pain-point:hover::before {
  transform: scaleX(1);
}

.landing-page .pain-point:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.landing-page .pain-point-number {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--accent-green);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.landing-page .pain-point-number::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--border-color);
}

.landing-page .pain-point h3 {
  color: var(--text-primary);
  margin-bottom: 16px;
  font-size: 1.3rem;
}

.landing-page .pain-point .problem {
  color: var(--text-secondary);
  font-size: 0.95rem;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}

.landing-page .pain-point .solution {
  color: var(--accent-green);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.landing-page .pain-point .solution::before {
  content: '→';
}

/* ===== Features Section ===== */
.landing-page .features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 24px;
  margin-top: 50px;
}

.landing-page .feature-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.landing-page .feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at center, rgba(0, 255, 136, 0.1), transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.landing-page .feature-card:hover::before {
  opacity: 1;
}

.landing-page .feature-card:hover {
  border-color: var(--accent-green);
  box-shadow: 0 0 40px rgba(0, 255, 136, 0.15);
  transform: translateY(-5px);
}

.landing-page .feature-icon {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--accent-green);
}

.landing-page .feature-card h3 {
  color: var(--text-primary);
  margin-bottom: 12px;
  font-size: 1.1rem;
}

.landing-page .feature-card p {
  font-size: 0.9rem;
  line-height: 1.5;
}

/* ===== Quick Start Section ===== */
.landing-page .quick-start {
  background: var(--bg-secondary);
}

.landing-page .tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--bg-card);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  width: fit-content;
}

.landing-page .tab {
  padding: 12px 24px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.landing-page .tab:hover {
  color: var(--text-primary);
}

.landing-page .tab.active {
  background: var(--bg-terminal);
  color: var(--accent-green);
}

.landing-page .tab-content {
  display: none;
}

.landing-page .tab-content.active {
  display: block;
}

.landing-page .code-block {
  background: var(--bg-terminal);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
}

.landing-page .code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid var(--border-color);
}

.landing-page .code-dots {
  display: flex;
  gap: 8px;
}

.landing-page .code-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.landing-page .code-dot.red { background: #ff5f57; }
.landing-page .code-dot.yellow { background: #febc2e; }
.landing-page .code-dot.green { background: #28c840; }

.landing-page .code-copy {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.landing-page .code-copy:hover {
  border-color: var(--accent-green);
  color: var(--accent-green);
}

.landing-page .code-body {
  padding: 24px;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-x: auto;
  position: relative;
}

/* Scanline effect for code blocks */
.landing-page .code-body::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 136, 0.015) 2px,
    rgba(0, 255, 136, 0.015) 4px
  );
  pointer-events: none;
}

/* Syntax highlighting */
.landing-page .code-body .comment { color: #6a737d; }
.landing-page .code-body .keyword { color: #ff7b72; }
.landing-page .code-body .string { color: #a5d6ff; }
.landing-page .code-body .function { color: #d2a8ff; }
.landing-page .code-body .variable { color: #ffa657; }
.landing-page .code-body .command { color: var(--accent-green); }
.landing-page .code-body .flag { color: var(--accent-amber); }
.landing-page .code-body .output { color: var(--text-secondary); }

/* ===== Philosophy Section ===== */
.landing-page .philosophy-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-top: 50px;
}

.landing-page .philosophy-item {
  padding: 30px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.landing-page .philosophy-item:hover {
  border-color: var(--accent-green-dim);
}

.landing-page .philosophy-item h3 {
  color: var(--accent-green);
  margin-bottom: 12px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.landing-page .philosophy-item h3::before {
  content: '>';
  color: var(--accent-amber);
}

.landing-page .philosophy-quote {
  text-align: center;
  margin-top: 60px;
  padding: 50px;
  background: linear-gradient(135deg, rgba(0, 255, 136, 0.03), rgba(255, 184, 0, 0.03));
  border: 1px solid var(--border-color);
  border-radius: 16px;
  position: relative;
}

.landing-page .philosophy-quote::before {
  content: '"';
  position: absolute;
  top: 20px;
  left: 30px;
  font-size: 4rem;
  color: var(--accent-green);
  opacity: 0.3;
  font-family: serif;
}

.landing-page .philosophy-quote p {
  font-size: 1.5rem;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-weight: 500;
}

.landing-page .philosophy-quote .author {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-top: 16px;
}

/* ===== Footer ===== */
.landing-page .footer {
  background: var(--bg-secondary);
  padding: 60px 0 40px;
  border-top: 1px solid var(--border-color);
}

.landing-page .footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.landing-page .footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.landing-page .footer-logo {
  font-family: var(--font-mono);
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
}

.landing-page .footer-links {
  display: flex;
  gap: 30px;
}

.landing-page .footer-link {
  color: var(--text-secondary);
  font-size: 0.95rem;
  transition: color 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.landing-page .footer-link:hover {
  color: var(--accent-green);
}

.landing-page .footer-bottom {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.landing-page .footer-bottom p {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.landing-page .footer-bottom .heart {
  color: #ff5858;
}

/* ===== Lucide SVG Icons ===== */
.landing-page .lucide-icon {
  display: inline-block;
  vertical-align: middle;
}

/* ===== Responsive Design ===== */
@media (max-width: 1024px) {
  .landing-page .hero-content {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .landing-page .hero-terminal {
    max-width: 600px;
  }
  
  .landing-page .comparison-grid {
    grid-template-columns: 1fr;
    gap: 20px;
  }
  
  .landing-page .comparison-arrow {
    transform: rotate(90deg);
    justify-content: center;
  }
  
  .landing-page .pain-points {
    grid-template-columns: 1fr;
  }
  
  .landing-page .key-points {
    grid-template-columns: 1fr;
  }
  
  .landing-page .philosophy-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .landing-page {
    --section-padding: 80px 0;
  }
  
  .landing-page .nav-links {
    display: none;
  }
  
  .landing-page .hero {
    min-height: auto;
    padding: 124px 0 60px;
  }
  
  .landing-page .hero-cta {
    flex-direction: column;
  }
  
  .landing-page .btn {
    width: 100%;
    justify-content: center;
  }
  
  .landing-page .features-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .landing-page .tabs {
    width: 100%;
    overflow-x: auto;
    border-radius: 12px 12px 0 0;
  }
  
  .landing-page .tab {
    white-space: nowrap;
    padding: 10px 16px;
    font-size: 0.8rem;
  }
  
  .landing-page .code-block {
    border-radius: 0 0 12px 12px;
  }
  
  .landing-page .footer-content {
    flex-direction: column;
    text-align: center;
  }
  
  .landing-page .footer-links {
    flex-direction: column;
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .landing-page .features-grid {
    grid-template-columns: 1fr;
  }
  
  .landing-page .hero-badge {
    font-size: 0.75rem;
  }
  
  .landing-page .terminal-body {
    font-size: 0.8rem;
    padding: 16px;
  }
  
  .landing-page .philosophy-quote p {
    font-size: 1.2rem;
  }
}
</style>