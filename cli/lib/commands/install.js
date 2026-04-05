import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import chalk from 'chalk';
import ora from 'ora';
import extract from 'extract-zip';
import prompts from 'prompts';
import { createClient } from '../api.js';
import { detectInsideIdeDir, resolveInstallDir, getIdeChoices, getSupportedIdeIds, IDE_CONFIGS } from '../ide.js';

/**
 * Download and extract a skill into targetDir
 * @param {string} skillId - Skill ID
 * @param {string} version - Version or 'latest'
 * @param {string} targetDir - Destination directory
 * @returns {Promise<{skillId: string, version: string, targetDir: string}>}
 */
export async function downloadAndExtract(skillId, version, targetDir) {
  const client = createClient();

  // Fetch skill metadata to verify it exists
  const skillInfo = await client.get(`/skills/${encodeURIComponent(skillId)}`);

  // Resolve 'latest' to concrete version
  const actualVersion = version === 'latest' ? skillInfo.latest_version : version;

  if (!actualVersion) {
    throw new Error(`Skill ${skillId} has no available version`);
  }

  // Download zip
  const response = await client.download(
    `/skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(actualVersion)}/download`
  );

  // Write response to a temp zip file
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const tmpZip = path.join(os.tmpdir(), `skb-${skillId}-${actualVersion}-${Date.now()}.zip`);
  fs.writeFileSync(tmpZip, buffer);

  // Ensure target dir exists
  fs.mkdirSync(targetDir, { recursive: true });

  // Extract
  await extract(tmpZip, { dir: path.resolve(targetDir) });

  // Remove temp zip
  try {
    fs.unlinkSync(tmpZip);
  } catch (e) {
    // Ignore cleanup errors
  }

  return { skillId, version: actualVersion, targetDir };
}

export default async function install(target, options) {
  // Parse target: skillId@version or skillId
  let skillId, version;
  if (target.includes('@')) {
    const parts = target.split('@');
    skillId = parts[0];
    version = parts[1];
  } else {
    skillId = target;
    version = 'latest';
  }

  let targetDir;

  // User passed -d: use plain directory install
  if (options.dir) {
    targetDir = options.dir;
  } else {
    // IDE-based install
    let ideId = options.ide;

    // Interactive IDE picker
    if (!ideId) {
      const ideChoices = [
        ...getIdeChoices(),
        { title: '当前目录（不使用 IDE 集成）', value: '_cwd' },
      ];
      const response = await prompts({
        type: 'select',
        name: 'ide',
        message: '选择目标 IDE',
        choices: ideChoices,
      });

      if (response.ide === undefined) {
        // User cancelled (e.g. Ctrl+C)
        console.log(chalk.yellow('\n已取消安装'));
        process.exit(0);
      }

      ideId = response.ide;
    }

    // Chose "current directory"
    if (ideId === '_cwd') {
      targetDir = process.cwd();
    } else {
      // Validate IDE id
      if (!getSupportedIdeIds().includes(ideId)) {
        console.log(chalk.red(`不支持的 IDE: ${ideId}`));
        console.log(chalk.yellow(`支持的 IDE: ${getSupportedIdeIds().join(', ')}`));
        process.exit(1);
      }

      // Global install must be supported by IDE
      if (options.global && !IDE_CONFIGS[ideId].supportsGlobal) {
        console.log(chalk.red(`${IDE_CONFIGS[ideId].name} 不支持全局安装`));
        process.exit(1);
      }

      // Warn if already inside an IDE skill dir
      const insideIde = detectInsideIdeDir(process.cwd());
      if (insideIde) {
        const { confirm } = await prompts({
          type: 'confirm',
          name: 'confirm',
          message: `当前目录已在 ${insideIde.name} 的 skill 目录内，继续安装可能导致嵌套。是否继续？`,
          initial: false,
        });
        if (!confirm) {
          console.log(chalk.yellow('已取消安装'));
          process.exit(0);
        }
      }

      // Resolve install path
      targetDir = resolveInstallDir(ideId, skillId, options.global || false, process.cwd());
    }
  }

  const spinner = ora(`Downloading ${skillId}${version !== 'latest' ? '@' + version : ''}...`).start();

  try {
    const result = await downloadAndExtract(skillId, version, targetDir);
    const displayPath = options.global ? result.targetDir : path.relative(process.cwd(), path.join(result.targetDir, skillId)) || path.join(result.targetDir, skillId);
    spinner.succeed(chalk.green(`Installed ${result.skillId} ${result.version} → ${displayPath}`));
  } catch (err) {
    // Friendlier errors for common failures
    if (err.message === 'Skill not found' || err.message.includes('HTTP 404')) {
      spinner.fail(chalk.red(`Skill '${skillId}' not found`));
      console.log();
      console.log(chalk.yellow('Possible solutions:'));
      console.log(chalk.gray('  1. Check if the skill name is correct'));
      console.log(chalk.gray('  2. Use `skb search <keyword>` to find available skills'));
      console.log(chalk.gray('  3. If this is your skill, publish it first with `skb publish`'));
    } else if (err.message === 'Version not found') {
      spinner.fail(chalk.red(`Version '${version}' not found for skill '${skillId}'`));
      console.log();
      console.log(chalk.yellow(`Tip: Use \`skb install ${skillId}\` to install the latest version`));
    } else {
      spinner.fail(chalk.red(`Install failed: ${err.message}`));
    }
    process.exit(1);
  }
}
