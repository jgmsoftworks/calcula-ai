## Problema
Ao "apagar" um produto, o sistema faz **soft delete** (`ativo = false`). O código interno (ex: 643) continua existindo no banco, e o índice único `(user_id, codigo_interno)` bloqueia a reutilização — mesmo o produto não aparecendo mais na lista.

## Solução
Tornar o índice único **parcial**: só vale para produtos ativos. Assim, códigos de produtos desativados ficam livres para reuso.

### 1. Migration (banco)
- Remover a constraint/índice único atual de `produtos (user_id, codigo_interno)`.
- Criar índice único parcial: `UNIQUE (user_id, codigo_interno) WHERE ativo = true`.
- Atualizar a função `gerar_proximo_codigo_interno` para considerar apenas produtos ativos (`WHERE user_id = p_user_id AND ativo = true`), evitando pular números de produtos desativados.

### 2. Código (frontend)
Nenhuma mudança necessária — `createProduto` e `updateProduto` já tratam erro `23505` com a mensagem correta, que agora só dispara em conflito real com produto ativo.

## Validação
- Criar produto código 643 → apagar → criar novo com 643 → deve funcionar.
- Tentar criar dois produtos ativos com mesmo código → deve continuar bloqueando.

## Fora de escopo
- Hard delete de produtos (mantém histórico em movimentações/receitas).
- Mudanças visuais.