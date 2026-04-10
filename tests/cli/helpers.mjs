import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** 仓库根目录（tests/cli → 上两级） */
export const REPO_ROOT = join(__dirname, '..', '..');

/** CLI 入口（不依赖全局 npm link） */
export const SKB_BIN = join(REPO_ROOT, 'cli', 'bin', 'skb.js');

/**
 * 运行 skb，成功时返回 stdout；失败时抛出（含 status）
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [env]
 */
export function runSkb(args, env = {}) {
  return execFileSync(process.execPath, [SKB_BIN, ...args], {
    encoding: 'utf8',
    env: { ...process.env, ...env }
  });
}

/**
 * 运行 skb，不抛错，返回退出码与输出
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [env]
 */
export function runSkbCapture(args, env = {}) {
  try {
    const stdout = execFileSync(process.execPath, [SKB_BIN, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ...env }
    });
    return { code: 0, stdout, stderr: '' };
  } catch (e) {
    const code = typeof e.status === 'number' ? e.status : 1;
    return {
      code,
      stdout: e.stdout?.toString?.() ?? '',
      stderr: e.stderr?.toString?.() ?? ''
    };
  }
}

/**
 * 仅执行一段 ESM 代码（用于隔离 LANG 等环境测 i18n）
 * @param {string} code
 * @param {Record<string, string | undefined>} [env]
 */
export function runNodeEvalModule(code, env = {}) {
  return execFileSync(
    process.execPath,
    ['--input-type=module', '-e', code],
    {
      encoding: 'utf8',
      env: { ...process.env, ...env },
      cwd: REPO_ROOT
    }
  ).trim();
}
