import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { compareBaseline } from '../scripts/lint-baseline.mjs';

const entry = { path: 'src/example.ts', rule: 'example', severity: 2, message: 'problem', sourceHash: 'old', count: 2 };
test('lint debt cannot increase, move to another source, or introduce a new rule/file', () => {
  assert.deepEqual(compareBaseline([{ ...entry, count: 1 }], [entry]), []);
  assert.equal(compareBaseline([{ ...entry, count: 3 }], [entry])[0].count, 1);
  for (const change of [{ sourceHash: 'new' }, { rule: 'other' }, { path: 'src/new.ts' }]) {
    assert.equal(compareBaseline([{ ...entry, ...change }], [entry]).length, 1);
  }
});
test('isolated runner blocks fetch, HTTP, HTTPS and WebSocket before sending traffic', () => {
  const guard = new URL('./no-network.mjs', import.meta.url).href;
  const code = `
    import assert from 'node:assert/strict';
    import { get } from 'node:http';
    import { request } from 'node:https';
    for (const call of [() => fetch('https://example.invalid'), () => get('http://example.invalid'),
      () => request('https://example.invalid'), () => new WebSocket('wss://example.invalid')]) {
      assert.throws(call, /Real network disabled/);
    }
    globalThis.fetch = async () => ({ ok: true });
    assert.equal((await fetch('https://example.invalid')).ok, true);
  `;
  const result = spawnSync(process.execPath, ['--import', guard, '--input-type=module', '-e', code], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
