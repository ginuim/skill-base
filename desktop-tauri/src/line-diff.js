/**
 * 行级 diff（LCS），用于版本对比页。输入通常是 SKILL.md（≤64 KB），
 * 超出 MAX_CELLS 时直接返回 tooLarge，避免 O(n·m) 内存膨胀。
 */
const MAX_CELLS = 4_000_000;
const CONTEXT_LINES = 3;

function splitLines(text) {
  // a single trailing newline terminates the last line instead of starting an empty one
  const normalized = String(text ?? '').replace(/\r\n/g, '\n').replace(/\n$/, '');
  return normalized === '' ? [] : normalized.split('\n');
}

/**
 * @returns {{ tooLarge: false, hunks: Array<{ header: string, lines: Array<{ type: 'ctx'|'add'|'del', text: string }> }>, additions: number, deletions: number }
 *          | { tooLarge: true, hunks: [], additions: 0, deletions: 0 }}
 */
export function diffLines(oldText, newText) {
  const a = splitLines(oldText);
  const b = splitLines(newText);
  const n = a.length;
  const m = b.length;
  if (n * m > MAX_CELLS) return { tooLarge: true, hunks: [], additions: 0, deletions: 0 };

  const width = m + 1;
  const lcs = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      lcs[i * width + j] = a[i] === b[j]
        ? lcs[(i + 1) * width + j + 1] + 1
        : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: 'ctx', text: a[i] });
      i += 1;
      j += 1;
    } else if (lcs[(i + 1) * width + j] >= lcs[i * width + j + 1]) {
      ops.push({ type: 'del', text: a[i] });
      i += 1;
    } else {
      ops.push({ type: 'add', text: b[j] });
      j += 1;
    }
  }
  while (i < n) ops.push({ type: 'del', text: a[i++] });
  while (j < m) ops.push({ type: 'add', text: b[j++] });

  let additions = 0;
  let deletions = 0;
  for (const op of ops) {
    if (op.type === 'add') additions += 1;
    else if (op.type === 'del') deletions += 1;
  }

  return { tooLarge: false, hunks: buildHunks(ops), additions, deletions };
}

function buildHunks(ops) {
  const ranges = [];
  ops.forEach((op, index) => {
    if (op.type === 'ctx') return;
    const start = Math.max(0, index - CONTEXT_LINES);
    const end = Math.min(ops.length - 1, index + CONTEXT_LINES);
    const last = ranges[ranges.length - 1];
    if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
    else ranges.push([start, end]);
  });

  return ranges.map(([start, end]) => {
    let oldBefore = 0;
    let newBefore = 0;
    for (let k = 0; k < start; k += 1) {
      if (ops[k].type !== 'add') oldBefore += 1;
      if (ops[k].type !== 'del') newBefore += 1;
    }
    const lines = ops.slice(start, end + 1);
    const oldCount = lines.filter((line) => line.type !== 'add').length;
    const newCount = lines.filter((line) => line.type !== 'del').length;
    return {
      header: `@@ -${oldBefore + 1},${oldCount} +${newBefore + 1},${newCount} @@`,
      lines
    };
  });
}
