(() => {
  const DEFAULT_ITEMS = [
    { href: '/', label: 'Home', i18n: 'nav.home' },
    { href: '/publish.html', label: 'Publish', i18n: 'nav.publish' }
  ];

  function normalizePath(path) {
    if (!path) return '/';
    const [cleanPath] = path.split(/[?#]/);
    const normalized = cleanPath
      .replace(/\/index\.html$/, '/')
      .replace(/\/+$/, '');

    return normalized || '/';
  }

  function isActiveItem(href, currentPath) {
    return normalizePath(href) === normalizePath(currentPath);
  }

  class SkillBaseNav extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready === 'true') return;
      this.dataset.ready = 'true';
      this.render();
      this.bindEvents();
    }

    get navItems() {
      const raw = this.getAttribute('items');
      if (!raw) return DEFAULT_ITEMS;

      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_ITEMS;
      } catch (_) {
        return DEFAULT_ITEMS;
      }
    }

    get currentPath() {
      return this.getAttribute('current-path') || window.location.pathname || '/';
    }

    renderLinks(items, currentPath, isMobile) {
      return items.map((item) => {
        const active = isActiveItem(item.href, currentPath);
        const label = item.label || item.href;
        const i18nAttr = item.i18n ? ` data-i18n="${item.i18n}"` : '';

        if (isMobile) {
          return `
            <a href="${item.href}" class="sb-nav-mobile-link${active ? ' is-active' : ''}"${i18nAttr}>
              <span class="sb-nav-mobile-marker">${active ? './' : '--'}</span>
              <span>${label}</span>
            </a>
          `;
        }

        return `
          <a href="${item.href}" class="sb-nav-link${active ? ' is-active' : ''}"${i18nAttr}>
            <span class="sb-nav-link-prefix">${active ? './' : ''}</span>
            <span>${label}</span>
          </a>
        `;
      }).join('');
    }

    render() {
      const items = this.navItems;
      const currentPath = this.currentPath;

      this.innerHTML = `
        <style>
          skill-base-nav {
            display: block;
          }

          skill-base-nav .navbar .container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1rem;
            min-height: 4rem;
          }

          skill-base-nav .sb-nav-main {
            display: flex;
            align-items: center;
            gap: 2rem;
            min-width: 0;
          }

          skill-base-nav .sb-nav-brand {
            display: inline-flex;
            align-items: center;
            gap: 0.625rem;
            text-decoration: none;
            white-space: nowrap;
          }

          skill-base-nav .sb-nav-brand-icon {
            color: #00FFA3;
            filter: drop-shadow(0 0 8px rgba(0, 255, 163, 0.4));
            flex-shrink: 0;
          }

          skill-base-nav .sb-nav-links {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          skill-base-nav .sb-nav-link,
          skill-base-nav .sb-nav-mobile-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            text-decoration: none;
            font-family: 'JetBrains Mono', monospace;
            transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
          }

          skill-base-nav .sb-nav-link {
            color: #a1a1aa;
            font-size: 0.875rem;
            padding: 0.35rem 0.6rem;
            border-radius: 0.5rem;
          }

          skill-base-nav .sb-nav-link:hover,
          skill-base-nav .sb-nav-link:focus-visible {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.03);
            outline: none;
          }

          skill-base-nav .sb-nav-link.is-active {
            color: #ffffff;
            background: linear-gradient(180deg, rgba(0, 255, 163, 0.08), rgba(255, 255, 255, 0.02));
            box-shadow: inset 0 0 0 1px rgba(0, 255, 163, 0.12);
          }

          skill-base-nav .sb-nav-link-prefix,
          skill-base-nav .sb-nav-mobile-marker {
            min-width: 1.5rem;
            color: #00FFA3;
          }

          skill-base-nav .sb-nav-controls {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-shrink: 0;
          }

          skill-base-nav .sb-nav-toggle {
            display: none;
            align-items: center;
            justify-content: center;
            width: 2.5rem;
            height: 2.5rem;
            border: 1px solid #27272a;
            border-radius: 0.75rem;
            background: rgba(19, 20, 26, 0.84);
            color: #e4e4e7;
            transition: all 0.2s ease;
          }

          skill-base-nav .sb-nav-toggle:hover,
          skill-base-nav .sb-nav-toggle:focus-visible {
            border-color: #00E592;
            color: #00FFA3;
            outline: none;
            box-shadow: 0 0 0 1px rgba(0, 255, 163, 0.2);
          }

          skill-base-nav .sb-nav-mobile {
            display: none;
            padding: 0 1rem 1rem;
          }

          skill-base-nav .sb-nav-mobile-panel {
            border: 1px solid rgba(39, 39, 42, 0.9);
            border-radius: 1rem;
            background:
              linear-gradient(180deg, rgba(19, 20, 26, 0.98), rgba(9, 9, 11, 0.98));
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
            overflow: hidden;
          }

          skill-base-nav .sb-nav-mobile-links {
            display: grid;
            gap: 0;
            padding: 0.5rem;
          }

          skill-base-nav .sb-nav-mobile-link {
            color: #a1a1aa;
            padding: 0.875rem 0.9rem;
            border-radius: 0.75rem;
          }

          skill-base-nav .sb-nav-mobile-link.is-active {
            color: #ffffff;
            background: rgba(0, 255, 163, 0.08);
          }

          skill-base-nav .sb-nav-mobile-link:hover,
          skill-base-nav .sb-nav-mobile-link:focus-visible {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.04);
            outline: none;
          }

          skill-base-nav .navbar-user {
            display: flex;
            align-items: center;
            gap: 1rem;
            font-family: 'JetBrains Mono', monospace;
            font-size: 0.75rem;
          }

          @media (max-width: 767px) {
            skill-base-nav .sb-nav-links {
              display: none;
            }

            skill-base-nav .sb-nav-toggle,
            skill-base-nav .sb-nav-mobile {
              display: flex;
            }

            skill-base-nav .navbar-user {
              gap: 0.5rem;
            }
          }
        </style>

        <nav class="navbar sticky top-0 z-50 bg-base-950/80 backdrop-blur-md border-b border-base-800">
          <div class="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="sb-nav-main">
              <a href="/" class="sb-nav-brand text-lg tracking-tight select-none cursor-pointer">
                <svg class="sb-nav-brand-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
                <span class="font-mono text-neon-400 font-bold drop-shadow-[0_0_8px_rgba(0,255,163,0.4)]">Skill</span>
                <span class="text-white font-bold">Base</span>
              </a>

              <div class="sb-nav-links">
                ${this.renderLinks(items, currentPath, false)}
              </div>
            </div>

            <div class="sb-nav-controls">
              <button type="button" class="sb-nav-toggle" aria-expanded="false" aria-label="Toggle navigation">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="4" y1="7" x2="20" y2="7"></line>
                  <line x1="4" y1="12" x2="20" y2="12"></line>
                  <line x1="4" y1="17" x2="20" y2="17"></line>
                </svg>
              </button>
              <div class="navbar-user"></div>
            </div>
          </div>

          <div class="sb-nav-mobile" hidden>
            <div class="sb-nav-mobile-panel">
              <div class="sb-nav-mobile-links">
                ${this.renderLinks(items, currentPath, true)}
              </div>
            </div>
          </div>
        </nav>
      `;
    }

    bindEvents() {
      const toggle = this.querySelector('.sb-nav-toggle');
      const mobile = this.querySelector('.sb-nav-mobile');
      if (!toggle || !mobile) return;

      const closeMenu = () => {
        mobile.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
      };

      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const nextState = toggle.getAttribute('aria-expanded') !== 'true';
        mobile.hidden = !nextState;
        toggle.setAttribute('aria-expanded', String(nextState));
      });

      mobile.addEventListener('click', (event) => {
        if (event.target.closest('a')) {
          closeMenu();
        }
      });

      document.addEventListener('click', (event) => {
        if (!this.contains(event.target)) {
          closeMenu();
        }
      });

      window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) {
          closeMenu();
        }
      });
    }
  }

  if (!customElements.get('skill-base-nav')) {
    customElements.define('skill-base-nav', SkillBaseNav);
  }
})();
