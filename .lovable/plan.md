

## Plano: Sistema de Vendedores Parceiros (reaproveitando Afiliados)

### O que muda
Adaptar o sistema de afiliados existente para funcionar como um programa de vendedores parceiros com regras de comissao especificas:
- **1a mensalidade**: 40% do valor
- **Mensalidades recorrentes** (cliente ativo): 20% do valor
- **Suporte prestado**: R$ 10/hora

### Alteracoes no banco de dados

**1. Nova tabela `vendedor_suporte_horas`** para registrar horas de suporte:
- `id`, `affiliate_id` (vendedor), `customer_email`, `data`, `horas` (decimal), `descricao`, `valor_hora` (default 10), `status` (pending/paid), `created_at`
- RLS: somente admins

**2. Adicionar coluna na tabela `affiliates`**:
- `commission_first_sale_pct` (default 40) — comissao 1a venda
- `commission_recurring_pct` (default 20) — comissao recorrente
- `support_hourly_rate` (default 10) — valor hora suporte

Isso permite que cada vendedor tenha taxas customizaveis, mas com os defaults que voce pediu.

### Alteracoes no frontend

**3. Atualizar `AffiliateForm`**:
- Trocar campos de comissao unica por 3 campos: % 1a venda (40), % recorrente (20), valor/hora suporte (R$10)
- Manter campos de nome, email, telefone, CPF, PIX

**4. Atualizar `AffiliatesList`**:
- Mostrar as 3 colunas de comissao (1a venda %, recorrente %, R$/hora)
- Mostrar total de horas de suporte prestadas

**5. Nova aba "Suporte" na pagina de Afiliados**:
- Tabela para registrar horas de suporte por vendedor/cliente
- Formulario: selecionar vendedor, cliente, data, horas, descricao
- Totalizador de horas e valor a pagar

**6. Atualizar `AffiliatesDashboard`**:
- Card adicional mostrando total de suporte pendente (horas x R$10)
- Diferenciar comissoes de 1a venda vs recorrentes nos resumos

**7. Atualizar `AffiliatesCommissions`**:
- Coluna indicando se a comissao e "1a venda (40%)" ou "recorrente (20%)" ou "suporte"
- Filtro por tipo de comissao

**8. Vincular cliente ao vendedor**:
- Na tabela `affiliate_customers`, quando um cliente e vinculado, o campo `first_purchase_date` marca a 1a compra
- Comissoes subsequentes usam 20% automaticamente baseado no `cycle_number` existente (cycle 1 = 40%, cycle 2+ = 20%)

### Arquivos envolvidos
- `supabase/migrations/` — nova tabela e colunas
- `src/hooks/useAffiliates.tsx` — adicionar CRUD de suporte, adaptar logica de comissao
- `src/components/afiliados/AffiliateForm.tsx` — novos campos
- `src/components/afiliados/AffiliatesList.tsx` — colunas atualizadas
- `src/components/afiliados/AffiliatesDashboard.tsx` — metricas de suporte
- `src/components/afiliados/AffiliatesCommissions.tsx` — tipos de comissao
- `src/components/afiliados/SupportHours.tsx` — novo componente
- `src/pages/Afiliados.tsx` — nova aba "Suporte"

### Seguranca
Tudo continua admin-only via `has_role_or_higher('admin')` nas RLS policies — nenhum vendedor tem acesso direto ao painel.

