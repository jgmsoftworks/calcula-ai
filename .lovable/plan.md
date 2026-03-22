

## Plano: Fechamento mensal automático do estoque

### Problema atual
O card "Saldo Inicial do Estoque" mostra "Indisponível" porque depende de um registro manual na tabela `estoque_fechamentos_mensais`. O usuário quer que o sistema faça isso automaticamente: no dia 1 de cada mes, capturar o valor do estoque naquele momento (meia-noite de Brasilia) e gravar como fechamento.

### Solucao

Duas frentes: (1) uma Edge Function agendada (cron) que roda todo dia 1 a meia-noite de Brasilia e grava o fechamento, e (2) um fallback no frontend para quando o cron ainda nao rodou ou o usuario acabou de comecar a usar o sistema.

### Alteracoes tecnicas

**1. Edge Function `auto-fechamento-mensal` (nova)**
- Cron: todo dia 1 as 03:00 UTC (meia-noite de Brasilia)
- Para cada usuario que tem produtos ativos, calcula `SUM(estoque_atual * custo_unitario)` e grava/atualiza na tabela `estoque_fechamentos_mensais` com a competencia do mes anterior (ex: roda dia 1 de abril, grava competencia "2026-03")
- Usa `service_role` para acessar todos os usuarios

**2. Fallback no frontend — `getEstoqueInicialReal` (alteracao em `cmvCalculations.ts`)**
- Se nao encontrar fechamento do mes anterior na tabela, calcular o valor "retroativo": pegar o estoque atual e reverter as movimentacoes do mes corrente (somar saidas, subtrair entradas) para estimar o que era no inicio do mes
- Formula: `EI estimado = EF atual - entradas_mes + saidas_mes` (em termos de valor a custo)
- Isso garante que o card nunca fique "Indisponivel" — mostra o valor calculado com uma indicacao de que e estimado

**3. Dashboard (`Dashboard.tsx`)**
- Remover a mensagem "Indisponivel — sem fechamento anterior"
- Mostrar o valor sempre, com um badge "(estimado)" quando vier do fallback em vez do fechamento real

### Fluxo

```text
Dia 1 do mes (03:00 UTC / 00:00 BRT):
  Edge Function roda → grava fechamento do mes que acabou

Dashboard carrega:
  1. Busca fechamento do mes anterior na tabela
  2. Se encontrou → usa valor real
  3. Se nao encontrou → calcula EI estimado via formula reversa
```

### Arquivos envolvidos
- `supabase/functions/auto-fechamento-mensal/index.ts` — nova edge function
- `src/lib/cmvCalculations.ts` — adicionar fallback de estimativa no `getEstoqueInicialReal` (ou funcao auxiliar)
- `src/hooks/useDashboardData.tsx` — passar movimentacoes do mes para a funcao de calculo
- `src/pages/Dashboard.tsx` — remover "Indisponivel", mostrar badge "(estimado)" quando aplicavel

