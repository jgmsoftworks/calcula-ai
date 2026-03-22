

## Plano: Adicionar cards de "Saldo Inicial do Estoque" e "CMV %" abaixo do gráfico

### O que muda

Dois novos cards em grid de 2 colunas, posicionados logo abaixo do gráfico de Movimentações Diárias:

1. **Saldo Inicial do Estoque (mês)** -- valor em R$ do fechamento do mês anterior
2. **CMV %** -- percentual do Custo de Mercadoria Vendida

### Lógica do CMV que será utilizada

```text
CMV = Estoque Inicial + Compras Líquidas − Estoque Final
CMV% = (CMV / Faturamento Líquido) × 100
```

Detalhes de cada componente:

- **Estoque Inicial (EI)**: valor gravado na tabela `estoque_fechamentos_mensais` para a competência do mês anterior (ex: se estamos em março, busca o fechamento de fevereiro). Se não houver fechamento registrado, o card mostra "Indisponível".

- **Compras Líquidas**: soma de todas as entradas do mês atual a custo (`custo_aplicado × quantidade`), excluindo motivos como ajuste, inventário, transferência, bonificação e cancelamento. Devoluções ao fornecedor são subtraídas.

- **Estoque Final (EF)**: soma de `estoque_atual × custo_unitario` de todos os produtos ativos no momento da consulta.

- **Faturamento Líquido**: soma dos `subtotal` das saídas com motivo contendo "venda" no mês atual. Se não houver vendas, CMV% mostra "Sem vendas".

Toda essa lógica já existe em `src/lib/cmvCalculations.ts` e o hook `useDashboardData` já calcula e retorna `cmvResult` com todos esses valores. Nenhuma query nova é necessária.

### Alterações técnicas

**Arquivo: `src/pages/Dashboard.tsx`**
- Abaixo do card do gráfico de Movimentações Diárias, adicionar um `grid grid-cols-2 gap-4` com dois cards glassmorphism:
  - Card 1: "Saldo Inicial do Estoque" mostrando `data.cmvResult.breakdown.estoqueInicial` formatado em R$, ou "Indisponível" com ícone de alerta se `null`
  - Card 2: "CMV %" mostrando `data.cmvResult.cmvPercentual` formatado com 1 casa decimal e sufixo %, ou "Sem vendas" / "Indisponível" conforme o caso
- Ambos os cards seguem o mesmo padrão visual dos cards superiores (gradient top bar, glassmorphism, hover effect)
- Nenhuma alteração no hook ou no backend

