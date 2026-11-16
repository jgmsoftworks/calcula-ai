#!/usr/bin/env node
/**
 * Read-only diagnosis of local AI development tools for Calcula Aí.
 * No downloads, hooks, telemetry or changes to the machine/project.
 */
import { spawnSync } from 'node:child_process';

const tools = [
  ['Codex CLI', 'codex', 'Ponytail e Graphify dependem do cliente de desenvolvimento'],
  ['Python', process.platform === 'win32' ? 'python' : 'python3', 'Graphify exige Python 3.11+'],
  ['uv', 'uv', 'Instalador isolado recomendado para Graphify'],
  ['Graphify CLI', 'graphify', 'O skill ainda precisa ser registrado no Codex'],
  ['RTK (binário)', 'rtk', 'Confira que é Rust Token Killer com: rtk gain'],
  ['Caveman (runtime opcional)', 'caveman', 'O skill Caveman pode existir sem este comando'],
];

function isOnPath(command) {
  const resolver = process.platform === 'win32' ? 'where.exe' : 'which';
  const result = spawnSync(resolver, [command], {
    encoding: 'utf8',
    timeout: 3000,
    windowsHide: true,
    stdio: 'ignore',
  });
  return result.status === 0;
}

console.log('Calcula Aí | Diagnóstico de ferramentas de agentes (somente leitura)\n');
for (const [name, command, note] of tools) {
  console.log(`${isOnPath(command) ? '[PATH OK]' : '[AUSENTE]'} ${name} — ${note}`);
}
console.log('\nA presença do comando NÃO comprova que skills, hooks ou plugins estão ativos.');
console.log('Instalação opcional e verificação manual: docs/agent-toolchain.md');
console.log('Nenhuma ferramenta foi instalada ou iniciada por este diagnóstico.');
