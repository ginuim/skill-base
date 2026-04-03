const readline = require('readline');

class CappyMascot {
  constructor(port, basePath = '/') {
    this.port = port;
    this.basePath = basePath;
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

    // Scenes: personality + frames + messages.
    this.scenes = {
      intro: {
        frameDelay: 240,
        loops: 1,
        messages: [
          `Skill Base is warming up; port ${port} is live.`
        ],
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
        messages: [
          `Cappy is staring at port ${port}.`,
          'All quiet. No over-engineering, no runtime anxiety.',
          'The skill library is calm. Straightforward code brings that peace.',
          'System stable. Cappy despises pointless complexity.'
        ],
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
        messages: [
          'Slow blink. Not slacking—low-cost patrolling.',
          'Better to write simple code than to pile on monitoring scripts.'
        ],
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
        messages: [
          'Simple architecture wins. Real stability needs no fancy design.',
          'Thinking. Writing code directly beats clever layers of abstraction.'
        ],
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
        messages: [
          'Get the data structures right and the logic flows like water.',
          'Let it soak in. Do not guess future needs—YAGNI.'
        ],
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
        messages: [
          'Short walk. Checking no one over-engineered anything.',
          'No extra steps. Only moves that matter. Code should be the same.'
        ],
        frames: [
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'step-left') },
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'step-mid') },
          { color: 'cyan', sprite: this.createSprite('o o', '___', 'step-right') }
        ]
      },
      work: {
        frameDelay: 180,
        loops: 6,
        messages: [
          'Task received. Cappy is handling it the plain way.'
        ],
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
      message: message || 'Something new happened; Cappy stays steady.',
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
    const goodbyeMsg = 'Cappy is off duty. See you tomorrow.';
    const gBorder = '─'.repeat(goodbyeMsg.length + 2);
    const gSeg = goodbyeMsg.length + 1;
    const gLeft = Math.floor(gSeg / 2);
    const gRight = gSeg - gLeft;
    const goodbye = [
      `${this.colors.soft}  ╭${gBorder}╮${this.colors.reset}`,
      `${this.colors.soft}  │ ${goodbyeMsg} │${this.colors.reset}`,
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
      `  ${this.colors.soft}http://localhost:${this.port}${this.basePath}  |  Cappy on duty${this.colors.reset}`
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
    const innerWidth = Math.max(1, ...lines.map((l) => l.length));
    const border = '─'.repeat(innerWidth + 2);
    const body = lines.map(
      (line) =>
        `${this.colors.soft}  │ ${line.padEnd(innerWidth)} │${this.colors.reset}`
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

        if (word.length > maxWidth) {
          flush();
          let rest = word;
          while (rest.length > maxWidth) {
            out.push(rest.slice(0, maxWidth));
            rest = rest.slice(maxWidth);
          }
          line = rest;
          continue;
        }

        const next = line.length ? `${line} ${word}` : word;
        if (next.length <= maxWidth) {
          line = next;
        } else {
          flush();
          line = word;
        }
      }
      flush();
    }

    return out.length ? out : [''];
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
