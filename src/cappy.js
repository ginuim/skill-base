const readline = require('readline');

function detectSystemLanguage() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

class CappyMascot {
  static detectSystemLanguage() {
    return detectSystemLanguage();
  }

  constructor(port, basePath = '/', language = detectSystemLanguage()) {
    this.port = port;
    this.basePath = basePath;
    this.lang = language === 'zh' ? 'zh' : 'en';
    this.frameTimer = null;
    this.sceneTimer = null;
    this.lastRenderHeight = 0;
    this.currentSceneKey = null;
    this.isRunning = false;
    this.isStopped = false;
    this.cursorHidden = false;

    this.colors = {
      warm: '\x1b[38;5;221m',
      orange: '\x1b[38;5;214m',
      cyan: '\x1b[38;5;117m',
      pink: '\x1b[38;5;218m',
      soft: '\x1b[38;5;188m',
      reset: '\x1b[0m'
    };

    this.text = {
      intro: {
        zh: `Skill Base 正在预热，端口 ${port} 已就绪。`,
        en: `Skill Base is warming up; port ${port} is live.`
      },
      idle: [
        {
          zh: `Cappy 正盯着端口 ${port}。`,
          en: `Cappy is staring at port ${port}.`
        },
        {
          zh: '一切安静。没有过度设计，就没有运行时焦虑。',
          en: 'All quiet. No over-engineering, no runtime anxiety.'
        },
        {
          zh: '技能库很平静。代码直接，系统就稳。',
          en: 'The skill library is calm. Straightforward code brings that peace.'
        },
        {
          zh: '系统稳定。Cappy 讨厌没有意义的复杂度。',
          en: 'System stable. Cappy despises pointless complexity.'
        }
      ],
      blink: [
        {
          zh: '慢慢眨眼。不是摸鱼，是低成本巡逻。',
          en: 'Slow blink. Not slacking—low-cost patrolling.'
        },
        {
          zh: '写简单代码，比堆一堆监控脚本更靠谱。',
          en: 'Better to write simple code than to pile on monitoring scripts.'
        }
      ],
      think: [
        {
          zh: '简单架构才会赢。真正的稳定不靠花哨设计。',
          en: 'Simple architecture wins. Real stability needs no fancy design.'
        },
        {
          zh: '在思考。直接把代码写明白，胜过自作聪明的抽象层。',
          en: 'Thinking. Writing code directly beats clever layers of abstraction.'
        }
      ],
      soak: [
        {
          zh: '数据结构一旦对了，逻辑自然像水一样流动。',
          en: 'Get the data structures right and the logic flows like water.'
        },
        {
          zh: '先泡一会儿。别猜未来需求，YAGNI 就够了。',
          en: 'Let it soak in. Do not guess future needs—YAGNI.'
        }
      ],
      scout: [
        {
          zh: '出去转一圈，确认没人又开始过度设计。',
          en: 'Short walk. Checking no one over-engineered anything.'
        },
        {
          zh: '不要多余动作，只做有意义的移动。代码也该这样。',
          en: 'No extra steps. Only moves that matter. Code should be the same.'
        }
      ],
      work: {
        zh: '收到任务。Cappy 会用最朴素的办法处理。',
        en: 'Task received. Cappy is handling it the plain way.'
      },
      actionFallback: {
        zh: '有新情况发生了，Cappy 继续稳住。',
        en: 'Something new happened; Cappy stays steady.'
      },
      goodbye: {
        zh: 'Cappy 下班了，明天见。',
        en: 'Cappy is off duty. See you tomorrow.'
      },
      footer: {
        zh: 'Cappy 值班中',
        en: 'Cappy on duty'
      }
    };

    // Scenes: personality + frames + messages.
    this.scenes = {
      intro: {
        frameDelay: 240,
        loops: 1,
        messages: [this.resolveMessage(this.text.intro)],
        frames: [
          { color: 'warm', sprite: this.createSprite('o o', '___', 'paw') },
          { color: 'orange', sprite: this.createSprite('- -', '___', 'paw') },
          { color: 'warm', sprite: this.createSprite('^ ^', '___', 'still') }
        ]
      },
      idle: {
        weight: 5,
        frameDelay: 320,
        loops: 4,
        messages: this.resolveMessages(this.text.idle),
        frames: [
          { color: 'warm', sprite: this.createSprite('o o', '___', 'still') },
          { color: 'warm', sprite: this.createSprite('o o', '___', 'breath') },
          { color: 'warm', sprite: this.createSprite('o o', '___', 'still') }
        ]
      },
      blink: {
        weight: 2,
        frameDelay: 180,
        loops: 2,
        messages: this.resolveMessages(this.text.blink),
        frames: [
          { color: 'warm', sprite: this.createSprite('o o', '___', 'still') },
          { color: 'warm', sprite: this.createSprite('- -', '___', 'still') },
          { color: 'warm', sprite: this.createSprite('o o', '___', 'still') }
        ]
      },
      think: {
        weight: 1,
        frameDelay: 280,
        loops: 3,
        messages: this.resolveMessages(this.text.think),
        frames: [
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'think-left') },
          { color: 'cyan', sprite: this.createSprite('^ ^', '___', 'think-mid') },
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'think-right') }
        ]
      },
      soak: {
        weight: 1,
        frameDelay: 340,
        loops: 3,
        messages: this.resolveMessages(this.text.soak),
        frames: [
          { color: 'pink', sprite: this.createSprite('^ ^', '~~~', 'steam-left') },
          { color: 'pink', sprite: this.createSprite('- -', '~~~', 'steam-mid') },
          { color: 'pink', sprite: this.createSprite('^ ^', '~~~', 'steam-right') }
        ]
      },
      scout: {
        weight: 1,
        frameDelay: 220,
        loops: 4,
        messages: this.resolveMessages(this.text.scout),
        frames: [
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'step-left') },
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'step-mid') },
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'step-right') }
        ]
      },
      work: {
        frameDelay: 180,
        loops: 6,
        messages: [this.resolveMessage(this.text.work)],
        frames: [
          { color: 'cyan', sprite: this.createSprite('> <', '===', 'spark-left') },
          { color: 'orange', sprite: this.createSprite('> <', '===', 'spark-right') }
        ]
      }
    };

    this.boundStop = this.stop.bind(this);
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isStopped = false;
    this.hideCursor();
    process.once('SIGINT', this.boundStop);
    process.once('SIGTERM', this.boundStop);

    this.playScene('intro', {
      onDone: () => this.scheduleNextIdle(600)
    });
  }

  action(message) {
    if (!this.isRunning || this.isStopped) return;

    this.playScene('work', {
      message: this.resolveMessage(message || this.text.actionFallback),
      onDone: () => this.scheduleNextIdle(600)
    });
  }

  stop() {
    if (this.isStopped) return;

    this.isStopped = true;
    this.isRunning = false;
    clearInterval(this.frameTimer);
    clearTimeout(this.sceneTimer);

    this.clearRender();
    const goodbyeMsg = this.resolveMessage(this.text.goodbye);
    const goodbyeWidth = this.getDisplayWidth(goodbyeMsg);
    const gBorder = '─'.repeat(goodbyeWidth + 2);
    const gSeg = goodbyeWidth + 1;
    const gLeft = Math.floor(gSeg / 2);
    const gRight = gSeg - gLeft;
    const goodbye = [
      `${this.colors.soft}  ╭${gBorder}╮${this.colors.reset}`,
      `${this.colors.soft}  │ ${this.padDisplay(goodbyeMsg, goodbyeWidth)} │${this.colors.reset}`,
      `${this.colors.soft}  ╰${'─'.repeat(gLeft)}┬${'─'.repeat(gRight)}╯${this.colors.reset}`,
      `${this.colors.warm}                 \\${this.colors.reset}`,
      `${this.colors.warm}                  __${this.colors.reset}`,
      `${this.colors.warm}              ___( ; ;)___${this.colors.reset}`,
      `${this.colors.warm}             /__         _\\${this.colors.reset}`,
      `${this.colors.warm}                /_/\\_\\${this.colors.reset}`
    ];

    process.stdout.write(`${goodbye.join('\n')}\n`);
    this.showCursor();
    process.exit(0);
  }

  scheduleNextIdle(delay = this.randomBetween(1400, 2800)) {
    clearTimeout(this.sceneTimer);
    this.sceneTimer = setTimeout(() => {
      const nextSceneKey = this.pickIdleScene();
      this.playScene(nextSceneKey, {
        onDone: () => this.scheduleNextIdle()
      });
    }, delay);
  }

  playScene(sceneKey, options = {}) {
    const scene = this.scenes[sceneKey];
    if (!scene || this.isStopped) return;

    clearInterval(this.frameTimer);
    clearTimeout(this.sceneTimer);

    this.currentSceneKey = sceneKey;

    const frames = scene.frames;
    const frameDelay = scene.frameDelay || 240;
    const totalLoops = options.loops || scene.loops || 1;
    const message = options.message || this.pick(scene.messages);
    let index = 0;
    let remainingLoops = totalLoops;

    const tick = () => {
      const frame = frames[index];
      this.render(frame, message);
      index += 1;

      if (index >= frames.length) {
        index = 0;
        remainingLoops -= 1;

        if (remainingLoops <= 0) {
          clearInterval(this.frameTimer);
          this.frameTimer = null;

          if (typeof options.onDone === 'function') {
            options.onDone();
          }
        }
      }
    };

    tick();
    this.frameTimer = setInterval(tick, frameDelay);
  }

  render(frame, message) {
    const lines = [
      ...this.buildBubble(message),
      ...frame.sprite.map((line) => `  ${this.colors[frame.color]}${line}${this.colors.reset}`),
      `  ${this.colors.soft}http://localhost:${this.port}${this.basePath}  |  ${this.resolveMessage(this.text.footer)}${this.colors.reset}`
    ];

    this.clearRender();
    process.stdout.write(lines.join('\n'));
    this.lastRenderHeight = lines.length;
  }

  clearRender() {
    if (!this.lastRenderHeight) return;

    readline.cursorTo(process.stdout, 0);

    for (let i = 0; i < this.lastRenderHeight; i += 1) {
      readline.clearLine(process.stdout, 0);

      if (i < this.lastRenderHeight - 1) {
        readline.moveCursor(process.stdout, 0, -1);
      }
    }

    readline.cursorTo(process.stdout, 0);
    this.lastRenderHeight = 0;
  }

  buildBubble(message) {
    const maxLineWidth = 44;
    const lines = this.wrapText(String(message), maxLineWidth);
    const innerWidth = Math.max(1, ...lines.map((line) => this.getDisplayWidth(line)));
    const border = '─'.repeat(innerWidth + 2);
    const body = lines.map(
      (line) =>
        `${this.colors.soft}  │ ${this.padDisplay(line, innerWidth)} │${this.colors.reset}`
    );

    return [
      `${this.colors.soft}  ╭${border}╮${this.colors.reset}`,
      ...body,
      `${this.colors.soft}  ╰${border}╯${this.colors.reset}`,
      `${this.colors.soft}         \\${this.colors.reset}`
    ];
  }

  wrapText(text, maxWidth) {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    if (!normalized.length) return [''];

    const paragraphs = normalized.split('\n');
    const out = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        out.push('');
        continue;
      }

      const words = para.split(/\s+/);
      let line = '';

      const flush = () => {
        if (line.length) {
          out.push(line);
          line = '';
        }
      };

      for (const word of words) {
        if (!word.length) continue;

        const next = line.length ? `${line} ${word}` : word;
        if (this.getDisplayWidth(next) <= maxWidth) {
          line = next;
        } else {
          flush();
          if (this.getDisplayWidth(word) <= maxWidth) {
            line = word;
            continue;
          }

          let rest = word;
          while (this.getDisplayWidth(rest) > maxWidth) {
            const chunk = this.takeByWidth(rest, maxWidth);
            out.push(chunk);
            rest = rest.slice(chunk.length);
          }
          line = rest;
        }
      }
      flush();
    }

    return out.length ? out : [''];
  }

  resolveMessage(message) {
    if (typeof message === 'string') return message;
    if (!message || typeof message !== 'object') return '';
    return message[this.lang] || message.en || message.zh || '';
  }

  resolveMessages(messages) {
    return messages.map((message) => this.resolveMessage(message));
  }

  getDisplayWidth(text) {
    let width = 0;

    for (const char of text) {
      width += this.getCharWidth(char);
    }

    return width;
  }

  getCharWidth(char) {
    return /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff01-\uff60\uffe0-\uffe6]/u.test(char)
      ? 2
      : 1;
  }

  takeByWidth(text, maxWidth) {
    let width = 0;
    let index = 0;

    for (const char of text) {
      const charWidth = this.getCharWidth(char);
      if (index > 0 && width + charWidth > maxWidth) break;
      width += charWidth;
      index += char.length;
    }

    return text.slice(0, index || 1);
  }

  padDisplay(text, targetWidth) {
    const padding = Math.max(0, targetWidth - this.getDisplayWidth(text));
    return text + ' '.repeat(padding);
  }

  pickIdleScene() {
    const entries = Object.entries(this.scenes)
      .filter(([key, scene]) => scene.weight)
      .filter(([key]) => key !== this.currentSceneKey);

    const totalWeight = entries.reduce((sum, [, scene]) => sum + scene.weight, 0);
    let cursor = Math.random() * totalWeight;

    for (const [key, scene] of entries) {
      cursor -= scene.weight;
      if (cursor <= 0) return key;
    }

    return 'idle';
  }

  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  hideCursor() {
    if (this.cursorHidden) return;
    process.stdout.write('\x1B[?25l');
    this.cursorHidden = true;
  }

  showCursor() {
    if (!this.cursorHidden) return;
    process.stdout.write('\x1B[?25h');
    this.cursorHidden = false;
  }

  createSprite(eyes, waterline, pose) {
    const variants = {
      still: [
        '        __',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      breath: [
        '         __',
        `   ______/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline}  /_/  \\_\\`
      ],
      paw: [
        '        __',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__   __    __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'orange-left': [
        '      🍊 __',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'orange-mid': [
        '        __',
        `   ___🍊_/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'orange-right': [
        '        __ 🍊',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'steam-left': [
        '   ♨️      ♨️',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'steam-mid': [
        '    ♨️    ♨️',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'steam-right': [
        '  ♨️        ♨️',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'step-left': [
        '      __',
        ` _____/  \\`,
        `(_  ${eyes}    )__`,
        ` /__        __\\`,
        `   ${waterline} /_/ \\_\\`
      ],
      'step-mid': [
        '        __',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__         __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'step-right': [
        '          __',
        `     _____/  \\`,
        `   _(  ${eyes}    )__`,
        `  /__         __\\`,
        `     ${waterline} /_/  \\_\\`
      ],
      'spark-left': [
        '      ⚡ __',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__   __    __\\`,
        `   ${waterline} /_/  \\_\\`
      ],
      'spark-right': [
        '        __ ⚡',
        `   _____/  \\`,
        ` _(  ${eyes}    )__`,
        `/__    __   __\\`,
        `   ${waterline} /_/  \\_\\`
      ]
    };

    return variants[pose] || variants.still;
  }
}

module.exports = CappyMascot;
