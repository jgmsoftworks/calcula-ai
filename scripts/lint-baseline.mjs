import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { relative } from 'node:path';

export function fingerprintResults(results, root) {
  const entries = new Map();
  for (const file of results) {
    const path = relative(root, file.filePath).replaceAll('\\', '/');
    const lines = readFileSync(file.filePath, 'utf8').split(/\r?\n/);
    for (const message of file.messages) {
      const source = (lines[(message.line || 1) - 1] || '').trim();
      const sourceHash = createHash('sha256').update(source).digest('hex').slice(0, 16);
      const entry = { path, rule: message.ruleId, severity: message.severity,
        message: message.message, sourceHash };
      const key = JSON.stringify(entry);
      const previous = entries.get(key);
      entries.set(key, { ...entry, count: (previous?.count || 0) + 1 });
    }
  }
  return [...entries.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

const keyOf = entry => { const value = { ...entry }; delete value.count; return JSON.stringify(value); };
export function compareBaseline(current, baseline) {
  const allowed = new Map(baseline.map(entry => [keyOf(entry), entry.count]));
  return current.flatMap(entry => {
    const count = entry.count - (allowed.get(keyOf(entry)) || 0);
    return count > 0 ? [{ ...entry, count }] : [];
  });
}
