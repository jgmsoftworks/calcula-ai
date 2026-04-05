

## Problema

O "Faturamento Bruto (total)" usa o **preço sugerido** pelo markup, mas deveria usar o **preço de venda** que você digitou. E quando tem mais de 1 unidade, precisa multiplicar pelo rendimento.

## Solução

No `MarkupCard.tsx`, trocar:

```
Faturamento Bruto = precoSugerido  ← errado
```

Por:

```
Faturamento Bruto = precoVenda × rendimentoValor  ← correto
```

Para sub-receitas (sem rendimento unitário), usa `precoVenda` direto.

## Arquivo alterado

- `src/components/receitas/MarkupCard.tsx` — uma linha: substituir `precoSugerido` por `precoVenda * (rendimentoValor || 1)` no campo de Faturamento Bruto.

Zero alteração no banco de dados.

