# Painel e exportações — 21/10/2026

Base: `b4c556e1351ab9d876955401926a29dfd89cce06`. Publicação pela Lovable fica com o usuário, conforme orientação de seguir entregando pelo GitHub.

## Antes e depois para quem usa

| Ação | Antes | Depois |
| --- | --- | --- |
| Abrir o painel | Consultas separadas para entradas, saídas, todas as movimentações e novamente saídas para faturamento | Uma leitura completa das movimentações alimenta todos esses cálculos |
| Voltar ao painel na mesma sessão | Escondia os cards e esperava carregar tudo outra vez | Mostra o último resultado em cache enquanto busca os dados atuais; indica Atualizando |
| Abrir Relatórios de Estoque | Baixava as bibliotecas de PDF e Excel mesmo sem exportar | Carrega somente o formato escolhido ao clicar em exportar; botão mostra Gerando |
| Falha ao atualizar | Consultas com erro podiam ser tratadas como listas vazias | Mantém o último painel com aviso; sem dados anteriores, mostra erro e opção de tentar novamente |

O cache do painel é separado por usuário, mês e estado dos filtros, dura até cinco minutos sem uso e sempre revalida na montagem. Não há persistência em armazenamento local. A troca de conta não reutiliza dados da outra conta; requisições recebem sinal de cancelamento. O painel administrativo deixa de solicitar o painel comercial que não exibe.

Produtos, receitas e movimentações do painel são lidos em lotes de 500 até o fim, ordenados por ID. Não há paginação adicional visível nos cards e nenhum total é calculado somente sobre a primeira página. Em conjunto pequeno, são quatro consultas em vez de sete. Conjuntos maiores exigem páginas adicionais; não se deve anunciar quatro requisições para toda conta.

As fórmulas de estoque, compras, faturamento, estimativa de fechamento e média de CMV das receitas foram mantidas. A falta de fechamento anterior continua permitindo a estimativa existente. Erro ao consultar o fechamento passa a interromper a atualização, em vez de parecer falta de fechamento. Ao ultrapassar o antigo limite da API, os totais passam a incluir os registros que antes podiam ficar fora da resposta.

Excel e PDF mantêm linhas, filtros e totais fornecidos pelo relatório. O estado de exportação bloqueia cliques repetidos enquanto carrega e permite tentar novamente após falha. Não modifica quais registros cada relatório consulta.

## Medição e verificação

Comparação dos manifests de produção da base e deste lote: união dos arquivos JavaScript importados estaticamente por `index.html`, `AppLayoutRoute.tsx` e `RelatoriosEstoque.tsx`, contando cada arquivo uma vez. Importações dinâmicas opcionais não entram na abertura. Compressão gzip calculada localmente por arquivo; não é uma captura de rede.

| Código necessário para abrir Relatórios | Antes | Depois |
| --- | ---: | ---: |
| Arquivos JavaScript | 35 | 33 |
| Bytes sem compressão | 2.096.226 | 1.310.156 |
| Bytes comprimidos em gzip | 644.397 | 386.549 |

Redução de aproximadamente 40% em bytes comprimidos. PDF/Excel saíram das dependências estáticas dessa rota. Não é uma medição de melhora percentual no tempo de abertura.

- TypeScript aprovado.
- Build de produção aprovado; permanecem avisos sobre chunks grandes já existentes.
- Suite completa: **28 arquivos, 145 testes aprovados**.
- Novos testes: totais e gráfico com entradas, saídas, ajuste, devolução, subtotal de fallback e sub-receitas; conjunto com 1.001 registros em cada fonte; falha em página posterior; erro de fechamento; cache ao voltar; atualização em segundo plano; isolamento entre contas; painel administrativo; geração real em memória de Excel e PDF com verificação de conteúdo; bloqueio de exportação duplicada e tentativa após erro.

Não foi realizada medição em segundos nem inspeção visual deste lote na prévia autenticada da Lovable. O usuário escolheu publicar os lotes por conta própria; o fluxo de login não será tratado como condição para entregar as alterações.

## Escopo e reversão

Sem alteração de banco de dados, permissões, autenticação ou registros comerciais. Para reverter, restaurar os arquivos deste lote à base e republicar; o lote anterior de produtos permanece disponível.

Limitação preexistente observada: os filtros de período do painel calculam um intervalo para a interface, mas os cards e o gráfico continuam usando o mês atual. Este lote conserva esse comportamento; corrigir períodos exige definir quais indicadores devem acompanhar o filtro e validar as regras de CMV. Também permanecem para lotes próprios a consulta do histórico e os editores de receitas.
