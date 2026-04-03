

## Problema: Lucro Bruto calculado de forma diferente na lista vs precificação

### O que está acontecendo

Na **tela inicial de receitas** (ReceitaCard), o Lucro Bruto é calculado assim:

```
Lucro Bruto = Preço de Venda - Custo Total (do lote inteiro)
55,71 - 247,84 = -192,13
```

Na **aba de Precificação** (MarkupCard), o Lucro Bruto é calculado assim:

```
custoBase = Custo Total ÷ Rendimento = 247,84 ÷ 12 = 20,65
Lucro Bruto = Preço de Venda - custoBase (por unidade)
55,71 - 20,65 = 35,06
```

O Preço de Venda é **por unidade**, mas na tela inicial o código compara esse preço unitário contra o **custo total do lote** (247,84 de 12 unidades), gerando um valor absurdamente negativo. Na precificação, o custo é corretamente dividido pelo rendimento antes da comparação. O Lucro Líquido já faz a divisão correta (por isso mostra R$ 3,90 em ambas as telas).

### Solução

Corrigir o cálculo do Lucro Bruto no `ReceitaCard` para dividir o custo total pelo rendimento, igualando à fórmula do `MarkupCard`.

### Mudança

**`src/components/receitas/ReceitaCard.tsx`** (1 linha):

Linha 62, trocar:
```ts
const lucroBruto = receita.preco_venda - custoTotal;
```

Por:
```ts
const custoBase = (receita.markup?.tipo === 'sub_receita' || !receita.rendimento_valor || receita.rendimento_valor <= 0)
  ? custoTotal
  : custoTotal / receita.rendimento_valor;
const lucroBruto = receita.preco_venda - custoBase;
```

Isso aplica a mesma lógica do MarkupCard: se for sub-receita, usa custo total; senão, divide pelo rendimento. Nenhuma alteração no banco de dados.

