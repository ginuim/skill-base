/* ============================================
   Skill Base Landing Page - JavaScript
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initTypewriter();
  initScrollAnimations();
  initTabs();
  initCopyButtons();
});

/* ===== Typewriter Effect for Hero Terminal ===== */
function initTypewriter() {
  const terminalBody = document.getElementById('hero-terminal-body');
  if (!terminalBody) return;

  const lines = [
    { type: 'command', prompt: '~', text: 'npx skill-base -p 8000', delay: 80 },
    { type: 'output', text: '', delay: 500 },
    { type: 'output', class: 'info', text: '🚀 Starting Skill Base...', delay: 30 },
    { type: 'output', text: '', delay: 300 },
    { type: 'output', text: '   _____ __   _ ____   ____                ', delay: 5 },
    { type: 'output', text: '  / ___// /__(_) / /  / __ )____ _________', delay: 5 },
    { type: 'output', text: '  \\__ \\/ //_/ / / /  / __  / __ `/ ___/ _ \\', delay: 5 },
    { type: 'output', text: ' ___/ / ,< / / / /  / /_/ / /_/ (__  )  __/', delay: 5 },
    { type: 'output', text: '/____/_/|_/_/_/_/  /_____/\\__,_/____/\\___/ ', delay: 5 },
    { type: 'output', text: '', delay: 200 },
    { type: 'output', class: 'success', text: '✓ Database initialized', delay: 30 },
    { type: 'output', class: 'success', text: '✓ Routes registered', delay: 30 },
    { type: 'output', class: 'success', text: '✓ Static files mounted', delay: 30 },
    { type: 'output', text: '', delay: 200 },
    { type: 'output', class: 'warning', text: '⚡ Server running at http://localhost:8000', delay: 30 },
    { type: 'output', class: 'info', text: '📦 Ready to manage your AI skills!', delay: 30 },
  ];

  let lineIndex = 0;
  let charIndex = 0;
  let currentLine = null;

  function createLine(lineData) {
    const lineEl = document.createElement('div');
    lineEl.className = 'terminal-line';
    
    if (lineData.type === 'command') {
      lineEl.innerHTML = `
        <span class="terminal-prompt">${lineData.prompt} $</span>
        <span class="terminal-command"></span>
      `;
    } else {
      const classList = ['terminal-output'];
      if (lineData.class) classList.push(lineData.class);
      lineEl.innerHTML = `<span class="${classList.join(' ')}"></span>`;
    }
    
    return lineEl;
  }

  function typeChar() {
    if (lineIndex >= lines.length) {
      // Add blinking cursor at the end
      const cursorLine = document.createElement('div');
      cursorLine.className = 'terminal-line';
      cursorLine.innerHTML = '<span class="terminal-prompt">~ $</span><span class="cursor"></span>';
      terminalBody.appendChild(cursorLine);
      return;
    }

    const lineData = lines[lineIndex];
    
    if (!currentLine) {
      currentLine = createLine(lineData);
      terminalBody.appendChild(currentLine);
      
      // For empty lines, move to next immediately
      if (!lineData.text) {
        lineIndex++;
        currentLine = null;
        setTimeout(typeChar, lineData.delay || 100);
        return;
      }
    }

    const textEl = lineData.type === 'command' 
      ? currentLine.querySelector('.terminal-command')
      : currentLine.querySelector('.terminal-output');

    if (charIndex < lineData.text.length) {
      textEl.textContent += lineData.text[charIndex];
      charIndex++;
      setTimeout(typeChar, lineData.delay || 50);
    } else {
      // Line complete, move to next
      lineIndex++;
      charIndex = 0;
      currentLine = null;
      setTimeout(typeChar, 150);
    }
  }

  // Start typing after a short delay
  setTimeout(typeChar, 800);
}

/* ===== Scroll Animations with IntersectionObserver ===== */
function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -50px 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        // Optionally unobserve after animation
        // observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all elements with fade-in class
  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
  });

  // Add stagger delays to grouped elements
  document.querySelectorAll('[data-stagger-group]').forEach(group => {
    const children = group.querySelectorAll('.fade-in');
    children.forEach((child, index) => {
      child.style.transitionDelay = `${index * 0.1}s`;
    });
  });
}

/* ===== Tab Switching for Code Examples ===== */
function initTabs() {
  const tabButtons = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetId = button.dataset.tab;

      // Remove active class from all tabs and contents
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));

      // Add active class to clicked tab and corresponding content
      button.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

/* ===== Copy Button Functionality ===== */
function initCopyButtons() {
  // Hero copy button
  const heroCopyBtn = document.getElementById('hero-copy-btn');
  if (heroCopyBtn) {
    heroCopyBtn.addEventListener('click', () => {
      copyToClipboard('npx skill-base', heroCopyBtn);
    });
  }

  // Code block copy buttons
  document.querySelectorAll('.code-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const codeBlock = btn.closest('.code-block');
      const codeBody = codeBlock.querySelector('.code-body');
      // Get text content without HTML tags
      const codeText = codeBody.textContent.trim();
      copyToClipboard(codeText, btn);
    });
  });
}

function copyToClipboard(text, button) {
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    button.classList.add('copied');
    
    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 1500);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

/* ===== Smooth Scroll for Anchor Links ===== */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

/* ===== Parallax Effect for Background (Optional Enhancement) ===== */
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const scrollY = window.scrollY;
      // Subtle parallax for hero section
      const hero = document.querySelector('.hero');
      if (hero && scrollY < window.innerHeight) {
        hero.style.transform = `translateY(${scrollY * 0.3}px)`;
        hero.style.opacity = 1 - (scrollY / window.innerHeight) * 0.3;
      }
      ticking = false;
    });
    ticking = true;
  }
});
