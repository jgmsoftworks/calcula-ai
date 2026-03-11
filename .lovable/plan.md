

# Análise de Segurança - CalculaAI

## Resumo Geral

O scan de segurança encontrou **3 vulnerabilidades críticas (ERRO)** e **6 avisos (WARN)**. Vou explicar cada uma de forma clara.

---

## VULNERABILIDADES CRÍTICAS

### 1. ESCALAÇÃO DE PRIVILÉGIO — Qualquer usuário pode virar Admin
**Gravidade: CRÍTICA**

A função `user_is_admin()` verifica a coluna `is_admin` diretamente na tabela `profiles`. Como os usuários conseguem editar seu próprio perfil (via RLS policy), **qualquer usuário pode setar `is_admin = true` no seu próprio perfil** e ganhar acesso de administrador.

Isso dá acesso a:
- `affiliate_commissions`, `affiliates`, `affiliate_coupons`, `affiliate_links`, `affiliate_sales`, `backup_history`, `user_roles`
- Edge functions de admin (`admin-list-all-users`, `admin-confirm-user-email`)

**Correção**: Substituir todas as referências a `user_is_admin()` por `has_role_or_higher('admin')` que usa a tabela `user_roles` (que o usuário NÃO consegue editar). Remover a coluna `is_admin` da lógica de autorização.

### 2. Dados pessoais de fornecedores expostos publicamente
**Gravidade: ALTA**

A tabela `fornecedores` é legível publicamente quando `eh_fornecedor = true`, expondo telefone, email, endereço, CNPJ/CPF.

**Correção**: Restringir RLS para expor apenas nome e dados de marketplace, não dados pessoais.

### 3. Dados pessoais de clientes vulneráveis
**Gravidade: ALTA**

A tabela `profiles` contém nomes, telefones, emails, CPF/CNPJ, endereços, WhatsApp. Se credenciais de admin forem comprometidas (fácil pelo problema #1), todos esses dados vazam.

---

## AVISOS DE SEGURANÇA

### 4. RLS Policies com `true` (5 ocorrências)
Existem 5 policies de INSERT/UPDATE/DELETE que usam `USING (true)` ou `WITH CHECK (true)`, significando que **qualquer usuário autenticado pode modificar dados** nessas tabelas sem restrição.

### 5. Proteção contra senhas vazadas DESABILITADA
O Supabase tem uma feature que impede usuários de usar senhas que já apareceram em vazamentos de dados. Está desligada.

### 6. Edge Functions sem verificação JWT
As seguintes funções aceitam requisições **sem autenticação**:
- `create-backup` — alguém pode criar backups sem ser admin
- `admin-list-all-users` — lista TODOS os usuários (tem verificação manual de admin, mas depende da função `user_is_admin()` vulnerável)
- `admin-confirm-user-email` — confirma email de qualquer usuário
- `process-stripe-payment`, `sync-stripe-sales` — processam pagamentos

Algumas fazem verificação interna de admin, mas dependem da função `user_is_admin()` que é vulnerável.

---

## O QUE NÃO É PROBLEMA

- **Supabase Anon Key** no código: isso é **normal e esperado**. É uma chave pública, não é um secret. Toda a segurança é feita via RLS.
- **Secrets** (Stripe, OpenAI, SMTP): estão nas variáveis de ambiente do Supabase, **não no código**. Correto.
- **Service Role Key**: está apenas no servidor Supabase, **não no frontend**. Correto.

---

## Plano de Correção (por prioridade)

### Prioridade 1 — Escalação de privilégio (URGENTE)
- Migrar TODAS as RLS policies que usam `user_is_admin()` para usar `has_role_or_higher('admin')`
- Bloquear escrita na coluna `is_admin` via RLS ou removê-la totalmente
- Tabelas afetadas: `affiliate_commissions`, `affiliates`, `affiliate_coupons`, `affiliate_links`, `affiliate_sales`, `affiliate_stripe_products`, `backup_history`, `user_roles`

### Prioridade 2 — RLS permissivas
- Identificar quais 5 tabelas têm `WITH CHECK (true)` e restringir para `auth.uid() = user_id`

### Prioridade 3 — Dados de fornecedores
- Restringir campos visíveis publicamente na tabela `fornecedores`

### Prioridade 4 — Proteção de senhas
- Habilitar "Leaked Password Protection" no Supabase Dashboard

### Prioridade 5 — Edge Functions
- Adicionar verificação de auth nas edge functions que não têm (ou que dependem de `user_is_admin()`)

---

## Veredicto

**Nível de risco atual: ALTO.** A vulnerabilidade #1 é a mais grave — qualquer usuário autenticado pode se tornar admin e acessar dados de todos os outros usuários. As APIs e secrets do Stripe/OpenAI estão seguros (não expostos no frontend), mas o controle de acesso no banco de dados tem falhas exploráveis.

