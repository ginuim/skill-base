#!/usr/bin/env node

/**
 * Skill Base CLI Entry
 * 启动 Skill Base Web 服务
 */

const path = require('path');

// 解析命令行参数
const args = process.argv.slice(2);
let port = 8000;
let host = '0.0.0.0';

for (let i = 0; i < args.length; i++) {
  if ((args[i] === '-p' || args[i] === '--port') && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if ((args[i] === '-h' || args[i] === '--host') && args[i + 1]) {
    host = args[i + 1];
    i++;
  } else if (args[i] === '--help') {
    console.log(`
Skill Base - 内网轻量版 Skill 管理平台

Usage:
  npx skill-base [options]

Options:
  -p, --port <port>   指定端口号 (默认: 8000)
  -h, --host <host>   指定监听地址 (默认: 0.0.0.0)
  --help              显示帮助信息
  --version           显示版本号

Examples:
  npx skill-base                    # 启动服务 (端口 8000)
  npx skill-base -p 3000            # 使用端口 3000
  npx skill-base --host 127.0.0.1   # 仅本地访问
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

// 启动服务
require('../src/index.js');
