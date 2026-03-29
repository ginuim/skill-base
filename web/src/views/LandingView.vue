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
      <a href="/login" class="nav-cta">进入平台 →</a>
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
import '@/assets/landing.css'

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
