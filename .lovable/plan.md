

## Problema

No celular (390px), o ReceitaCard fica apertado e feio porque:
1. **Header**: número + nome + 5 botões de ação ficam espremidos numa linha só, o nome fica truncado em "M.."
2. **Stats pills**: 5 pills em wrap ficam em 3 linhas ocupando muito espaço vertical
3. **Grid financeiro 4 colunas**: os 4 blocos (Mão de Obra, Matéria-Prima, Embalagem, Custo Total) ficam muito estreitos, texto quebra feio
4. **Grid financeiro 3 colunas**: Preço Venda / Lucro Bruto / Lucro Líquido também fica apertado

No desktop está perfeito e não será alterado.

## Solução: Layout responsivo com breakpoints Tailwind

Usar classes responsivas (`md:`) para manter o layout desktop intacto e criar um layout mobile mais limpo.

## Mudanças em `src/components/receitas/ReceitaCard.tsx`

### Header (mobile)
- Reorganizar em 2 linhas: número + nome na primeira, botões de ação na segunda
- Mobile: `flex-wrap` no header, ações vão para baixo do título
- Desktop: mantém tudo na mesma linha (comportamento atual)

### Stats pills (mobile)
- Esconder labels no mobile, mostrar só ícone + valor para economizar espaço
- Ou: usar grid 2 colunas no mobile, flex row no desktop

### Grid financeiro de custos (mobile)
- `grid-cols-2 md:grid-cols-4` — no celular, 2x2 ao invés de 4 colunas

### Grid financeiro inferior (mobile)
- `grid-cols-1 md:grid-cols-3` ou `grid-cols-3` mantido mas com texto menor
- Reduzir font-size dos valores no mobile: `text-base md:text-lg`

### Badges e rendimento (mobile)
- Mover rendimento para uma linha separada no mobile

### Detalhes técnicos
- Apenas classes Tailwind responsivas (`md:` breakpoint = 768px)
- Zero alteração na lógica, cálculos ou props
- O layout desktop permanece 100% idêntico

