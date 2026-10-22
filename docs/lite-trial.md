# Teste gratuito do Iniciante

Novas contas recebem sete dias corridos do Iniciante, sem cartão, Checkout ou cobrança automática. O prazo nasce na criação do usuário no Supabase Auth, inclusive no Google, e usa o relógio do servidor. O Iniciante mantém os limites de `public.planos`: 30 matérias-primas ativas, 5 receitas, 1 markup normal, movimentações liberadas e sem exportação de ficha técnica em PDF.

O indicador no cabeçalho mostra os dias restantes e leva a `/planos`. Ao vencer, as telas operacionais deixam de montar; o banco bloqueia leitura e escrita operacional, inclusive RPCs e links de produção compartilhada. Planos, pagamento, saída e solicitações de privacidade continuam disponíveis. Nenhum dado é apagado pelo vencimento.

O cadastro pode ser acessado em `/auth?mode=signup&trial=1`. O destino preparado para o CTA da landing é `/auth?mode=signup&trial=1&source=landing`, com UTMs opcionais. A landing e seus Payment Links não foram alterados nesta etapa.

## Conversão em assinatura

Uma conta em teste pode contratar inclusive o próprio Iniciante. O Checkout usa os preços centralizados existentes, cobra somente após a escolha explícita do cliente e registra o ID da conta na metadata criada pelo servidor. O webhook, após confirmar o pagamento, atualiza essa mesma conta para `access_mode=subscription`, sem recriar cadastro, senha ou dados. A alteração do e-mail de faturamento não muda a conta beneficiada. Pagamento pendente não libera assinatura. Assinaturas existentes usam o portal para evitar duplicação.

## Banco e compatibilidade

- Migração: `20261022225604_lite_seven_day_trial.sql` (versão gerada pelo servidor ao aplicar a migração criada pelo CLI).
- `access_mode=legacy` preserva as 39 contas que existiam na implantação. A conferência agregada de planos/status permaneceu idêntica; nenhuma foi bloqueada.
- Novas contas usam `access_mode=trial`, `trial_started_at` e `trial_ends_at`.
- `get_my_access()` expõe somente o acesso do usuário autenticado. `get_account_access(uuid)` é exclusivo do serviço.
- 34 tabelas operacionais recebem uma política RLS restritiva adicional, preservando as regras anteriores de propriedade.
- Escritas do cliente não podem alterar plano, prazo, modo de acesso, bloqueio, status de assinatura ou privilégios. Limites de criação do teste são serializados por conta no banco.
- Administradores continuam isentos; concessões manuais pelo endpoint administrativo saem do modo de teste.
- Webhooks e rotinas de faturamento mantêm o tratamento anterior de atraso, recuperação e cancelamento.

Backend aplicado: `stripe-webhook` v78, `process-stripe-payment` v56, `affiliate-checkout` v53, `producao-compartilhada` v9 e `admin-update-user-plan` v35. O frontend sincroniza pelo GitHub/Lovable; publicar o frontend disponibiliza as novas telas no domínio de produção.

## Validação

```sh
npx vitest run
npx vitest run --config vitest.billing.config.ts
npx tsc --noEmit -p tsconfig.app.json
npm run build
```

Banco PostgreSQL isolado, sem acessar produção, cobrar ou enviar e-mail:

```sh
npm install --prefix /tmp/calcula-trial-tests @electric-sql/pglite@0.5.11
PGLITE_MODULE=/tmp/calcula-trial-tests/node_modules/@electric-sql/pglite/dist/index.js node tests/trial-database.mjs
```

A suíte verifica cadastro, adulteração de prazo/plano, limites, vencimento sem recarregar a tela, isolamento entre contas, preservação e recuperação dos dados, acesso administrativo, checkout do próprio Iniciante, pagamento pendente e conversão na mesma conta.
