# Tipos com foto e Movimentações

17/11/2026. Base: `3d7a1fca105b74baa5cef2866d2d8d1341d639d0`.

O gerenciamento de tipos ganhou busca, miniaturas e formulário com foto opcional,
recorte quadrado, troca e remoção. A foto é enviada somente ao confirmar; falhas
preservam o formulário e o cadastro anterior. O catálogo compartilhado é atualizado
após a confirmação do banco. O tipo criado continua sendo selecionado na receita.

Movimentações mantém a paleta do aplicativo e separa nome, etiqueta de tipo ou
categoria, custo por unidade e estoque. Os cartões têm largura mínima de 210 px
no desktop e organização horizontal no celular. A foto do tipo tem prioridade nas
bolinhas, com a foto de um item como alternativa. Unidades abreviadas são somente
apresentação; quantidades, custos, filtros e finalização mantêm suas regras.

## Persistência e publicação

A migration `20261117145946_tipos_produto_foto.sql` adiciona apenas a coluna nullable
`tipos_produto.imagem_url`. Não altera registros, RLS ou cálculos. A imagem usa o
bucket existente `receitas-images`, no caminho `USER_ID/tipos-produto/UUID.jpg`,
com as políticas existentes que restringem gravações à pasta do dono. O tipo é
gravado com o filtro de proprietário e sua RLS atual. Não são usadas chaves privadas.

As leituras do catálogo usam `select('*')`; o contrato local `TipoProduto` acrescenta
a coluna opcional, compatível com registros antigos. O cliente e os tipos gerados
permanecem intactos. Fotos anteriores não são apagadas fisicamente ao trocar ou
remover a referência, evitando remoção de arquivos ainda utilizados. Uma falha
entre upload e gravação pode deixar um arquivo não referenciado no bucket.

Aplicar somente esta migration antes do frontend. Não executar db push/replay do
histórico remoto. A publicação na Lovable é manual pelo proprietário. Reversão:
reverter o frontend; a coluna opcional pode permanecer sem perda de dados.

## Verificação

Testes de componente cobrem criar, renomear, enviar, reabrir e remover foto;
falhas de upload/gravação não alteram o cadastro anterior. A migration é conferida
em PGlite descartável, incluindo execução repetida e preservação do registro.
O cenário `e2e/movement-design.spec.ts` usa componentes reais, conta sintética e
respostas locais para todas as APIs: desktop/mobile, overflow, abas, recorte,
upload, reabertura e remoção, com capturas para revisão visual. Nenhum teste escreve
em produção. Executar `npm run check` e `npm run test:e2e` antes de integrar.
