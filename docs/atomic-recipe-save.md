# Salvamento completo de receitas

O editor criava/atualizava a receita e depois gravava cada grupo de componentes em requisições separadas. A edição ignorava erros das requisições de componentes e podia fechar com sucesso; uma criação interrompida podia deixar a receita incompleta e criar outra ao repetir.

## Comportamento

- O botão Criar/Atualizar chama apenas `salvar_receita_completa` para os dados da ficha, ingredientes, sub-receitas, embalagens, passos e mão de obra.
- A função roda com as permissões de quem chama (`SECURITY INVOKER`) e mantém as políticas e os gatilhos de limite/cálculo existentes. Qualquer erro desfaz toda a chamada.
- O formulário gera um ID de receita por abertura. A mesma carga mantém o mesmo ID de tentativa; mudar os dados gera outra tentativa, preservando o ID da receita.
- A receita registra o último ID de tentativa confirmado e o hash do conteúdo. Se a resposta se perder após o commit, repetir a tentativa confirma o resultado anterior sem executar as gravações novamente, inclusive na última vaga do plano.
- O aviso de sucesso e o evento de criação só acontecem após a confirmação completa. Erros mantêm o formulário e os valores em tela.
- A versão da receita e as versões dos componentes carregados são comparadas antes de sobrescrever dados. Isso inclui passos que podem ter sido editados por um controle independente. Um conflito exige conferir a versão salva.
- IDs de componentes, datas de criação e imagens dos passos existentes são preservados. Referências a produtos/receitas/markup/tipos de outra conta são rejeitadas; ciclos de sub-receitas também.

As imagens continuam no fluxo independente de Storage já usado pela aba Geral; a RPC não altera `imagem_url`. Os campos de imagem inativos no formulário principal foram removidos. A garantia de repetição se aplica ao formulário aberto; recarregar a página continua descartando o estado local. Esta alteração não tenta identificar nem apagar registros antigos potencialmente incompletos.

## Verificação

```sh
npm run test:recipe-db
npx vitest run src/components/receitas/ReceitaForm.save.test.tsx src/pages/__tests__/ReceitaEditor.test.tsx src/hooks/__tests__/recipe-entitlements.test.tsx src/lib/funnel-analytics.test.ts
npx tsc --project tsconfig.app.json --noEmit
npm run build
```

Os testes de banco usam PostgreSQL em PGlite, esquema relevante e funções/gatilhos de cálculo, sequência e limite capturados do projeto. Auth e a consulta de acesso são simuladas. Eles verificam rollback em cada um dos cinco grupos, criação/repetição, limite, RLS, referências entre contas, conflitos, metadados e permissão anônima. Não usam dados nem credenciais de produção. Os testes React usam o formulário, a aba de ingredientes e o hook reais, com respostas de RPC controladas.

## Publicação e reversão

Aplicar a migração `atomic_recipe_save` antes do frontend. Ela acrescenta dois campos opcionais e uma função nova, compatíveis com o frontend anterior. Conferir a assinatura/ACL no banco e a chamada `salvar_receita_completa` no bundle publicado. O rollback do frontend pode ser feito mantendo a migração aditiva; não apagar os registros de receitas.
