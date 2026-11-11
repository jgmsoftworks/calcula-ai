# Verificações e dívida conhecida

| Comando | O que verifica |
| --- | --- |
| `npm run typecheck` | Frontend, Vite, configs de teste e E2E; não todo o runtime Deno |
| `npm run lint` | Todas as ocorrências ESLint, inclusive dívida anterior |
| `npm run lint:check` | Diagnósticos novos acima da baseline explícita |
| `npm run test:unit` | Componentes/hooks/helpers de `src` |
| `npm run test:billing` | Billing com doubles de Supabase, Stripe e SMTP |
| `npm run test:database` | Todos os testes de `supabase/tests`, PGlite, um worker |
| `npm run test:recipe-db` | Recorte de salvamento/remoção de receitas |
| `npm run test:trial` / `test:portugal` | Cenários de banco isolados existentes |
| `npm run test:tooling` | Regressão da comparação de lint e bloqueio de rede |
| `npm test` | Todas as suítes acima, sem duplicar os testes de `src` da configuração de geladeira |
| `npm run test:e2e` | Smoke de entrada pública, redirecionamento e 404 em desktop/mobile |
| `npm run check` | Tipos + lint contra baseline + testes isolados + build |
| `npm run check:all` | Verificações anteriores + E2E |

O workflow `Quality` roda em PR/push configurado, com permissão de leitura, sem
secrets e sem deploy. Actions fixadas por commit. Só bloqueia merge se required
checks forem configurados no GitHub; não presumir proteção pela existência do YAML.

## Baseline inicial

Em `35dabe14ed155198c289e354d32e9a01ff8bb591`, a execução integral encontrou
**442 erros e 68 avisos ESLint**. Predominam `no-explicit-any` e regras de hooks.
Não foram desligadas regras para eliminar esses números.

`quality/eslint-baseline.json` registra arquivo, regra, severidade, mensagem, hash
da linha e quantidade. Inserir linhas acima preserva a comparação; mudar a linha
da ocorrência, adicionar outra regra/arquivo ou aumentar a quantidade falha.
Erros fatais de parser nunca são aceitos. É uma trava contra aumento da dívida,
não uma declaração de lint limpo ou correção funcional.

`npm run lint` continua retornando falha enquanto houver dívida. Ao corrigir uma
ocorrência, reduza sua entrada em mudança revisada. Não há comando de expansão
automática. Nunca aumentar a baseline para aprovar uma regressão.

## Isolamento e limites

`scripts/run-isolated.mjs` bloqueia HTTP/fetch/WebSocket em Node e workers, e usa
o PGlite do lockfile. Testes fornecem doubles. Isso reduz conexões acidentais;
não é sandbox contra código malicioso nem bloqueio de todos os protocolos.

E2E importa `playwright-fixture.ts`: somente servidor local, service workers
bloqueados e WebSockets externos fechados. Novos testes devem usar essa fixture
e respostas locais para APIs, sem contornar o isolamento.

PGlite cobre SQL/roles em fixtures selecionadas, não todos os serviços Supabase.
Billing com stubs não prova integração real de webhook/e-mail. O E2E inicial
é smoke público, sem jornadas autenticadas completas de receita/estoque/Kanban.
Essas jornadas exigem fixtures de usuário/dados e revisão dos contratos atuais.

## Registro inicial e próximos trabalhos

Antes deste ciclo, passaram 52 arquivos/311 testes de `src`, 26 testes billing,
48 SQL de receitas, 12 de rendimento, as suítes de geladeira e 26 cenários
trial/Portugal. Tipos e build passaram. Os resultados posteriores consolidados
ficam na PR, sem contar novamente os testes de `src` repetidos na configuração
focada de geladeira.

Trabalhos separados: corrigir peers; tratar XLSX/jsPDF com fixtures de importação
e PDF; reduzir dívida por domínio; ampliar E2E; testar contratos Supabase isolados;
reconciliar inventário remoto; definir scans de dependências/segredos. Esses itens
não estão resolvidos apenas pela criação do CI.

Mudanças em autenticação, precificação, assinaturas/pagamentos ou banco precisam
de autorização específica. A reversão deste ciclo é por arquivos de desenvolvimento
e documentação, sem reversão de dados.
