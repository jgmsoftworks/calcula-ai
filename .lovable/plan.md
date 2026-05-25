## Objetivo
Quando o pagamento de um cliente falhar ou a assinatura for cancelada:
1. **Admin** vê uma aba dedicada no painel master com a lista de clientes inadimplentes + dados de contato (telefone, whatsapp, email) para acionamento manual.
2. **Cliente** vê um banner/modal grande e persistente avisando do problema, listando o que vai perder se não pagar, e deixando claro que **nada será apagado** — apenas o acesso fica bloqueado até a regularização.

## O que muda

### 1. Banco — nova tabela `subscription_issues`
Registra cada problema de cobrança para o admin agir e para o app saber que precisa mostrar o aviso.

Campos relevantes:
- `user_id`, `email`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_invoice_id`
- `issue_type`: `payment_failed` | `subscription_canceled` | `past_due`
- `status`: `pending` (precisa contato) | `contacted` | `resolved` | `ignored`
- `amount_due`, `attempt_count`, `next_retry_at`, `grace_period_ends_at`
- `failure_reason` (texto vindo do Stripe), `admin_notes`
- `contacted_by`, `contacted_at`, `resolved_at`
- `created_at`, `updated_at`

RLS:
- Admin (`has_role_or_higher('admin')`): SELECT/UPDATE de tudo.
- Usuário: SELECT apenas dos próprios registros (para o banner do cliente).
- INSERT só via service role (webhook).

Também adiciono em `profiles`:
- `subscription_status` (`active` | `past_due` | `canceled` | `grace`) — leitura rápida pro front sem joins.
- `access_blocked_at` — quando o acesso passou a ser bloqueado (após o período de carência).

### 2. Webhook do Stripe — `stripe-webhook/index.ts`
Completar os eventos que hoje só logam:

- **`invoice.payment_failed`** → cria/atualiza linha em `subscription_issues` com `issue_type='payment_failed'`, define `grace_period_ends_at = now() + 7 dias`, atualiza `profiles.subscription_status='past_due'`. NÃO faz downgrade ainda.
- **`customer.subscription.deleted`** (já existe) → criar registro `issue_type='subscription_canceled'`, marcar `profiles.subscription_status='canceled'` e `access_blocked_at=now()`. O downgrade do plano já existe — mantemos.
- **`customer.subscription.updated`** com `status='past_due'` ou `unpaid` → idem `payment_failed`.
- **`invoice.payment_succeeded` / subscription voltando para `active`** → marca o issue mais recente como `resolved`, limpa `subscription_status` e `access_blocked_at`.

### 3. Painel Admin — nova aba "Inadimplência"
Nova rota `/admin/inadimplencia` (ou aba dentro de `AdminUsers`). Componente lista:
- Cliente (nome, email)
- Telefone / WhatsApp (com botão "Abrir WhatsApp" usando `wa.me` + mensagem pré-pronta)
- Tipo do problema (badge: Falha de pagamento / Cancelada / Em atraso)
- Valor devido, tentativas, próxima retentativa
- Motivo da falha (vindo do Stripe — cartão recusado, expirado, etc.)
- Status interno (Pendente / Contatado / Resolvido / Ignorado)
- Ações: marcar como "Contatado" (com campo de notas), "Resolvido", "Ignorado"

Filtros: status, tipo, período. Ordenação por `created_at` desc.
Acesso protegido por `has_role_or_higher('admin')`.
Card no dashboard admin mostrando contador de `pending`.

### 4. Cliente — Banner de aviso bloqueante
Componente `SubscriptionIssueBanner` montado dentro de `AppLayout` (todas as rotas autenticadas):

- Lê `profiles.subscription_status` (ou query em `subscription_issues` do próprio user).
- Se `past_due` (dentro do período de carência): banner amarelo no topo, **não bloqueia uso**, com botão "Regularizar pagamento" → abre Stripe customer portal.
- Se `canceled` ou `access_blocked_at` setado: tela cheia (modal não-dismissível) com:
  - Título grande: "Seu acesso está bloqueado"
  - Mensagem tranquilizadora: **"Nenhum dado foi perdido. Tudo que você cadastrou (receitas, produtos, markups, movimentações, folha de pagamento) continua salvo e te esperando."**
  - Lista do que está bloqueado (recursos do plano que ele tinha)
  - Botão primário: "Regularizar pagamento" (customer portal)
  - Botão secundário: "Falar com suporte" (WhatsApp já existente)
  - Logout disponível

Hook `useSubscriptionStatus` consulta `profiles.subscription_status` e revalida quando volta da janela do Stripe.

### 5. Notificações
- Quando webhook detecta falha → insere também em `notifications` (já existe) para o user com mensagem amigável.
- Edge function opcional `notify-admin-overdue` que envia email para o admin quando há novos `pending` (deixar como follow-up, fora desse escopo).

## Fora do escopo
- Cobrança automática por email/SMS pro cliente (Stripe já faz Smart Retries).
- Política de retenção (apagar dados após X meses no free) — discutimos antes mas não foi pedido aqui.
- Exportação automática dos dados antes do bloqueio.

## Detalhes técnicos
- Período de carência: **7 dias** após primeira falha antes de bloquear (configurável depois).
- O bloqueio é apenas de UI/rota — RLS continua permitindo o user ler os próprios dados (nada é apagado, e quando ele pagar o acesso volta instantâneo).
- WhatsApp do admin: gera link `https://wa.me/{telefone_cliente}?text=Olá%20{nome}...` com mensagem template editável.
- O webhook usa service role; o front usa anon key + RLS.
