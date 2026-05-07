## Problema

Na tela **Precificação → Markup → Custos**, na aba "Folha de Pagamento", o custo total mostrado por funcionário (e usado no cálculo do "Gasto sobre Faturamento") **não bate** com o custo total mostrado em **Custos → Folha de Pagamento**.

### Por quê

Hoje o modal de Markup (`CustosModal.tsx`) e o cálculo no `Markups.tsx` calculam o custo do funcionário assim:

```ts
custoMensal = (funcionario.custo_por_hora || 0) * (funcionario.horas_totais_mes || 173.2)
```

Isso gera divergência por 3 motivos:

1. **Arredondamento duplo**: `custo_por_hora` é salvo no banco já arredondado para 2 casas (`Math.round(... * 100)/100`). Multiplicar de volta por `horas_totais_mes` perde centavos/reais (ex.: custo real R$ 3.000,00 vira R$ 2.999,82).
2. **Fallback errado de 173,2 horas**: funcionários antigos sem `horas_totais_mes` salvo recebem 173,2h, que não corresponde à jornada real cadastrada.
3. **Dados desatualizados**: se o funcionário foi cadastrado/editado antes de o campo `custo_por_hora` ser populado corretamente, o modal mostra um valor defasado, enquanto a tela de Folha de Pagamento recalcula tudo na hora a partir de salário + encargos.

A tela de Folha de Pagamento (`FolhaPagamento.tsx → calculateCustoTotal`) calcula direto:
`salario_base + adicional - desconto + FGTS + INSS + RAT + Férias + VT + VA + VR + Plano + Outros`.

Esse é o valor "verdadeiro" que o usuário vê.

## Solução

Padronizar o cálculo do custo total do funcionário em **um único helper** e usá-lo nos três lugares (Folha de Pagamento, CustosModal, Markups), eliminando o caminho `custo_por_hora × horas_totais_mes`.

### Mudanças

1. **Criar `src/lib/folhaPagamentoUtils.ts`**
   - Função `calcularCustoTotalFuncionario(funcionario)` replicando exatamente a lógica de `calculateCustoTotal` de `FolhaPagamento.tsx` (soma salário + adicional − desconto + todos os encargos, usando `percent` quando preenchido senão `valor`).
   - Tipo `FuncionarioCusto` com os campos necessários.

2. **`src/components/precificacao/CustosModal.tsx`**
   - Ajustar o `select` da query de `folha_pagamento` para trazer todos os campos de encargos (`fgts_*`, `inss_*`, `rat_*`, `ferias_*`, `vale_*_*`, `plano_saude_*`, `outros_*`, `adicional`, `desconto`).
   - Substituir o cálculo de `custoMensal` (linha 372-377 e linha 732) por `calcularCustoTotalFuncionario(funcionario)`.

3. **`src/components/precificacao/Markups.tsx`**
   - Ajustar o `select` em `folha_pagamento` (linha 183) para trazer os mesmos campos.
   - Substituir o cálculo de `custoMensal` (linha 244-250) por `calcularCustoTotalFuncionario(funcionario)`.

4. **`src/components/custos/FolhaPagamento.tsx`**
   - Refatorar `calculateCustoTotal` para chamar o helper compartilhado (mantém comportamento atual, só centraliza).

### Resultado

O valor exibido e usado no markup será **exatamente** o mesmo da tela de Folha de Pagamento, sem perda por arredondamento e sem fallback de 173,2h. A nota mental existente (`mem://features/folha-pagamento-markup-cost-calculation`) será atualizada para refletir a nova fonte de verdade (cálculo direto a partir dos campos do funcionário, em vez de `custo_por_hora × horas`).

Nenhuma mudança de banco de dados é necessária.