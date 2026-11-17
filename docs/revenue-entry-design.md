# Lançamentos de faturamento — 17/11/2026

Base revisada: `f49e24106e5120a29c1118271517c002cdbb4913`.
`MediaFaturamento` agora separa resumo, formulário, evolução e histórico, com a
paleta azul existente, rótulos acessíveis e layout responsivo. O histórico usa
colunas alinhadas e rolagem interna a partir de 420 px; formulário e gráfico
ficam lado a lado em desktop e empilhados no celular.

As fórmulas, moeda e dados de `faturamentos_historicos` são preservados. A média
continua sendo a soma dividida pela quantidade de lançamentos; o gráfico mostra
os seis últimos registros, sem agrupamento adicional. A tela aguarda a gravação
antes de atualizar o histórico e confirmar sucesso. Falha mantém valores e
entrada para nova tentativa. Controles ficam desabilitados enquanto carrega ou
salva, evitando edição antes da leitura inicial.

Validação: `npm run check` e E2E isolado desktop/celular, incluindo valor com
centavos, persistência após recarregar, falha de gravação e exclusão. Reversão:
reverter o componente e seu teste. Não requer migração de dados. Publicação do
frontend continua manual pela Lovable, feita por João.
