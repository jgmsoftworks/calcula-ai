# Rótulos nutricionais por marca

## Fluxo

- Adicionar rótulo abre a lista de marcas cadastradas no produto quando há mais de uma. Com uma única marca, abre diretamente. Produto sem marca oferece retorno a Estoque & Custos para cadastrá-la.
- Cada marca tem um único rótulo: escolher uma marca existente abre seu cadastro sem duplicar ou sobrescrever os valores.
- Marca em destaque e setas anterior/próxima para navegar. Cada cadastro mantém sua referência, linhas e foto. Durante o OCR, a navegação entre marcas fica bloqueada; sair da guia cancela a leitura pendente.
- Nutriente e unidade são campos de texto livres, com sugestões opcionais. Não há lista obrigatória de nutrientes. A conferência considera apenas a marca, referência e linhas preenchidas. Ausência permanece diferente de zero.
- Adicionar linha e câmera continuam no mesmo formulário. Na importação inicial por foto, a marca é escolhida antes de incorporar os dados. OCR não troca a marca escolhida e não sobrescreve valores manuais.
- Receitas e cálculos nutricionais derivados estão fora desta etapa.

## Dados e implantação

Migração `20261013000216_stock_nutrition_by_brand.sql`: nova coluna JSONB opcional `produtos.rotulos_nutricionais`, com coleção de rótulos v2 e identificadores estáveis. Uma constraint valida estrutura, limites, duplicidades, estado de conferência e propriedade do caminho da foto.

A coluna v1 permanece intacta para clientes ainda publicados na versão anterior. A interface converte o rótulo antigo ao abrir e salva a coleção na coluna nova; uma coleção já existente tem precedência. Não há reescrita em massa. Fotos ainda referenciadas pelo legado são preservadas.

Os rótulos são gravados no mesmo UPDATE do produto. Fotos novas que já tenham sido enviadas são removidas se algum upload posterior ou a gravação falhar; fotos antigas só são removidas após sucesso. As políticas de proprietário existentes continuam valendo. A função de validação é SECURITY INVOKER, sem acesso anônimo.

Consultas gerais de estoque não carregam as colunas nutricionais; o editor busca os rótulos ao abrir o produto.

## Verificação

- 88 testes passaram: texto livre, zero/ausência, conversão do legado, escolha e duplicidade de marca, navegação, isolamento de foto/OCR, salvamento da coleção completa e limpeza de upload parcial.
- SQL em transação revertida: duas marcas com nutrientes livres, rejeição de duplicidades/valores inválidos/foto de outra conta, preservação de custos/estoque/legado e bloqueio de leitura/gravação entre proprietários.
- Verificação responsiva em Firefox com componentes reais e dados simulados, nas larguras 320, 768 e 1440 px: escolha, edição, setas, persistência ao reabrir e ações no rodapé. Não equivale a teste em aparelhos físicos.
- TypeScript, lint dos componentes alterados e build de produção verificados. Aviso preexistente de chunks maiores que 500 kB permanece.
