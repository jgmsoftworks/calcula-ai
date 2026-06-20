## Reorganizar menu de Estoque com submenu expansível

Transformar **Estoque** em um item de menu expansível (accordion) na sidebar com 4 sub-itens. **Movimentações** deixa de ser categoria de topo e vira sub-item de Estoque. Adicionar nova página **Relatórios**.

### Nova estrutura da sidebar (área do usuário)

```text
Dashboard
Estoque ▾
   ├─ Lista de Produtos      → /estoque
   ├─ Movimentações          → /estoque/movimentacoes
   ├─ Histórico Geral        → /estoque/historico
   └─ Relatórios             → /estoque/relatorios
Receitas
Custos
Precificação
```

- Remove o item de topo "Movimentação" (ex-`/movimentacao`); adiciona redirect de `/movimentacao` → `/estoque/movimentacoes` para não quebrar links salvos.
- Estoque (`/estoque`) deixa de usar Tabs internas (Produtos / Histórico) — cada aba vira sua própria rota acessada pela sidebar.

### Comportamento do submenu

- Usar `Collapsible` do shadcn dentro do `SidebarMenuItem`.
- Clicar em "Estoque" abre/fecha o grupo (accordion controlado).
- Abre automaticamente quando a rota atual começa com `/estoque` ou `/movimentacao`.
- Item pai fica destacado quando qualquer sub-rota está ativa; cada sub-item tem seu próprio highlight.
- Quando a sidebar está colapsada (modo ícone), clicar no ícone de Estoque navega direto para `/estoque` (Lista de Produtos) — sem submenu visível, mantendo o padrão do shadcn.

### Páginas

1. **`/estoque`** — renderiza `ListaProdutos` diretamente (sem Tabs).
2. **`/estoque/movimentacoes`** — renderiza a página atual `Movimentacao.tsx` (movida sem mudanças de lógica).
3. **`/estoque/historico`** — renderiza `HistoricoGeral` diretamente (sem Tabs).
4. **`/estoque/relatorios`** — **nova página** `RelatoriosEstoque.tsx`.

### Página Relatórios

Layout com 3 cards de seleção no topo (tabs ou seletor) e a área de resultado abaixo, com botões **Exportar Excel** e **Exportar PDF** sempre visíveis na seção ativa.

**1. Posição atual de estoque**
- Tabela: Código, Produto, Categoria, Unidade, Saldo atual, Custo unitário, **Valor em estoque (saldo × custo)**, Estoque mínimo, Status (OK / Abaixo do mínimo / Zerado).
- Filtros: busca por nome/código, categoria, marca, toggle "só abaixo do mínimo", toggle "ocultar saldo zero".
- Totalizador no rodapé: nº de SKUs, valor total em estoque (formatBRL).

**2. Movimentações por período**
- Filtros: data início/fim (default: mês atual), tipo (entrada/saída/ajuste/todos), produto, categoria, responsável.
- Tabela: Data, Produto, Tipo, Quantidade, Custo unitário, Valor total, Motivo, Responsável.
- Resumo no topo: total entradas (qtd e R$), total saídas (qtd e R$), saldo líquido.

**3. Produtos mais movimentados (ranking)**
- Filtros: data início/fim, tipo (saída por padrão), categoria, limite Top N (10/25/50/100).
- Tabela ordenada desc: Posição, Produto, Categoria, Qtd movimentada, Nº de movimentações, Valor total.
- Gráfico de barras horizontais (recharts) com Top 10.

### Exportação Excel/PDF

- **Excel**: usar `xlsx` (já presente — ver `useExportProdutos.ts`/`useExportReceitas.ts` para padrão). Uma aba por relatório com cabeçalho, filtros aplicados e dados; números/moeda em PT-BR.
- **PDF**: usar `jsPDF` + `jspdf-autotable` (já presente — ver `useExportReceitaPDF.ts` para padrão). A4 retrato, cabeçalho com logo da empresa (bucket `logos-empresas`), título do relatório, período/filtros, tabela, totalizadores, rodapé com data de geração e paginação.
- Sem valores monetários ocultos: relatório de estoque inclui R$ (diferente da ficha técnica).

### Arquivos afetados

**Novos**
- `src/pages/RelatoriosEstoque.tsx`
- `src/pages/EstoqueMovimentacoes.tsx` (wrapper fino que renderiza a página atual)
- `src/pages/EstoqueHistorico.tsx` (wrapper fino que renderiza `HistoricoGeral`)
- `src/components/estoque/relatorios/RelatorioPosicao.tsx`
- `src/components/estoque/relatorios/RelatorioMovimentacoes.tsx`
- `src/components/estoque/relatorios/RelatorioRanking.tsx`
- `src/hooks/useExportRelatorioEstoque.ts` (Excel + PDF dos 3 relatórios)

**Editados**
- `src/components/layout/AppSidebar.tsx` — submenu Collapsible para Estoque, remover "Movimentação" do topo.
- `src/App.tsx` — adicionar rotas `/estoque/movimentacoes`, `/estoque/historico`, `/estoque/relatorios`; manter `/movimentacao` como `<Navigate to="/estoque/movimentacoes" replace />`.
- `src/pages/Estoque.tsx` — remover Tabs, renderizar `ListaProdutos` direto.
- `src/components/layout/AppLayout.tsx` — adicionar entradas no `pageMap` para os novos paths (títulos do header).
- `src/i18n/locales/pt-BR.json` e `en.json` — chaves `nav.relatorios`, `nav.listaProdutos`, `nav.movimentacoes`, `nav.historicoGeral`, `pages.relatoriosEstoque.*`, `pages.estoqueMovimentacoes.*`, `pages.estoqueHistorico.*`.

### Observações

- Sem alterações de schema do banco — relatórios consomem `produtos`, `movimentacoes` e tabelas auxiliares existentes via os hooks `useEstoque` / `useMovimentacoes`.
- Mantém o padrão visual atual (glassmorphism, gradient brand, formatação PT-BR).
- A página `src/pages/Movimentacao.tsx` permanece, apenas referenciada pela nova rota; não removo para evitar regressão.
