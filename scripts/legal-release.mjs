import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export function validateRelease(release) {
  const missing = [];
  if (release.status !== 'published') missing.push('status published');
  for (const key of ['name', 'taxId', 'address', 'supportEmail', 'privacyEmail']) {
    if (!release.operator?.[key]?.trim()) missing.push(`operator.${key}`);
  }
  for (const key of ['supportEmail', 'privacyEmail']) {
    if (release.operator?.[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(release.operator[key])) missing.push(`${key} válido`);
  }
  if (!/^\d{4}-\d{2}-\d{2}\.\d+$/.test(release.version ?? '')) missing.push('versão datada');
  for (const name of ['terms','privacy','cookies']) if (!release.documents?.[name]?.sections?.length) missing.push(`documents.${name}`);
  if (missing.length) throw new Error(`Publicação jurídica pendente: ${missing.join(', ')}`);
}

export function publicationSql(release) {
  validateRelease(release);
  const content = JSON.stringify(release);
  const hash = createHash('sha256').update(content).digest('hex');
  const quote = value => `'${value.replaceAll("'", "''")}'`;
  return `begin;\nlock table public.legal_document_releases in exclusive mode;\nupdate public.legal_document_releases set active = false where active;\ninsert into public.legal_document_releases(version, content_sha256, content, active) values (${quote(release.version)}, ${quote(hash)}, ${quote(content)}::jsonb, true);\ncommit;\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const release = JSON.parse(readFileSync(new URL('../src/legal/release.json', import.meta.url), 'utf8'));
    validateRelease(release);
    if (process.argv.includes('--sql')) process.stdout.write(publicationSql(release));
    else console.log(`Documentos ${release.version}: campos de publicação preenchidos. Isso não substitui revisão jurídica.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
