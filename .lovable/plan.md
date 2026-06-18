## Correção proposta

O problema não é no formulário: a migração anterior criou o índice correto, mas ficou uma trava antiga no banco chamada `unique_codigo_interno_per_user`, que ainda impede reutilizar o código de produto apagado.

### O que vou fazer

1. **Remover a constraint antiga** `unique_codigo_interno_per_user` da tabela `produtos`.
2. **Remover o índice antigo com o mesmo nome**, se ainda existir.
3. **Manter apenas a regra correta**: código interno único somente entre produtos ativos (`ativo = true`).
4. **Conferir no banco** se sobrará somente o índice parcial `produtos_user_codigo_ativo_unique`.

### Resultado esperado

- Produto apagado/inativo com código `643` não bloqueia mais um novo produto com código `643`.
- Dois produtos ativos com o mesmo código continuam bloqueados normalmente.

### Detalhe técnico

A correção será feita via migration Supabase, sem alterar layout nem fluxo do estoque.