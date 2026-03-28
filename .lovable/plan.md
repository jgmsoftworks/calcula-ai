

## Plano: Redesign da Página de Afiliado (AffiliatePlanSelector)

### Resumo
Padronizar a tela de seleção de plano do afiliado com o mesmo visual da página `/planos` interna, adicionar opção Free, usar toggle Mensal/Anual (ao invés de 4 cards separados), e resolver o problema da logo misturada com o fundo.

### Mudanças visuais

1. **Fundo**: Trocar `bg-gradient-primary` (que mistura com a logo) por fundo claro/neutro (`bg-background`) com header decorativo usando gradiente apenas na barra superior sutil
2. **Layout 3 colunas**: Free + Profissional + Empresarial (como a página Planos), com toggle Mensal/Anual centralizado
3. **Card Free**: Redireciona para `/auth` (cadastro gratuito) com cookie de afiliado já salvo
4. **Cards pagos**: Mantém os valores promocionais anuais atuais (R$ 478,80 e R$ 838,80)
5. **Glassmorphism**: `glass-card`, gradiente top bar por plano, ícones com fundo gradient, badge "Popular" no Profissional
6. **Logo**: Fundo branco/claro atrás para não misturar com gradientes
7. **Tabela comparativa**: Mesma tabela de comparação da página Planos

### Estrutura do componente

- Toggle Mensal/Anual (com badge -20% no anual)
- 3 cards: Free (azul), Profissional (roxo, popular), Empresarial (vermelho-laranja)
- Preço muda dinamicamente com toggle (mensal/anual)
- Features usam `PLAN_CONFIGS` como fonte de dados (mas preços anuais mantêm os valores do affiliate: 478.80 e 838.80)
- Card Free: botão "Começar Grátis" → navega para `/auth` (mantendo cookie do afiliado)
- Tabela de comparação abaixo dos cards
- Footer com selo de segurança

### Arquivo modificado
- `src/pages/AffiliatePlanSelector.tsx` — reescrever completamente seguindo o padrão visual de `Planos.tsx`

### Valores preservados
- Professional Anual: R$ 478,80
- Enterprise Anual: R$ 838,80
- Professional Mensal: R$ 49,90
- Enterprise Mensal: R$ 89,90

