

## Plano: Corrigir delay visual no MarkupCard ao abrir receita

### Problema
Quando o usuário abre uma receita na aba de Precificação, o MarkupCard inicialmente mostra valores incorretos (Lucro Líquido = Lucro Bruto) e depois "pula" para os valores corretos. Isso acontece porque os dados de `detalhes` (impostos, taxas, comissões) vêm de uma query assíncrona ao Supabase, e enquanto não chegam, os percentuais são 0.

### Solução
Adicionar um estado de loading no MarkupCard para mostrar skeletons enquanto os dados carregam, evitando que valores incorretos apareçam.

### Mudanças

**`src/components/receitas/MarkupCard.tsx`**:
- Adicionar estado `isLoadingDetalhes` (inicia `true`, vira `false` após query retornar)
- Enquanto loading, mostrar `Skeleton` placeholders nos valores de Markup, Lucro Bruto/Líquido e Sugestão de Preço
- Importar `Skeleton` de `@/components/ui/skeleton`
- Quando os dados carregam, renderizar normalmente (sem salto visual)

