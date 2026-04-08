import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pickMessage } from './i18n.js';

/**
 * IDE configuration map
 * @type {Object.<string, {id: string, name: string, projectPath: string, globalPath: string|null, supportsGlobal: boolean}>}
 */
export const IDE_CONFIGS = {
  universal: {
    id: 'universal',
    name: 'Universal (.agents)',
    projectPath: '.agents/skills',
    globalPath: '.config/agents/skills',
    supportsGlobal: true,
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    projectPath: '.cursor/skills',
    globalPath: '.cursor/skills',
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

/** Marker files/dirs that indicate a project root */
const PROJECT_MARKERS = ['.git', 'package.json', 'pyproject.toml', 'go.mod', 'Cargo.toml', 'pom.xml'];

/**
 * Walk up from cwd to find the project root directory
 * @param {string} cwd - Current working directory
 * @returns {string} Project root path, or cwd if none found
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
 * Detect whether cwd is inside an IDE skill/rules directory
 * @param {string} cwd - Current working directory
 * @returns {Object|null} Matching IDE config, or null
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
 * Resolve the install directory from IDE and global/project flags
 * @param {string} ideId - IDE identifier
 * @param {string} skillId - Skill id (unused; kept for future extension)
 * @param {boolean} isGlobal - Install to global IDE config vs project
 * @param {string} cwd - Current working directory
 * @returns {string} Install directory (parent path, not including skillId subfolder)
 * @throws {Error} If IDE is unknown or global install is not supported
 */
export function resolveInstallDir(ideId, skillId, isGlobal, cwd) {
  const config = IDE_CONFIGS[ideId];
  if (!config) {
    throw new Error(
      pickMessage({
        zh: `不支持的 IDE: ${ideId}`,
        en: `Unsupported IDE: ${ideId}`
      })
    );
  }

  if (isGlobal) {
    if (!config.supportsGlobal) {
      throw new Error(
        pickMessage({
          zh: `${config.name} 不支持全局安装`,
          en: `${config.name} does not support global installation`
        })
      );
    }
    return path.join(os.homedir(), config.globalPath);
  }

  const projectRoot = findProjectRoot(cwd);
  return path.join(projectRoot, config.projectPath);
}

/**
 * Build IDE choices for prompts (select type)
 * @returns {Array<{title: string, value: string}>}
 */
export function getIdeChoices() {
  return Object.values(IDE_CONFIGS).map(config => ({
    title: config.name,
    value: config.id,
  }));
}

/**
 * List all supported IDE ids
 * @returns {string[]}
 */
export function getSupportedIdeIds() {
  return Object.keys(IDE_CONFIGS);
}
