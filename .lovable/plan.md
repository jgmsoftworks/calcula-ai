# Revisão Mobile Completa

## Diagnóstico atual

Rodei uma varredura no projeto. Os problemas de "ter que arrastar pro lado" no mobile vêm de três padrões repetidos:

1. **Tabelas largas sem versão mobile** — usadas em Receitas (Ingredientes, Embalagens, Sub-receitas, Preview), Afiliados (Lista, Vendas, Comissões, Cupons, Pagamentos, Relatórios, Links, Suporte), Estoque (Histórico geral e por produto), Admin (Stripe, Security, Backup, Comparação de canais) e Custos (Folha de pagamento).
2. **Abas/filtros que vazam da tela** — barras de filtros do Estoque/Movimentação no desktop foram adaptadas (já tem `md:hidden` + Sheet), mas Receitas, Custos, Precificação e Dashboard ainda usam grids `md:grid-cols-X` sem reflow real ou usam `overflow-x-auto` como muleta.
3. **Modais e formulários grandes** — `ReceitaForm`, `ProdutoForm`, `CustosModal`, `MarkupCard`, `MaoObraModal`, `EditUserPlanModal` viram scroll lateral em telas <400px porque assumem largura de notebook.

Só 3 telas (ListaProdutos do Estoque, ListaReceitas e Movimentação) têm versão mobile dedicada. As outras ~25 telas/seções renderizam o layout desktop "espremido".

## O que vou entregar

Plano em **3 fases** (1 PR/fase) para você validar visualmente entre cada uma. Padrão único:

- **Tabelas → cards verticais** no mobile (`md:hidden` cards + `hidden md:block` tabela), seguindo o modelo que já existe em `ListaProdutos.tsx`. Cada card mostra: identificador no topo, 2-4 métricas em grid 2x2, ações em menu `⋮`.
- **Filtros longos → Sheet lateral** (`SlidersHorizontal` + badge de contagem), idem padrão Estoque.
- **Ações secundárias → DropdownMenu `⋮`** no header da tela; primária fica como botão full-width.
- **Modais → `max-w-[95vw] h-[90vh]`** com conteúdo em `space-y-3` empilhado, sem grids horizontais no mobile.
- **Abas com muitos itens (Receitas)** → scroll horizontal *intencional* só na barra de abas com snap, mas conteúdo de cada aba empilhado.

Nenhuma mudança de lógica/negócio. Tudo é apresentação e responsividade.

### Fase 1 — Receitas (módulo mais usado)
- `IngredientesTab`, `EmbalagensTa`, `SubReceitasTab`: substituir `<Table>` por cards empilhados no mobile (nome + qtd + custo unit + custo total em grid 2x2, ações em `⋮`).
- `PrecificacaoTab` + `MarkupCard`: reorganizar grid de custos/markup em coluna única, popover de seleção full-width.
- `ProjecaoTab`: cards de cenários empilhados em vez de comparação lado-a-lado.
- `ReceitaPreviewModal`: usar `Drawer` no mobile em vez de Dialog largo.
- `ReceitaForm` / `GeralTab`: campos full-width, remover `md:grid-cols-2` no mobile.

### Fase 2 — Custos, Precificação, Dashboard e Movimentação
- `FolhaPagamento`, `DespesasFixas`, `EncargosVenda`: tabelas → cards.
- `Markups`, `MediaFaturamento`, `CustosModal`, `MaoObraModal`: formulários em coluna única, modais em `Drawer` no mobile.
- `Dashboard` (`CmvCard`, `FinancialHealthScore`, `InsightsCard`, gráficos): KPIs empilhados (2 por linha máx.), gráficos com altura fixa e legenda abaixo.
- `Movimentacao`: carrinho como bottom-sheet em vez de coluna lateral; lista de produtos em grid 2 colunas com cards compactos.

### Fase 3 — Admin, Afiliados, Estoque secundário, Auth
- Todas as tabelas de Afiliados (8 telas) → cards.
- `AdminUsers`, `AdminStripe`, `AdminSecurity`, `AdminInadimplencia`, `BackupPanel`, `AdminChannelComparison` → cards + filtros em Sheet.
- `HistoricoGeral`, `HistoricoProduto`, `ConsumoMedioCard` (Estoque) → cards de movimentação com data em destaque.
- `Auth`, `Planos`, `AffiliatePlanSelector`, `PerfilNegocio`, `Checkout`: revisar paddings, larguras de inputs, ajustar `max-w` para `100%` no mobile.
- `EditUserPlanModal`, `ProdutoForm`: virar Drawer no mobile.

## Detalhes técnicos

- Breakpoint único: `md` (768px), igual ao já usado.
- Reaproveitar `useIsMobile()` quando precisar de lógica condicional (não só CSS).
- Componente novo `MobileListCard` em `src/components/ui/` para padronizar (header + grid de métricas + ações), evitando copy-paste em ~20 lugares.
- Componente novo `MobileFiltersSheet` encapsulando o padrão `Sheet + SlidersHorizontal + badge`.
- Sidebar do app no mobile já usa `Sheet` (shadcn) — sem mudança.
- Zero impacto em desktop: tudo dentro de `md:hidden` / `hidden md:block` ou `useIsMobile()`.

## Fora do escopo

- Mudanças de funcionalidade, regras de negócio ou banco.
- Redesign visual (cores, tipografia, glassmorphism) — mantém identidade atual.
- Versão tablet (>=md continua igual ao desktop).
- Telas legais (`PoliticaCookies`, `TermosUso`, etc.) que já são texto fluido.

## Como vamos validar

A cada fase eu te aviso e você abre o preview no viewport mobile (375px) pra checar as telas afetadas. Se algo ficar estranho, eu ajusto antes de seguir pra próxima fase.
