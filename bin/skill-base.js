#!/usr/bin/env node

/**
 * Skill Base CLI Entry
 * 启动 Skill Base Web 服务
 */

const path = require('path');
const fs = require('fs');

// 解析命令行参数
const args = process.argv.slice(2);
let port = 8000;
let host = '0.0.0.0';
let dataDir = null;
let basePath = '/';
let enableCappy = true;
let debug = false;
let cacheMaxMb = '50';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-p' || args[i] === '--port') && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if ((args[i] === '-h' || args[i] === '--host') && args[i + 1]) {
    host = args[i + 1];
    i++;
  } else if ((args[i] === '-d' || args[i] === '--data-dir') && args[i + 1]) {
    dataDir = path.resolve(args[i + 1]);
    i++;
  } else if (args[i] === '--base-path' && args[i + 1]) {
    basePath = args[i + 1];
    i++;
  } else if (args[i] === '--cache-max-mb' && args[i + 1]) {
    cacheMaxMb = args[i + 1];
    i++;
  } else if (args[i] === '--no-cappy') {
    enableCappy = false;
  } else if (args[i] === '-v' || args[i] === '--verbose') {
    debug = true;
  } else if (args[i] === '--help') {
    console.log(`
Skill Base - 内网轻量版 Skill 管理平台

Usage:
  npx skill-base [options]

Options:
  -p, --port <port>       指定端口号 (默认: 8000)
  -h, --host <host>       指定监听地址 (默认: 0.0.0.0)
  -d, --data-dir <path>   指定数据目录 (默认: 包内 data/)
  --base-path <path>      指定部署前缀 (默认: /，例如: /skills/)
  --cache-max-mb <mb>     指定进程内 LRU 缓存总容量，单位 MB (默认: 50)
  --no-cappy              禁用 Cappy 水豚吉祥物
  -v, --verbose           启用调试信息
  --help                  显示帮助信息
  --version               显示版本号

Examples:
  npx skill-base                       # 启动服务 (端口 8000)
  npx skill-base -p 3000               # 使用端口 3000
  npx skill-base --host 127.0.0.1      # 仅本地访问
  npx skill-base -d ./data             # 数据存储到当前目录的 data 文件夹
  npx skill-base -d . -p 3000          # 数据存储到当前目录
  npx skill-base --base-path /skills/  # 部署在子路径下
  npx skill-base --cache-max-mb 100    # 将 LRU 缓存上限调整为 100MB
  npx skill-base --no-cappy            # 禁用吉祥物
`);
    process.exit(0);
  } else if (args[i] === '--version') {
    const pkg = require('../package.json');
    console.log(pkg.version);
    process.exit(0);
  }
}

// 设置环境变量
process.env.PORT = port;
process.env.HOST = host;
process.env.APP_BASE_PATH = basePath;
process.env.ENABLE_CAPPY = enableCappy;
process.env.DEBUG = debug;
process.env.CACHE_MAX_MB = cacheMaxMb;

// 设置数据目录
if (dataDir) {
  // 确保目录存在
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  process.env.DATA_DIR = dataDir;
  process.env.DATABASE_PATH = path.join(dataDir, 'skills.db');
  console.log(`Data directory: ${dataDir}`);
}

// 启动服务
require('../src/index.js');
