# Calcula Aí — instruções para agentes

Leia este arquivo e os documentos do domínio afetado antes de editar. No ChatGPT
Work via GitHub, leia-os explicitamente na revisão atual; não presuma carregamento
automático de arquivos de configuração de outro cliente.

## Identidade e fontes

- Este repositório é o aplicativo: React 18, Vite 5, TypeScript, Tailwind 3,
  React Router, TanStack Query, shadcn/Radix e Supabase.
- A landing/painel está em `jgmsoftworks/landing-calculaai`, com outra stack e
  outro Supabase. Não copie suas configurações para cá.
- Backend: PostgreSQL/RLS/RPCs e Deno Edge Functions. Não migrar para Next.js,
  Drizzle, Prisma ou outro backend para seguir exemplos de um toolkit.
- Consulte [arquitetura](docs/architecture.md), [ambiente](docs/setup.md),
  [qualidade](docs/quality.md) e [decisão de adoção](docs/toolkit-adoption.md).

## Trabalho e validação

1. Confira branch, commit e alterações existentes; preserve trabalho alheio.
2. Localize a regra no código/documento de domínio atual. Não deduza preços e
   limites de memórias antigas de conversa.
3. Reproduza o problema, faça mudança pequena e teste a regressão. Não reformate
   módulos sem relação; reutilize logger, schemas, hooks e componentes existentes.
4. Use Node da `.nvmrc`, npm e `package-lock.json`. Instale para verificação com
   `npm ci --ignore-scripts --no-audit --no-fund`; veja os conflitos de peers no setup.
5. Execute `npm run check` (tipos, lint contra baseline, suítes isoladas e build).
   Para navegador, `npm run test:e2e`; para ambos, `npm run check:all`.
6. `npm run lint` mostra a dívida integral. Não desligue regras, adicione ignores,
   exclua testes ou aumente a baseline para obter aprovação.
7. Testes Node bloqueiam HTTP/fetch/WebSocket. E2E importa `playwright-fixture.ts`
   e bloqueia tráfego externo. Use mocks/dados sintéticos, sem contas reais.
8. Não declare teste aprovado sem execução. Informe comandos, resultados e limites.

## Áreas protegidas

- Mudanças de comportamento em autenticação, precificação, planos, assinaturas,
  pagamentos e concessão de acesso precisam de autorização específica.
- Nenhum teste pode cobrar, enviar e-mail real, usar sessão de cliente ou escrever
  em produção. Os testes SQL atuais usam PGlite descartável.
- Não executar `db push`, reset, replay ou repair automaticamente. O histórico
  remoto tem identificadores diferentes: esclarecer origem e equivalência antes
  de alterar migrations, funções remotas ou RLS.
- Preserve publicação manual pelo Lovable. Branch/PR não autoriza deploy.
- Não editar cliente/tipos Supabase gerados como atalho para corrigir tipos.
- Nunca colocar tokens, senhas, dumps ou dados de clientes em logs/documentos.

## Continuidade e revisão

- Registre decisões com fonte, commit/data de verificação e condição de revisão.
  Prefira links canônicos a repetir regras em vários documentos.
- Ao concluir: problema, alterações, validação, pendências e reversão. Se precisar
  interromper, acrescente objetivo, branch/commit e próximo passo.
- Revisão paralela é opcional quando solicitada. Separe negócio/regressão,
  segurança/dados e React/UX; revisores leem, um responsável integra. Não editar
  o mesmo módulo ou operar o mesmo banco em paralelo.
- Achados precisam de cenário e referência de código; deduplique e confirme.
  Quantidade de agentes não substitui testes.
