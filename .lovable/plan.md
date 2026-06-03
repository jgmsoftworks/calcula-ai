Corrigir responsividade do Dashboard em monitor grande (1920px+)

## Diagnóstico

No print (monitor 1920px) o container já expande corretamente até 1680px, mas os cards de KPI ocupam só ~metade da largura, deixando um vazio enorme à direita.

Causa: no ajuste anterior os grids viraram `3xl:grid-cols-6` (KPIs) e `3xl:grid-cols-4` (Saldo + CMV). Como só existem **3 KPIs** e **2 cards de saldo**, sobram 3 e 2 colunas vazias respectivamente — daí a sensação de "feio em monitor grande".

## Mudanças

### 1. `src/pages/Dashboard.tsx`

- KPIs (Valor em Estoque / Entradas / Saídas):
`grid-cols-1 md:grid-cols-3 3xl:grid-cols-6` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
(sempre 3 colunas em telas ≥lg, ocupando toda a largura disponível)
- Saldo Inicial + CMV %:
`grid-cols-1 md:grid-cols-2 3xl:grid-cols-4` → `grid-cols-1 md:grid-cols-2`
(2 colunas que se esticam para preencher o container)

### 2. (Opcional) Reduzir o teto do container em telas muito grandes

No `AppLayout.tsx`, o `max-w-[1680px]` em 3xl e `max-w-[1880px]` em 4xl funciona bem **se** os grids internos preencherem. Como os grids passarão a ter número fixo de colunas, cada card vai esticar — confirmar visualmente se ficam grandes demais; se sim, baixar o teto 3xl para `1480px`.

## Validação

- Conferir no print do usuário (1920×1080): 3 KPIs lado a lado preenchendo até onde os botões "Filtros/Atualizar" chegam.
- Conferir 1366×768 (notebook): grid cai para 2 ou 1 coluna sem espremer.
- Conferir 2560px (4K): cards não ficam absurdamente largos.

## Fora de escopo

- Receitas, Estoque, Custos (já estão com grids que escalam por conteúdo real).
- Tipografia, cores, lógica.