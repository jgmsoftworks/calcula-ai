

## Plano: Desativar Afiliados + Preparar Admin Master para Instagram Ads

### 1. Botao de Ativar/Desativar Afiliado na lista

**`src/components/afiliados/AffiliatesList.tsx`**
- Adicionar um botao de toggle (ativar/desativar) na coluna de Acoes, ao lado do botao de editar
- Usar `updateAffiliate(id, { status: 'inactive' })` ou `{ status: 'active' }` conforme estado atual
- Afiliados inativos aparecem com badge vermelho "Inativo" (ja existe no `getStatusBadge`)

### 2. Preparar Admin Master para rastreamento de campanhas Instagram

**`src/hooks/useAdminDashboardMetrics.tsx`**
- Expandir a interface `AdminMetrics` com campo `campaigns` para rastrear canais de aquisicao (Instagram, orgânico, afiliados)
- Buscar dados de `affiliate_links` com filtro por `product_type` para identificar canais
- Calcular metricas por canal: leads (cliques), conversoes, taxa de conversao, receita, custo (comissoes), CPL, LTV/CAC

**`src/components/admin/AdminChannelComparison.tsx`**
- Adicionar coluna "Origem" na tabela de canais
- Destacar visualmente canais Instagram vs Orgânico vs Afiliados
- Adicionar totalizadores na ultima linha

**`src/pages/Afiliados.tsx`**
- Na aba de Links, preparar para que links possam ser categorizados por canal (Instagram, Facebook, etc.) — isso permite que ao criar um link de afiliado, se defina a origem da campanha

**`src/components/afiliados/AffiliatesLinks.tsx`**
- Adicionar campo "Canal/Origem" ao criar links (ex: Instagram, Facebook, Google, WhatsApp, Outro)
- Isso permite rastrear de onde veio cada conversao

### 3. Campo `source_channel` nos links de afiliado

Como a tabela `affiliate_links` nao tem um campo de canal, sera necessario criar uma migration para adicionar `source_channel TEXT DEFAULT 'direto'` a tabela `affiliate_links`. Isso permite categorizar cada link como "instagram", "facebook", "whatsapp", "google", "direto" etc.

### Arquivos alterados
1. **`src/components/afiliados/AffiliatesList.tsx`** — botao ativar/desativar
2. **`src/hooks/useAdminDashboardMetrics.tsx`** — metricas por canal de origem
3. **`src/components/admin/AdminChannelComparison.tsx`** — visual melhorado com origens
4. **`src/components/afiliados/AffiliatesLinks.tsx`** — campo de canal ao criar link
5. **Migration SQL** — adicionar coluna `source_channel` em `affiliate_links`

### Resultado
- Admin pode desativar/reativar afiliados direto da lista
- Links de afiliado podem ser etiquetados por canal (Instagram, Facebook, etc.)
- Dashboard admin mostra metricas de conversao por canal de origem
- Ao turbinar posts no Instagram com link de afiliado tagueado, voce ve exatamente quantos cliques, conversoes e receita vieram daquele canal

