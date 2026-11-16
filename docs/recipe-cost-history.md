# Histórico do custo das receitas

Solicitado em 16/11/2026 para alimentar futuramente o painel de gestão, sem tela
nova. Base revisada: `7cd2997fb6ad124caf671754a1b37bdf21cbb59e` e funções do banco
do aplicativo consultadas em 16/11/2026. Reavaliar este contrato se a fórmula de
custo, os componentes, o isolamento de contas ou o acesso ao aplicativo mudar.

## O que é registrado

`public.receita_custos_historico` recebe uma fotografia inicial das receitas
existentes na ativação e registros seguintes quando a base de cálculo muda.
Cada fotografia inclui o custo total do lote, custo por unidade de rendimento,
rendimento e unidade, moeda cadastrada, nome/status, data/hora e os ingredientes,
embalagens, sub-receitas e valores de mão de obra usados. `custo_unitario` é NULL
se o rendimento não for positivo; moeda ausente permanece NULL, sem conversão
ou suposição. `formula_versao=1` identifica a fórmula atual.

O custo total usa a função **existente** `calcular_custo_receita`. Para uma
sub-receita usada como componente, essa fórmula usa o preço-base armazenado e
seu rendimento. Não modifica nem recalcula retroativamente preços de venda,
markups, estoque ou a regra de arredondamento/propagação existente. Quando a
fórmula for alterada no futuro, registrar uma nova versão e novos marcos.

Gatilhos observam alterações diretas de produtos, entradas de estoque que
atualizam esses produtos, inclusão/edição/remoção dos componentes, rendimento,
sub-receitas e moeda do negócio. A busca dos dependentes é recursiva. Não depende
de navegador aberto, tarefa diária, webhook, polling ou uma tela nova.

Os registros são concluídos ao final da transação, junto com a gravação original.
Falha ou rollback não deixa histórico falso; uma gravação completa gera no máximo
uma fotografia final por receita/conta/transação, inclusive se os gatilhos forem
forçados a executar antes do commit. Um lock por conta serializa a captura de
alterações concorrentes. A comparação inclui os componentes: trocar a composição
sem mudar o total também merece uma fotografia. Edição de observações/imagem ou
gravação sem alteração na base não duplica o histórico.

## Tempo e consultas para a integração

- O primeiro registro vale **a partir da hora da ativação**, não desde meia-noite
  nem desde a criação antiga da receita. Não há reconstrução de março/abril.
- `registrado_em` é o horário de captura no fim da transação. A fotografia só
  fica visível depois do commit. Não é timestamp retroativo de nota de compra.
- Cada fotografia vale até a próxima. Dias sem mudança carregam o último valor;
  não é necessário duplicar uma linha todo dia. Os valores são NUMERIC, sem
  arredondamento a centavos na persistência.
- `custo_receita_em(p_receita_id, p_instante)` consulta o último valor conhecido
  até um instante com fuso explícito. Retorna vazio antes da cobertura ou após
  a exclusão. Não interpreta uma consulta futura como previsão de custo.
- `custos_receita_por_dia(p_receita_id, p_inicio, p_fim, p_fuso)` fornece até 366
  dias, no fuso informado (padrão `America/Sao_Paulo`). Retorna o **último custo
  do dia**, não média, CMV realizado nem custo ponderado pelas vendas. Hoje usa
  o último custo conhecido até o início da consulta e sinaliza `dia_parcial`.
- `cobertura_desde` informa o começo real da série. Dias anteriores retornam
  `disponivel=false` e custos NULL, nunca zero inventado. O dia da ativação é
  parcial. Datas futuras e fusos inválidos são rejeitados pela consulta diária.
- Mudanças intradiárias permanecem na tabela; para uma venda com hora conhecida,
  usar `custo_receita_em`. Para exportar eventos, paginar a tabela por conta e
  `(registrado_em,id)`, com sobreposição/deduplicação por `id` em consultas
  incrementais para tolerar transações ainda não confirmadas.

Exemplos com JWT do próprio usuário (o Supabase aplica RLS):

```ts
await supabase.rpc('custo_receita_em', {
  p_receita_id: receitaId,
  p_instante: '2026-11-25T15:00:00-03:00',
});
await supabase.rpc('custos_receita_por_dia', {
  p_receita_id: receitaId,
  p_inicio: '2026-11-25',
  p_fim: '2026-11-27', // apenas quando estas datas ja tiverem ocorrido
  p_fuso: 'America/Sao_Paulo',
});
```

O transporte/autorização entre Calcula Aí e painel é a etapa seguinte. Esta
entrega disponibiliza a persistência e os contratos de leitura no aplicativo;
não conecta o painel, não cria uma chave compartilhada e não expõe service role.

## Acesso e retenção

RLS permite leitura somente ao dono com acesso ao aplicativo, conforme
`private.can_use_app()`. Não há INSERT/UPDATE/DELETE pelo cliente. As funções
de escrita ficam em `private`, com EXECUTE revogado inclusive para os papéis
de API; o escritor interno valida o usuário e o dono. RPCs públicas são
`SECURITY INVOKER`. O serviço pode ler no servidor, mas a futura API deve validar
explicitamente a conta antes de qualquer leitura com credencial privilegiada.

A exclusão de receita mantém as fotografias e registra um marco de exclusão;
consultas posteriores à exclusão ficam sem custo disponível. A exclusão da
conta de autenticação remove seu histórico por cascade. Criar e apagar uma
receita dentro da mesma transação não cria história de uma receita inexistente.
Registros antigos sem conta em `auth.users` não são fotografados nem recriados.
Na pré-verificação havia 409 receitas, das quais duas sem conta de autenticação;
20 fichas não tinham rendimento positivo e podem ter apenas custo total.

## Aplicação e verificação

A migration `20261116212837_receita_custos_historico.sql` é aditiva. Não substitui
nenhuma função de cálculo existente. O remoto tem identificadores divergentes
e não contém todas as mudanças locais posteriores ao salvamento atômico; isso
foi verificado antes desta entrega. Aplicar **somente este arquivo**, por nome
e conteúdo, em uma transação. Não executar `db push`, replay, reset ou repair.

A aplicação bloqueia brevemente escrita nas tabelas de origem para instalar os
gatilhos e fotografar a base sem lacuna. `lock_timeout=5s` evita esperar por uma
transação longa; se não conseguir o lock, toda a aplicação deve ser repetida
depois, sem estado parcial. Não depende de publicação do frontend no Lovable.

Testes em `supabase/tests/recipe-cost-history.test.ts` usam somente PGlite e dados
sintéticos. Cobrem 10→12, instante exato, sub-receitas, rendimento, composição,
embalagem/mão de obra, precisão, rollback, deduplicação, exclusões, fusos, dias
sem mudança, início da cobertura e isolamento. Rodar `npm run check` antes da
aplicação. Depois, conferir em leitura contagem de marcos iniciais, igualdade
com a fórmula atual, RLS/ACL e presença/habilitação dos sete gatilhos.

Reversão operacional: em transação, remover os sete gatilhos `historico_custos_*`
adicionados por esta migration. Isso interrompe novas capturas; conservar a tabela
e as funções de leitura para não perder o que já foi registrado. Registrar a
lacuna se o acompanhamento for retomado. Não alterar as fórmulas de precificação.
