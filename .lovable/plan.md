## Quadrado de Consumo Médio (abaixo do botão "Sugerir fotos")

Adicionar um card informativo no `ProdutoForm.tsx`, logo abaixo do botão "Sugerir fotos", que mostra estatísticas de movimentação dos últimos 90 dias do produto.

### O que mostrará

Card compacto com 3 linhas:
- **Total entradas** (90d) — soma de quantidade das movimentações tipo `entrada`
- **Total saídas** (90d) — soma de quantidade das movimentações tipo `saida`
- **Consumo médio mensal** — `total_saidas / 3` (90 dias = 3 meses), formatado com unidade de compra

Quando não houver movimentação, exibe "Sem movimentações nos últimos 90 dias".
Quando o produto for novo (sem ID), o card não aparece.

### Componente novo

`src/components/estoque/ConsumoMedioCard.tsx`
- Props: `produtoId: string`, `unidade: string`
- Busca via `supabase.from('movimentacoes')` filtrando `produto_id`, `user_id`, `data_hora >= now - 90d`
- Soma agrupada por tipo (entrada/saida)
- Loading skeleton enquanto carrega
- Layout: card com `bg-muted/30`, `rounded-lg`, `p-3`, fonte pequena, ícones (TrendingUp/TrendingDown/BarChart3 do lucide-react)
- Usa `formatNumber()` de `@/lib/formatters`

### Edição em `ProdutoForm.tsx`

Inserir `<ConsumoMedioCard produtoId={produto.id} unidade={watch('unidade_compra')} />` na coluna esquerda da foto, logo após o `SugestaoFotosModal`, condicionado a `produto?.id` existir (apenas em modo edição).

### Notas técnicas

- Reutiliza tabela `movimentacoes` já existente — sem mudanças no schema.
- Cálculo client-side (poucos registros por produto, OK).
- 90 dias = `new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()`.