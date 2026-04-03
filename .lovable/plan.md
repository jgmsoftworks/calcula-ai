

## Problema

Quando o usuário abre uma receita na aba de Precificação, cada `MarkupCard` faz sua própria query individual ao Supabase para buscar detalhes de `user_configurations` (linha 75-80 do MarkupCard.tsx). Enquanto essa query não retorna, os percentuais de custos indiretos (impostos, taxas, comissoes) ficam em 0, fazendo Lucro Liquido = Lucro Bruto. Ao carregar, os valores "pulam" para os corretos. O skeleton atual resolve o flash visual, mas o loading demora porque sao N queries separadas (uma por card).

Alem disso, o `PrecificacaoTab` ja faz a mesma query em `handleSelectMarkup` (linha 150-156), duplicando o trabalho.

## Solucao: Prefetch no pai (sem mudancas no banco)

Buscar todas as configs de markup em uma unica query no `PrecificacaoTab` e passar como prop. Zero alteracoes no banco de dados.

## Mudancas

### `src/components/receitas/PrecificacaoTab.tsx`
- Adicionar `useEffect` que faz uma unica query: `supabase.from('user_configurations').select('*').eq('user_id', user.id).ilike('type', 'markup_%')`
- Armazenar resultado em um `Map<string, any>` (chave = type, valor = configuration)
- Passar para cada `MarkupCard` via nova prop `preloadedDetalhes`

### `src/components/receitas/MarkupCard.tsx`
- Adicionar prop opcional `preloadedDetalhes?: MarkupDetalhado | null`
- Se `preloadedDetalhes` fornecido: usar direto, setar `isLoadingDetalhes = false` imediatamente
- Se nao fornecido: manter fallback atual (query individual)
- Resultado: de N queries para 1, loading de ~500-1000ms para ~150ms

### Seguranca
- Nenhuma migracao SQL
- Nenhuma alteracao em tabelas ou RLS
- Apenas otimizacao de leitura no frontend

