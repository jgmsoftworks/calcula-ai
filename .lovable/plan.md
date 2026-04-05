

## Problema

Cada aba (Ingredientes, Embalagens, Sub-receitas) faz sua própria consulta ao banco de dados quando você clica nela. Como cada aba só monta quando é selecionada, toda vez que você troca de aba, espera o carregamento do zero.

Ingredientes e Embalagens buscam a **mesma tabela** (`produtos`) separadamente — ou seja, a mesma query roda duas vezes.

## Solução

Carregar os dados **uma única vez** no `ReceitaForm.tsx` (o componente pai) assim que o modal abre, e passar os dados prontos para as abas filhas. Assim:

- Produtos são buscados 1x e repassados para Ingredientes e Embalagens
- Sub-receitas são buscadas 1x e repassadas para a aba de Sub-receitas
- Quando você troca de aba, os dados já estão lá — sem espera

## Arquivos alterados

1. **`ReceitaForm.tsx`** — adicionar `useEffect` que carrega produtos e sub-receitas ao abrir o modal; passar via props
2. **`IngredientesTab.tsx`** — receber `allProdutos` via props em vez de buscar internamente
3. **`EmbalagensTa.tsx`** — mesmo: receber `allProdutos` via props
4. **`SubReceitasTab.tsx`** — receber lista de sub-receitas disponíveis via props em vez de buscar internamente

Zero alteração no banco de dados.

