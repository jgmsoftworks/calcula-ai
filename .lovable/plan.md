## Plano: Indicador CMV por Receita

### Conceito do CMV por receita
Diferente do CMV global do Dashboard (que usa EI + Compras - EF do estoque do mês), o **CMV de uma receita individual** é o percentual do preço de venda que é "comido" pelo custo de produção daquela receita:

```
CMV% (receita) = (Custo Total da Receita / Preço de Venda) × 100
```

Onde:
- **Custo Total da Receita** = `custo_ingredientes + custo_embalagens + custo_mão_obra + custo_sub_receitas` (já calculado no `ReceitaCard`, normalizado por unidade quando tem rendimento).
- **Preço de Venda** = `receita.preco_venda`.

### Interpretação visual (faixas)
- **CMV ≤ 30%** → Verde (excelente, alta margem).
- **CMV 30%–45%** → Amarelo (saudável, padrão da indústria food service).
- **CMV > 45%** → Vermelho (atenção, margem comprimida).
- **Sem preço de venda** → exibir "—".

### Onde aparece
1. **`ReceitaCard.tsx`** — adicionar o indicador CMV ao lado/junto dos cards financeiros existentes (Preço Venda, Lucro Bruto, Lucro Líquido). A linha inferior passa de 3 colunas para 4, mantendo o layout responsivo (em mobile vira 2x2).
2. **`ReceitaPreviewModal.tsx`** — também exibir o CMV junto às métricas financeiras do preview, para consistência.

### Banco de dados
**NENHUMA alteração no banco.** O cálculo é puramente derivado de campos já existentes (`custo_ingredientes`, `custo_embalagens`, `custo_mao_obra`, `custo_sub_receitas`, `preco_venda`, `rendimento_valor`). Nada será migrado, criado ou deletado.

### Arquivos modificados
- `src/components/receitas/ReceitaCard.tsx` — adicionar célula CMV no grid inferior + função utilitária local de cálculo e cor.
- `src/components/receitas/ReceitaPreviewModal.tsx` — adicionar exibição do CMV nas métricas financeiras.

### Observações técnicas
- Para sub-receitas (markup tipo `sub_receita`), o CMV tende a ser ~100% (preço = custo). Isso é matematicamente correto e será exibido normalmente.
- Quando `preco_venda = 0` ou inexistente, o componente exibe "—" para evitar divisão por zero.
- Sem chamadas extras ao banco — tudo derivado dos dados já carregados em `ReceitaComDados`.
