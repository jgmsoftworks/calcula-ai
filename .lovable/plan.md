## Problema

No celular, o modal "Preview da Receita" (`ReceitaPreviewModal.tsx`) está com:
- Conteúdo cortado nas laterais (sem padding interno suficiente)
- Tabelas (Sub-receitas, Ingredientes, Embalagens, Mão de Obra) com overflow horizontal mas sem rolagem perceptível — colunas espremidas e texto quebrando em pedaços ("CARNE / DE / SECA")
- Grid "Informações Gerais" forçando 2 colunas no mobile, deixando valores cortados ("1 Unidade (un...")
- Título grande demais ocupando muito espaço
- Footer/botões podem sair da área visível

## Solução (apenas UI/responsividade — sem mudar lógica)

**1. `src/components/receitas/ReceitaPreviewModal.tsx`**
- `DialogContent`: trocar `w-full max-w-[95vw]` por `max-w-[100vw] sm:max-w-[95vw] lg:max-w-5xl`, adicionar `p-4 sm:p-6` e garantir `overflow-x-hidden` no container externo.
- `DialogTitle`: `text-xl sm:text-2xl` para caber no mobile.
- Grid "Informações Gerais": `grid-cols-1 sm:grid-cols-2` (em vez de sempre 2 colunas).
- Cada bloco de tabela: envolver em wrapper com `-mx-4 sm:mx-0` + `overflow-x-auto` real, e adicionar `min-w-[560px]` na `<Table>` para forçar rolagem horizontal limpa em vez de quebrar texto em sílabas.
- Resumo Financeiro: usar `grid-cols-1 sm:grid-cols-2` se hoje for fixo.

**2. Validação**
- Testar no viewport mobile (375px) abrindo o preview de uma receita com sub-receitas.
- Conferir que: título cabe, info geral empilha em 1 coluna, tabelas rolam horizontalmente sem cortar texto, botões do footer aparecem.

## Fora de escopo
- Outras telas (já ajustadas em iterações anteriores)
- Lógica de cálculo, dados, queries
- Mudanças de design system / cores / tipografia
