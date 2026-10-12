# Otimização de receitas — 12/10/2026

A lista montava todas as receitas e carregava as bibliotecas de exportação ao abrir. O editor também tinha um efeito que recriava e salvava a lista de sub-receitas a cada renderização, provocando atualizações contínuas.

## Alterações

- Consulta e renderização de 24 receitas por página, com ordenação estável, busca e filtros no servidor. Página e filtros ficam na URL ao abrir e voltar do editor.
- Cache do React Query separado por usuário, filtro e página; conteúdo anterior durante atualização, cancelamento de consultas superadas e invalidação após salvar/excluir/duplicar ou receber eventos.
- Exportação busca todos os registros filtrados em lotes de 250, incluindo conjuntos maiores que 1.000. XLSX e jsPDF são importados ao exportar.
- Contagens de componentes usam as relações já carregadas para custo; foram removidos três agregados duplicados da consulta.
- Sugestões começam com 20 resultados, com busca sobre o catálogo carregado e botão para mostrar mais. Removidos os efeitos que copiavam arrays filtrados para estado.
- Etapas do editor usam seletor em áreas estreitas e guias em áreas largas. Os campos, tabelas e resumos respondem à largura disponível no editor, considerando a barra lateral.
- Botões de ação permanecem montados entre atualizações e receberam áreas de toque maiores.
- Arquivos compilados usam hash de conteúdo, sem timestamp que invalidava o cache em cada build.
- Falha no carregamento de uma relação da receita interrompe a abertura do formulário, evitando apresentar dados incompletos como vazios.

## Banco

Migração `20261012205154_optimize_recipe_loading.sql` aplicada no projeto Calculaí:

- Oito índices nas referências de ingredientes, embalagens, mão de obra, sub-receitas e passos.
- RPCs `calcular_custo_receita`, `atualizar_preco_receita` e `recalcular_todas_receitas` passam a executar com as permissões do chamador. Corpos e fórmulas não foram modificados.
- Gatilhos existentes de atualização de custos continuam ativos com suas permissões próprias. Foi removida a rotina do navegador que gravava preços apenas por abrir a lista. As 161 sub-receitas verificadas estavam consistentes com os custos.

## Verificação

- 59 testes automatizados: criação/edição/retorno, falha ao salvar, filtros e paginação, seletor de etapas, cálculo com conversão e rendimento, sugestões e exportação de 1.001 receitas sem truncamento.
- TypeScript e build de produção aprovados; lint dos módulos novos e da lista sem erros.
- No banco, a comparação dos custos sob a identidade do dono passou; uma identidade diferente não enxerga a receita nem obtém seu custo. Os oito índices e a execução das três RPCs como invocador foram confirmados.
- Manifesto do build confirmou que a árvore de imports estáticos da página de receitas não contém XLSX nem jsPDF.

Benchmark somente leitura, com RLS, após os índices: seleção representativa de receitas com contagens de três componentes e soma da mão de obra. Três execuções por cenário:

| Cenário | Registros | Tempos no PostgreSQL | Blocos em cache acessados |
| --- | ---: | --- | ---: |
| Lista inteira | 382 | 14,172 / 13,748 / 14,060 ms | 11.298 |
| Página | 24 | 1,007 / 1,058 / 0,979 ms | 600 |

Esses tempos não incluem rede, renderização ou a consulta completa do PostgREST. A redução inicial de cartões nesse conjunto é de 93,7%.

## Limites e publicação

A verificação automatizada usa DOM simulado; não substitui a inspeção visual em aparelhos reais. A velocidade completa em celular, tablet e desktop ainda precisa ser medida na versão publicada. Não houve publicação do site nem uso de geração da Lovable. A publicação fica com o responsável pelo projeto.

Comandos: `npx vitest run --reporter=dot`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run build -- --manifest`.
