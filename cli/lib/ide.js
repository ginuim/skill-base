import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/**
 * IDE 配置映射表
 * @type {Object.<string, {id: string, name: string, projectPath: string, globalPath: string|null, supportsGlobal: boolean}>}
 */
export const IDE_CONFIGS = {
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    projectPath: '.cursor/rules',
    globalPath: '.cursor/rules',
    supportsGlobal: true,
  },
  copilot: {
    id: 'copilot',
    name: 'GitHub Copilot',
    projectPath: '.github/instructions',
    globalPath: null,
    supportsGlobal: false,
  },
  windsurf: {
    id: 'windsurf',
    name: 'Windsurf',
    projectPath: '.windsurf/rules',
    globalPath: '.windsurf/rules',
    supportsGlobal: true,
  },
  qoder: {
    id: 'qoder',
    name: 'Qoder',
    projectPath: '.qoder/skills',
    globalPath: '.qoder/skills',
    supportsGlobal: true,
  },
  'claude-code': {
    id: 'claude-code',
    name: 'Claude Code',
    projectPath: '.claude/skills',
    globalPath: '.claude/skills',
    supportsGlobal: true,
  },
  qoderwork: {
    id: 'qoderwork',
    name: 'QoderWork',
    projectPath: '.qoderwork/skills',
    globalPath: '.qoderwork/skills',
    supportsGlobal: true,
  },
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    projectPath: '.opencode/skills',
    globalPath: '.config/opencode/skills',
    supportsGlobal: true,
  },
};

/** 项目根目录标志文件/目录列表 */
const PROJECT_MARKERS = ['.git', 'package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'pom.xml'];

/**
 * 向上遍历目录，寻找项目根目录
 * @param {string} cwd - 当前工作目录
 * @returns {string} 项目根目录路径，找不到时返回 cwd
 */
export function findProjectRoot(cwd) {
  let dir = path.resolve(cwd);
  const root = path.parse(dir).root;
  while (dir !== root) {
    for (const marker of PROJECT_MARKERS) {
      if (fs.existsSync(path.join(dir, marker))) {
        return dir;
      }
    }
    dir = path.dirname(dir);
  }
  return cwd;
}

/**
 * 检测当前目录是否位于某个 IDE 的 skill 目录内
 * @param {string} cwd - 当前工作目录
 * @returns {Object|null} 匹配的 IDE 配置对象，或 null
 */
export function detectInsideIdeDir(cwd) {
  const normalized = cwd.replace(/\\/g, '/');
  for (const config of Object.values(IDE_CONFIGS)) {
    const pattern = `/${config.projectPath}/`;
    if (normalized.includes(pattern)) {
      return config;
    }
  }
  return null;
}

/**
 * 根据参数计算最终安装路径
 * @param {string} ideId - IDE 标识符
 * @param {string} skillId - Skill 标识符（本函数不使用，但保留参数以便扩展）
 * @param {boolean} isGlobal - 是否全局安装
 * @param {string} cwd - 当前工作目录
 * @returns {string} 安装目录路径（不包含 skillId 子目录）
 * @throws {Error} 当 IDE 不支持或全局安装不支持时
 */
export function resolveInstallDir(ideId, skillId, isGlobal, cwd) {
  const config = IDE_CONFIGS[ideId];
  if (!config) {
    throw new Error(`Unsupported IDE: ${ideId}`);
  }

  if (isGlobal) {
    if (!config.supportsGlobal) {
      throw new Error(`${config.name} does not support global installation`);
    }
    return path.join(os.homedir(), config.globalPath);
  }

  const projectRoot = findProjectRoot(cwd);
  return path.join(projectRoot, config.projectPath);
}

/**
 * 获取 IDE 选择列表（用于 prompts 库 select 类型）
 * @returns {Array<{title: string, value: string}>} IDE 选项列表
 */
export function getIdeChoices() {
  return Object.values(IDE_CONFIGS).map(config => ({
    title: config.name,
    value: config.id,
  }));
}

/**
 * 获取所有支持的 IDE id 数组
 * @returns {string[]} IDE id 数组
 */
export function getSupportedIdeIds() {
  return Object.keys(IDE_CONFIGS);
}
