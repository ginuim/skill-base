import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

function storeRoot() {
  return path.join(os.homedir(), '.skill-base', 'linked-skills');
}

export function readManagedSkillLink(installPath) {
  if (!fs.lstatSync(installPath, { throwIfNoEntry: false })?.isSymbolicLink()) return null;
  const link = fs.readlinkSync(installPath);
  let target = link;
  if (process.platform === 'win32') {
    target = target.replace(/^\\\\\?\\UNC\\/i, '\\\\').replace(/^\\\\\?\\(?=[A-Za-z]:)/, '');
  }
  const destination = path.resolve(path.dirname(installPath), target);
  const relative = path.relative(storeRoot(), destination);
  const parts = relative.split(path.sep);
  const managed = parts.length === 2 && /^install-[A-Za-z0-9]+$/.test(parts[0])
    && parts[1] === path.basename(installPath);
  return managed ? link : null;
}

export async function installSkillLinks(targets, populateStore) {
  const root = storeRoot();
  fs.mkdirSync(root, { recursive: true });
  const store = fs.mkdtempSync(path.join(root, 'install-'));
  const stages = [];
  let keepStore = false;
  try {
    const result = await populateStore(store);
    // Stage all links before moving existing installs. Unsupported volumes fail here.
    const destinations = new Set();
    const realRoot = fs.realpathSync(root);
    for (const { installPath, overwrite, expectedLink } of targets) {
      const source = path.join(store, path.basename(installPath));
      if (!fs.lstatSync(source, { throwIfNoEntry: false })?.isDirectory()) {
        throw new Error(`Skill directory missing from archive: ${path.basename(installPath)}`);
      }
      const parent = path.dirname(installPath);
      fs.mkdirSync(parent, { recursive: true });
      const realParent = fs.realpathSync(parent);
      const relative = path.relative(realRoot, realParent);
      if (!relative || (!path.isAbsolute(relative) && relative.split(path.sep)[0] !== '..')) {
        throw new Error('Install location cannot be inside the linked skill store');
      }
      const destination = path.join(realParent, path.basename(installPath));
      if (destinations.has(destination)) continue;
      destinations.add(destination);
      const staging = fs.mkdtempSync(path.join(realParent, '.skb-link-'));
      const stage = {
        destination, staging, overwrite, expectedLink,
        backup: path.join(staging, 'previous'),
        link: path.join(staging, 'link')
      };
      stages.push(stage);
      fs.symlinkSync(source, stage.link, process.platform === 'win32' ? 'junction' : 'dir');
    }

    for (const stage of stages) {
      const existing = fs.lstatSync(stage.destination, { throwIfNoEntry: false });
      if (stage.expectedLink && (!existing?.isSymbolicLink() || fs.readlinkSync(stage.destination) !== stage.expectedLink)) {
        throw new Error(`Installed link changed while downloading: ${stage.destination}`);
      }
      if (existing) {
        if (!stage.overwrite) throw new Error(`Install location already exists: ${stage.destination}`);
        fs.renameSync(stage.destination, stage.backup);
        stage.backedUp = true;
      }
      fs.renameSync(stage.link, stage.destination);
      stage.installed = true;
    }
    keepStore = true;
    return result;
  } catch (error) {
    const recoveryFailures = [];
    for (const stage of stages.reverse()) {
      try {
        if (stage.installed) fs.unlinkSync(stage.destination);
        if (stage.backedUp) fs.renameSync(stage.backup, stage.destination);
      } catch {
        stage.preserve = true;
        keepStore = true;
        recoveryFailures.push(stage.staging);
      }
    }
    if (recoveryFailures.length) {
      throw new Error(`${error.message}. Recovery files: ${recoveryFailures.join(', ')}`, { cause: error });
    }
    throw error;
  } finally {
    for (const stage of stages) {
      if (!stage.preserve) removeStaging(stage.staging);
    }
    if (!keepStore) removeStaging(store);
  }
}

function removeStaging(directory) {
  try {
    fs.rmSync(directory, { recursive: true, force: true });
  } catch {
    // Cleanup failures must not turn completed link changes into unrecorded installs.
  }
}
