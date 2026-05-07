## Correções no cálculo de Markup

Aplicar 3 correções pontuais (sem mexer no banco, sem alterar estrutura de dados).

### 1. Receita com "sub" no nome sendo tratada como sub-receita
**Arquivos:** `src/components/precificacao/Markups.tsx` (linha 555) e `src/hooks/useMarkupInitializer.tsx` (linhas 163-165).

Hoje qualquer bloco cujo nome contém "sub" (Subway, Submarino, Substituto…) é classificado como `sub_receita`, travando o preço de venda. Trocar para considerar **apenas** `bloco.id === 'subreceita-fixo'`.

### 2. Filtro de meses com off-by-one
**Arquivos:** `src/components/precificacao/Markups.tsx` (linhas 222-226) e `src/hooks/useMarkupInitializer.tsx` (linhas 100-104).

Hoje `dataLimite = hoje - N meses` varia conforme o dia atual. Normalizar para o **dia 1 do mês inicial da janela**: `new Date(ano, mês - N + 1, 1)`. Garante exatamente N meses sempre.

### 3. Rótulo enganoso em `preco_sugerido`
**Arquivo:** `src/components/precificacao/Markups.tsx` (linha 562).

O campo `preco_sugerido` na verdade guarda o "valor em real" (taxa fixa). Manter o comportamento por compatibilidade, mas adicionar comentário `TODO` deixando claro que numa próxima iteração a coluna correta deve ser criada (`valor_em_real`). Sem mudança funcional agora.

### O que NÃO muda
- Banco de dados: nenhuma migração, nenhuma coluna alterada, nenhum dado apagado.
- Markup duplicado (`markup_aplicado = markup_ideal`): adiado.
- Lucro líquido: mantido como está.
- Cálculo da folha de pagamento: já corrigido na rodada anterior.

### Impacto pro usuário
- Receitas com "sub" no nome voltam a permitir edição livre de preço.
- Média de faturamento fica precisa em N meses exatos.
- Nenhuma quebra visual ou de fluxo.
