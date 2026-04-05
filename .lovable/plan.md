

## Problema (resumo simples)

Quando você está criando ou editando uma receita e vai adicionando ingredientes, embalagens ou mão de obra, a aba de precificação às vezes não atualiza os valores na hora. Ela fica mostrando números antigos (ou zerados) até você salvar, sair e entrar de novo. Aí "magicamente" corrige.

**Por quê?** Porque a aba de precificação olha para os dados salvos no banco, e não para o que você acabou de digitar nas abas anteriores. Como você ainda não salvou, ela não enxerga as mudanças.

## Solução (resumo simples)

Fazer a aba de precificação olhar para o que você está digitando **agora**, em vez de olhar para o banco de dados. Assim, conforme você adiciona um ingrediente ou muda o rendimento, o custo e o lucro já atualizam na hora, sem precisar salvar e reabrir.

## Segurança do banco de dados

- **Zero alteração no banco de dados.** Nenhuma tabela nova, nenhuma migração, nenhuma mudança em regras de segurança.
- A correção é 100% visual/frontend: apenas passa as informações que já existem na tela para o lugar certo.
- O fluxo de salvar continua igual: só grava no banco quando você clica em "Salvar" ou "Atualizar".

## Arquivos alterados

- `ReceitaForm.tsx` — passa os dados temporários (que já existem) para a aba de precificação
- `ProjecaoTab.tsx` — permite que a mão de obra também fique no estado temporário (como já funciona para ingredientes e embalagens)

Nada mais.

