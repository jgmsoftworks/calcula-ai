import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fingerprintResults, compareBaseline } from './lint-baseline.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', '.', '--format', 'json'], {
  cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024,
});
if (result.error) throw result.error;
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0 && result.status !== 1) {
  process.stderr.write(result.stdout || 'ESLint could not run.\n');
  process.exit(result.status ?? 1);
}
const results = JSON.parse(result.stdout); // Fail closed on invalid/tool-error output.
if (results.some(file => file.fatalErrorCount > 0)) {
  console.error('ESLint parser errors cannot be accepted by a baseline.');
  process.exit(1);
}
const baseline = JSON.parse(readFileSync(new URL('../quality/eslint-baseline.json', import.meta.url), 'utf8'));
const current = fingerprintResults(results, root);
const added = compareBaseline(current, baseline.entries);
const errors = results.reduce((total, file) => total + file.errorCount, 0);
const warnings = results.reduce((total, file) => total + file.warningCount, 0);
console.log(`ESLint: ${errors} existing/current errors, ${warnings} warnings; ${added.reduce((n, e) => n + e.count, 0)} new diagnostics.`);
if (added.length) {
  for (const entry of added) console.error(`${entry.path}: ${entry.rule || 'directive'}: ${entry.message} (+${entry.count})`);
  console.error('Fix new diagnostics. Do not expand the baseline to make CI pass.');
  process.exit(1);
}
console.log('No increase over the reviewed baseline. Full debt: npm run lint. See docs/quality.md.');
