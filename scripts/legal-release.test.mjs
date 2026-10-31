import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateRelease, publicationSql } from './legal-release.mjs';
const draft = JSON.parse(readFileSync(new URL('../src/legal/release.json', import.meta.url)));
test('blocks production publication with missing operator facts', () => {
  assert.throws(() => validateRelease(draft), /operator.name/);
  assert.throws(() => publicationSql(draft), /pendente/);
});
test('only produces an immutable, atomic release after required facts are filled', () => {
  const release = structuredClone(draft);
  release.status = 'published';
  release.operator = { name: "Empresa D'Exemplo", taxId: 'test-only', address: 'Test only', supportEmail: 'support@example.test', privacyEmail: 'privacy@example.test' };
  const sql = publicationSql(release);
  assert.match(sql, /^begin;/);
  assert.match(sql, /D''Exemplo/);
  assert.match(sql, /[0-9a-f]{64}/);
  assert.match(sql, /commit;/);
});
