# Fotos de marcas e categorias

17/11/2026. Base de código: `330453f7c0e61fd99fab884f172d0f8a075fc2aa`.

Marcas e Categorias compartilham um gerenciador com busca sem distinção de acentos,
miniaturas, criação e edição com foto opcional. O editor e o envio de imagem são
os mesmos usados por Tipos de Produto. O recorte é quadrado; o upload só acontece
quando o usuário salva. Erros preservam o formulário. O envio desse formulário
não propaga a submissão ao cadastro de produto que abriu o modal.

A foto aparece também nas opções dos seletores de marcas/categorias. Em
Movimentações, a foto cadastrada na categoria tem prioridade na bolinha;
na ausência dela, permanece a imagem de um produto. Quantidades, filtros e custos
não mudam. Cada catálogo usa uma chave de cache com tabela e proprietário.

## Dados e segurança

A migration `20261117165851_marcas_categorias_fotos.sql` acrescenta somente
`imagem_url text` nullable a `public.marcas` e `public.categorias`. Não altera
nomes, produtos ou RLS. Aplicar somente essa migration antes do frontend, sem
replay, reset ou db push. Cliente e tipos gerados Supabase não foram modificados.

As imagens usam o bucket existente `receitas-images`, com caminhos
`USER_ID/marcas/UUID.jpg` e `USER_ID/categorias/UUID.jpg`. As políticas existentes
restringem as gravações à pasta do dono. Nenhuma chave privada vai ao cliente.
Leitura e atualização de catálogo mantêm filtros de proprietário e RLS.

Produtos atualmente armazenam nomes nos arrays `marcas` e `categorias`.
Os seletores mantêm esse contrato. A verificação antes da remoção protege nomes
e também IDs legados, e falha fechada se a consulta de uso falhar. A remoção
continua lógica (`ativo=false`). Renomear mantém a semântica anterior, sem
reescrever referências de produtos nesta alteração.

Trocar/remover uma foto não apaga fisicamente o arquivo anterior. Uma falha entre
o upload e a gravação pode deixar um arquivo sem referência, como no fluxo de
fotos de tipos. Essa decisão evita remover imagens ainda referenciadas.

## Verificação e reversão

`npm run check`: tipos, baseline de lint, testes isolados e build. Testes de dados
cobrem os dois catálogos, upload, remoção de foto, falhas, propriedade, consulta
de uso por nome/ID e exclusão lógica. A regressão dos tipos permanece coberta.
`e2e/catalog-photos.spec.ts` exercita os seletores e modais reais em desktop e
celular, com contas/APIs sintéticas: busca, recorte, salvamento, reabertura,
remoção, falha/retry, miniatura no seletor e ausência de submissão do produto.
O cenário de Movimentações verifica a prioridade da foto e seu fallback.
Nenhum teste usa contas reais ou escreve em produção.

A publicação do frontend é manual pelo proprietário na Lovable. Para reverter,
reverter este frontend; as colunas opcionais podem permanecer sem perda de dados.
