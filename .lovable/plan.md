

## Dashboard Admin Master - Funil de Conversao e Metricas Avancadas

### Objetivo
Criar uma dashboard administrativa de nivel profissional exclusiva para o admin master, inspirada no funil de vendas da imagem enviada. A dashboard substituira o conteudo atual do admin no Dashboard.tsx com metricas reais do negocio.

### Dados disponiveis no banco
Com base nas tabelas existentes, podemos calcular metricas reais:
- **Total de cadastros** (profiles): usuarios registrados
- **Verificacao de email**: profiles com email confirmado (via edge function)
- **Distribuicao por plano**: free vs professional vs enterprise
- **Conversao free -> pago**: taxa real
- **Receita mensal**: baseada em assinantes ativos x preco do plano
- **Afiliados**: vendas, comissoes, cliques em links
- **Crescimento mensal**: usuarios por mes

### O que sera construido

**1. Funil de Conversao Visual** (inspirado na imagem)
Um funil SVG/CSS com as etapas:
- Cadastros Totais (topo)
- Email Verificado
- Usuarios Ativos (ultimo acesso < 30 dias)
- Assinantes (plano pago)
- Enterprise (plano top)

Cada etapa mostra o numero absoluto, percentual de conversao entre etapas, e taxa geral.

**2. Cards de KPIs Principais**
- MRR (Monthly Recurring Revenue) - calculado real por plano
- ARR (Annual Recurring Revenue)
- Ticket Medio
- Churn estimado (usuarios que nao acessam ha 30+ dias)
- LTV estimado
- CAC (se dados de afiliados disponiveis)
- ROAS dos afiliados

**3. Tabela Comparativa de Canais** (inspirada na segunda imagem)
Comparacao entre canais de aquisicao:
- Organico vs Afiliado 1 vs Afiliado 2...
- CPL, Conversao, LTV, LTV/CAC por canal

**4. Graficos**
- Evolucao de MRR (ultimos 6 meses)
- Distribuicao de planos (donut chart)
- Crescimento de usuarios (line chart)

### Arquivos

1. **`src/hooks/useAdminDashboardMetrics.tsx`** (novo) - Hook que busca e calcula todas as metricas reais do banco (profiles, affiliates, affiliate_sales, affiliate_commissions, affiliate_links)

2. **`src/components/admin/AdminFunnel.tsx`** (novo) - Componente visual do funil de conversao com CSS gradients (estilo da imagem: tons de azul/roxo)

3. **`src/components/admin/AdminKPICards.tsx`** (novo) - Grid de cards com MRR, ARR, LTV, Churn, Ticket Medio, ROAS

4. **`src/components/admin/AdminChannelComparison.tsx`** (novo) - Tabela comparativa por canal/afiliado

5. **`src/components/admin/AdminRevenueChart.tsx`** (novo) - Graficos de evolucao MRR e distribuicao de planos

6. **`src/pages/Dashboard.tsx`** (alterado) - Quando `isAdmin`, renderizar os novos componentes em vez do layout atual simplificado

7. **`src/hooks/useAdminData.tsx`** (alterado) - Expandir para incluir dados de affiliate_sales, affiliate_links para metricas de aquisicao

### Estilo Visual
- Funil com gradiente de azul claro (topo) a roxo escuro (base), similar a imagem
- Cards com glassmorphism consistente com o design system existente
- Numeros grandes e destaque visual nas metricas principais
- Setas de conexao entre etapas do funil mostrando taxas de conversao
- Tabela com fundo escuro e bordas azuis como na segunda imagem

### Calculos das metricas
- **MRR**: (assinantes professional x 49.90) + (assinantes enterprise x 89.90)
- **Churn**: usuarios com last_sign_in > 30 dias / total ativos
- **LTV**: MRR / churn rate
- **Conversao**: (assinantes pagos / total cadastros) x 100
- **ROAS afiliados**: receita gerada por afiliados / comissoes pagas

