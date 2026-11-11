import { spawnSync } from 'node:child_process';

const script = process.argv[2];
if (!script) throw new Error('Usage: node scripts/run-isolated.mjs <node-script> [args]');
const guard = new URL('../tests/no-network.mjs', import.meta.url).href;
const env = { ...process.env };
delete env.PGLITE_MODULE; // Always use the version in this repository's lockfile.
env.NODE_OPTIONS = `${env.NODE_OPTIONS || ''} --import=${guard}`.trim();
const result = spawnSync(process.execPath, [script, ...process.argv.slice(3)], {
  stdio: 'inherit', env,
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
