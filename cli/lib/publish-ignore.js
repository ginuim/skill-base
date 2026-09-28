import fs from 'node:fs';
import path from 'node:path';
import ignore from 'ignore';

const ALWAYS_IGNORED = new Set(['.git', '__MACOSX']);

export function readPublishIgnore(dir, { useGitignore = true, extra = [] } = {}) {
  const rules = ignore();
  for (const filename of [...(useGitignore ? ['.gitignore'] : []), '.skillbaseignore']) {
    const file = path.join(dir, filename);
    if (fs.existsSync(file)) rules.add(fs.readFileSync(file, 'utf8'));
  }
  rules.add(extra.filter(Boolean));
  return (relativePath, isDirectory = false) => {
    const normalized = relativePath.split(path.sep).join('/');
    const segments = normalized.split('/');
    return segments.some((segment) => ALWAYS_IGNORED.has(segment) || segment.toLowerCase() === '.ds_store')
      || normalized === '.gitignore'
      || rules.ignores(normalized + (isDirectory ? '/' : ''));
  };
}

export function listPublishFiles(dir, options = {}) {
  const isIgnored = readPublishIgnore(dir, options);
  const included = [];
  const excluded = [];
  function visit(relative = '') {
    for (const entry of fs.readdirSync(path.join(dir, relative), { withFileTypes: true })) {
      const file = path.join(relative, entry.name);
      const name = file.split(path.sep).join('/');
      if (isIgnored(name, entry.isDirectory())) {
        excluded.push(name + (entry.isDirectory() ? '/' : ''));
      } else if (entry.isDirectory()) {
        visit(file);
      } else if (entry.isFile()) {
        included.push(name);
      } else {
        excluded.push(name); // Never follow links outside the selected Skill folder.
      }
    }
  }
  visit();
  return { included: included.sort(), excluded: excluded.sort() };
}
