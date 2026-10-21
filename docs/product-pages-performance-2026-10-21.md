# Produtos por página — 21/10/2026

Primeiro lote do plano de otimização com prioridade à experiência. Base: `3b1949fbc8bec9fec40f1c86bb87d459f3109977`.

## Comportamento

- Estoque: mantém 40 itens e os controles Anterior/Próxima. Busca somente a página solicitada, mantendo a anterior visível durante a atualização. Filtros e página continuam na URL.
- Movimentação: começa com até 40 produtos. A rolagem perto do final busca o próximo lote; o botão Carregar mais permite a mesma ação por teclado ou quando a observação de rolagem não estiver disponível. O carrinho permanece montado durante buscas, filtros e carregamentos.
- Busca: consulta o catálogo completo no servidor após 150 ms sem digitação. Nome, código interno, código de barras parcial e filtros combinados são preservados. Requisições superadas podem ser canceladas.
- Categorias: imagem e contagem vêm do conjunto completo que corresponde à busca, antes do filtro de categoria; não são calculadas somente sobre os primeiros 40 itens.
- Exportação: continua incluindo o catálogo inteiro. Agora lê lotes até o final, evitando corte pelo limite padrão da API.
- Erro de consulta não aparece como catálogo vazio. Dados já carregados continuam disponíveis durante atualização; cache e resultados anteriores são separados por conta.

## Banco e compatibilidade

Migração aditiva `20261021131343_product_pages.sql`, aplicada no projeto correto da Calcula Aí. Acrescenta uma função de leitura com `SECURITY INVOKER`, `search_path` vazio e filtro pelo `auth.uid()`. Não aceita parâmetro de dono. Execução liberada apenas ao papel authenticated; RLS original permanece ativa. Não modifica produtos, saldos, fórmulas, gatilhos ou outras funções. A versão anterior da aplicação continua funcionando.

Para reverter o frontend, retornar ao commit-base e republicar. A função adicional pode permanecer sem uso; não é necessário desfazer dados de usuários.

## Evidência

Comparação somente leitura no banco, sob as permissões do usuário dono do maior catálogo. Tamanho do JSON serializado, sem compressão e sem cabeçalhos de rede:

| Medida | Antes | Depois |
| --- | ---: | ---: |
| Produtos retornados na abertura | 778 | 40 |
| Bytes de JSON | 418.949 | 26.090 |
| Total informado para a navegação | 778 | 778 |

Redução de aproximadamente 93,8% na resposta inicial de produtos, incluindo os resumos de categorias na nova resposta. Não representa uma porcentagem medida de melhora no tempo de abertura da tela.

Verificações no PostgreSQL passaram: todas as páginas concatenadas equivalem ao catálogo inteiro e à mesma ordem; filtros de categoria, marca, unidade, estoque mínimo, código com zeros à esquerda e código de barras parcial; busca literal com caracteres especiais; página fora do limite; outra identidade recebe catálogo, total e categorias vazios; papel anônimo sem permissão; execução com permissões do chamador. Nenhuma gravação em dados comerciais foi usada nesses testes. O diagnóstico de segurança não apontou esta função.

Suite completa: 131 testes passaram, mais dois testes adicionados e aprovados para carregamento incremental e alternativa manual (133 no conjunto). TypeScript e build de produção aprovados. Testes novos verificam paginação, totais completos, pesquisa após pausa de digitação, cancelamento, isolamento de conta e preservação de conteúdo durante atualização.

## Validação pendente na prévia

A prévia da Lovable está protegida por login. O acesso do conector ao projeto não autentica automaticamente o navegador. Ainda é necessário concluir o login para cronometrar a versão anterior e a nova nas mesmas condições, inspecionar celular/teclado/rolagem, conferir o carrinho e exportar Excel pela interface. Não publicar antes desta conferência. Não há neste relatório tempos de carregamento medidos na Lovable.

Próximos lotes, após validar este: painel/históricos e consultas sobrepostas; sugestões do editor de receitas; bibliotecas de exportação restantes. Receitas já possuem paginação no servidor e não foram refeitas neste lote.
