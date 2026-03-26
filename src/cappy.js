const readline = require('readline');

class CappyMascot {
  constructor(port) {
    this.port = port;
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

    // 数据很简单：scene 决定人格，frame 决定动作，message 决定台词。
    this.scenes = {
      intro: {
        frameDelay: 240,
        loops: 1,
        messages: [
          `Skill Base 正在热机，端口 ${port} 已点亮。`
        ],
        frames: [
          { color: 'warm', sprite: this.createSprite('o o', '___', 'paw') },
          { color: 'orange', sprite: this.createSprite('o -', '___', 'paw') },
          { color: 'warm', sprite: this.createSprite('^ ^', '___', 'still') }
        ]
      },
      idle: {
        weight: 5,
        frameDelay: 320,
        loops: 4,
        messages: [
          `Cappy 正在看着 ${port} 号端口发呆。`,
          '一切正常。复杂度暂时没有越狱。',
          '技能仓库很安静，这才像个能维护的系统。',
          '没有警报。Cappy 允许自己可爱一下。'
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
          'Cappy 刚刚眨了下眼，顺手检查了一遍现场。',
          '眨眼，不是摸鱼。是低成本巡检。'
        ],
        frames: [
          { color: 'warm', sprite: this.createSprite('o o', '___', 'still') },
          { color: 'warm', sprite: this.createSprite('- -', '___', 'still') },
          { color: 'warm', sprite: this.createSprite('o o', '___', 'still') }
        ]
      },
      orange: {
        weight: 1,
        frameDelay: 280,
        loops: 3,
        messages: [
          '橘子平衡测试通过。Cappy 的稳定性可信。',
          '顶着橘子值班，比写花活抽象层靠谱。'
        ],
        frames: [
          { color: 'orange', sprite: this.createSprite('o o', '___', 'orange-left') },
          { color: 'orange', sprite: this.createSprite('^ ^', '___', 'orange-mid') },
          { color: 'orange', sprite: this.createSprite('o o', '___', 'orange-right') }
        ]
      },
      soak: {
        weight: 1,
        frameDelay: 340,
        loops: 3,
        messages: [
          '温泉模式已开启。服务稳定，Cappy 也稳定。',
          '有些问题不需要会，泡一下就想明白了。'
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
          'Cappy 在短距离巡逻。没有多余步骤，只有必要移动。',
          '散步中。顺便确认系统没有被聪明人搞复杂。'
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
          '收到任务，Cappy 正在飞快处理。'
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
      message: message || '有新动作发生了，但系统依然很稳。',
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
    const goodbye = [
      `${this.colors.soft}  ╭──────────────────────────────╮${this.colors.reset}`,
      `${this.colors.soft}  │ Cappy 下班了，明天继续值守。 │${this.colors.reset}`,
      `${this.colors.soft}  ╰──────────────┬───────────────╯${this.colors.reset}`,
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
      `  ${this.colors.soft}port ${this.port}  |  Cappy on duty${this.colors.reset}`
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
    const text = this.fit(message, 34);
    const width = text.length;
    const line = '─'.repeat(width + 2);

    return [
      `${this.colors.soft}  ╭${line}╮${this.colors.reset}`,
      `${this.colors.soft}  │ ${text} │${this.colors.reset}`,
      `${this.colors.soft}  ╰${line}╯${this.colors.reset}`,
      `${this.colors.soft}         \\${this.colors.reset}`
    ];
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

  fit(text, width) {
    if (text.length <= width) {
      return text.padEnd(width, ' ');
    }

    return `${text.slice(0, width - 1)}…`;
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
