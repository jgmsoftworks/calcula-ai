# Planos e Assinaturas — nova estrutura com fonte central e central no Master ADM

## O que existe hoje (verificado)

- Planos vivem hardcoded em `src/hooks/usePlanLimits.tsx` (`PLAN_CONFIGS`: free / professional R$ 49,90 / enterprise R$ 89,90) e são repetidos em `src/pages/Checkout.tsx`, `src/pages/AffiliatePlanSelector.tsx`, `src/pages/Planos.tsx` e nos modais de plano.
- Price IDs e Product IDs estão espalhados em 6 edge functions (`create-checkout`, `affiliate-checkout`, `check-subscription`, `stripe-webhook`, `process-stripe-payment`, `sync-stripe-sales`, `sync-affiliate-sales`).
- Já existe a tabela `payment_links` (plan_type, billing, url, price_id, active) editável no `AdminStripe`.
- Limites por plano estão na função de banco `check_plan_limits` (free/professional/enterprise), usada em todo o app.
- `profiles.plan` guarda a chave do plano (34 contas `free`, 4 `professional`, 4 `enterprise`) e `profiles.plan_expires_at` a validade.
- Master ADM já é validado no backend via `has_role_or_higher('admin')` e o helper `requireAdmin` em `supabase/functions/_shared/stripeAdmin.ts`; existe `admin_actions` para auditoria.

## Decisões confirmadas

- Apenas cobrança **mensal** por enquanto (a opção Anual sai das telas; os Prices anuais antigos continuam existindo na Stripe intactos).
- Lite R$ 9,90 / Profissional R$ 29,90 / Empresarial R$ 49,90.
- Lite mantém exatamente os limites do plano Grátis atual (30 produtos, 5 receitas, 1 markup, sem PDF).
- Contas `free` existentes entram em **carência** (padrão 30 dias, ajustável pelo Master ADM antes de aplicar) — sem cobrança automática.
- Novos cadastros ganham **trial de 7 dias** no Lite.

## O que será feito

### 1. Fonte central de planos no banco

Nova tabela `public.planos` (chave interna estável, nunca renomeada):

- `slug` (`lite`, `professional`, `enterprise`) — chave permanente; `free` passa a ser um apelido histórico mapeado para `lite`
- `nome_publico`, `descricao`, `preco_centavos`, `moeda`, `periodicidade`
- `stripe_product_id`, `stripe_price_id` (atual), `versao_preco`, `ativo`, `ordem`, `limites` (jsonb), `features` (jsonb)
- `updated_at` / `updated_by`

Tabelas de apoio:

- `planos_precos_historico`: plano, preço, stripe_price_id, `vigente_de`, `vigente_ate` (nulo = atual) — nunca apagado, é o que identifica preço legado.
- Auditoria reaproveita `admin_actions` (usuário, ação, plano, valor anterior/novo, price anterior/novo, data).

Leitura pública (anon+authenticated) apenas de planos ativos; escrita somente por Master ADM via edge function.

### 2. Migração de dados sem quebrar nada

- Semear `planos` com os 3 planos e os Price IDs **novos** (criados na Stripe no passo 3), e semear o histórico com os preços antigos (R$ 49,90 e R$ 89,90 + seus price_ids) já marcados como legado.
- `profiles.plan`: renomear `free` → `lite` mantendo compatibilidade (a função `check_plan_limits` passa a aceitar `lite` com os mesmos limites do antigo `free`).
- Novas colunas em `profiles`: `trial_ends_at` e `grace_period_ends_at`, preenchidas para as 34 contas atuais com hoje + 30 dias. Nenhuma cobrança é disparada.

### 3. Stripe — só criação, zero alteração

- Criar 3 **novos** Prices mensais (Lite R$ 9,90, Profissional R$ 29,90, Empresarial R$ 49,90) reutilizando os Products existentes quando possível; Lite ganha Product novo.
- Nenhum Price, Product, Customer ou Subscription existente é alterado, arquivado ou cancelado.
- As assinaturas ativas hoje permanecem no price_id atual — o sistema passa a mostrá-las como "Preço legado".
- `payment_links` continua funcionando; as linhas `yearly` ficam inativas para novas vendas.

### 4. Frontend sem preços hardcoded

- Novo hook `usePlanos()` lê a tabela `planos` (com cache) e vira a única fonte de nome/preço/limites/features.
- `PLAN_CONFIGS` deixa de conter preço/nome: `usePlanLimits`, `Planos.tsx`, `Checkout.tsx`, `PlanCard`, `PlanSelector`, `UpgradePlansModal`, `AffiliatePlanSelector` passam a consumir `usePlanos()`.
- Toggle Mensal/Anual removido das telas de plano.

### 5. Central "Planos e Assinaturas" no Master ADM

Nova rota admin com 4 abas:

- **Planos** — cards com nome, preço atual, status, nº de assinantes, Stripe Product, Stripe Price, última alteração, botão *Editar plano* (preço e nome público).
- **Assinantes** — cliente, e-mail, plano, preço contratado × preço público atual, status, customer/subscription/price IDs, próxima cobrança e badge **Atual / Legado**.
- **Histórico de preços** — por plano, faixas de vigência com marcação ATUAL/LEGADO.
- **Sincronização** — status Stripe × banco, última verificação e botão *Verificar sincronização* (somente leitura, aponta divergências, nunca sobrescreve).

### 6. Alteração de preço pelo Master ADM (fluxo seguro)

Edge function `admin-planos` (usa `requireAdmin`):

1. valida permissão e o novo valor;
2. cria o novo Price na Stripe;
3. só após retorno OK: atualiza `planos`, fecha a faixa anterior no histórico e abre a nova, grava auditoria.

Se a Stripe falhar, nada é gravado no banco. Alteração de nome público não toca no `slug` nem na Stripe. Diálogo de confirmação obrigatório antes de executar, com o texto explicando que assinaturas existentes continuam no preço atual.

## Detalhes técnicos

- Backend: edge functions `admin-planos` (CRUD/preço/nome), `admin-planos-assinantes` (lista subscriptions com comparação legado/atual) e `admin-planos-sync` (verificação). Todas usam `_shared/stripeAdmin.ts`; a secret Stripe nunca sai do servidor.
- Edge functions de checkout passam a buscar o price_id na tabela `planos` em vez do mapa hardcoded; os mapas antigos de Product→plano continuam como fallback para reconhecer assinaturas legadas.
- `check_plan_limits` é atualizada para ler os limites de `planos.limites`, preservando exatamente os números atuais.

## Fora de escopo

Nenhuma migração de assinantes existentes para os novos preços — isso ficará como ação separada e explícita, se um dia for pedida.
