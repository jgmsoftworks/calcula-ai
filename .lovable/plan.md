
Problema

Na tela inicial de receitas, o mesmo atraso acontece porque o `ReceitaCard` ainda carrega os detalhes do markup sozinho, depois que o card já apareceu. Resultado:
- a lista renderiza primeiro
- o `Lucro Líquido` entra vazio ou com fallback
- alguns instantes depois cada card faz sua query em `user_configurations`
- então o valor “corrige” e muda na tela

Pelo código, isso ocorre em `src/components/receitas/ReceitaCard.tsx`, enquanto a aba de precificação já foi otimizada em `PrecificacaoTab.tsx` para buscar tudo em lote.

Plano

1. Padronizar a estratégia da lista de receitas com a aba de precificação
- mover a busca dos detalhes de markup para `ListaReceitas.tsx`
- fazer uma única leitura de `user_configurations` com `type ilike 'markup_%'`
- guardar em um mapa por chave (`markup_nome_normalizado`)

2. Parar as queries individuais em cada `ReceitaCard`
- adicionar prop opcional para receber os detalhes já pré-carregados
- remover a dependência de fetch por card quando os dados vierem do componente pai
- manter fallback seguro só se o card for usado em outro lugar sem preload

3. Evitar o “piscado” do Lucro Líquido na listagem
- enquanto a lista estiver carregando os configs dos markups, mostrar estado estável no bloco de `Lucro Líquido`
- usar skeleton ou placeholder consistente no próprio card, sem mostrar valor parcial incorreto

4. Reaproveitar a lógica já existente
- seguir o mesmo padrão já aplicado em `PrecificacaoTab.tsx` e `MarkupCard.tsx`
- manter a mesma fórmula atual de lucro líquido, sem alterar cálculo nem estrutura do banco

5. Garantir segurança e não mexer no banco
- não haverá migration
- não haverá alteração de tabela, coluna, índice, RLS ou função SQL
- será apenas otimização de leitura no frontend, usando a mesma tabela `user_configurations`

Arquivos envolvidos
- `src/components/receitas/ListaReceitas.tsx`
- `src/components/receitas/ReceitaCard.tsx`

Detalhes técnicos
- Hoje o gargalo está no `useEffect` do `ReceitaCard`, que faz `select configuration from user_configurations` por card.
- A melhoria mais eficiente e mais segura é trocar N queries por 1 query no componente pai.
- Isso reduz latência, elimina atualização visual tardia e segue exatamente a abordagem já usada na precificação.
- Se quiser deixar ainda mais robusto depois, dá para centralizar isso num hook compartilhado de configs de markup, mas para esta correção o caminho mais direto é `ListaReceitas` + `ReceitaCard`.
