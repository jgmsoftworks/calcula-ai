# Desktop fluido — todas as resoluções (1280px → 4K)

## Diagnóstico

A raiz do problema é única e está no `AppLayout.tsx`:

```tsx
<div className="container max-w-7xl mx-auto p-4 lg:p-6">
```

`max-w-7xl` = 1280px. Isso significa que **todo monitor acima de 1280px renderiza o app na mesma largura** (1280), com o resto virando borda vazia. Daí:

- Em **1366px** → fica "espremido" porque sobram só 80px de respiro e o padding interno é o mesmo de telas grandes.
- Em **1920px** → 640px de vazio lateral; o conteúdo parece uma "ilha" no meio.
- Em **2560px / 4K / ultrawide** → metade da tela vazia.

Somado a isso, os grids internos usam só breakpoint `md:` (768px). Pulam direto de 1 coluna para X colunas e não reaproveitam o espaço extra dos monitores grandes (KPIs, cards de receita, listas de produtos). E as tabelas grandes (Afiliados, Admin, Custos) não têm `whitespace-nowrap` / proporção de coluna, então em telas estreitas algumas colunas viram 3 linhas e em telas largas viram colunas gigantes com texto perdido.

## O que vou entregar

Plano em **3 partes**, tudo só em apresentação/responsividade (zero mudança de lógica).

### 1. Container fluido por faixa de resolução

Trocar o `max-w-7xl` fixo por um container que respira em cada faixa:

| Faixa | max-w aplicado | Padding lateral |
|------|----------------|------------------|
| <1280px (notebook 13") | `100%` | `px-4` |
| 1280-1536px | `max-w-[1280px]` | `px-6` |
| 1536-1920px | `max-w-[1480px]` | `px-8` |
| 1920-2560px | `max-w-[1680px]` | `px-10` |
| 2560px+ (4K/ultrawide) | `max-w-[1880px]` | `px-12` |

Implementação: classe Tailwind com breakpoints `xl:`, `2xl:` e um breakpoint customizado `3xl` (1920px) e `4xl` (2560px) adicionados no `tailwind.config.ts`. Resultado: app preenche bem o monitor sem virar "ilha" no 1920+ e sem ficar grudado nas bordas no 1366.

### 2. Grids/colunas que respiram

Adicionar tier extra `xl:` e `2xl:` nos grids principais que hoje param em `md:`:

- **Dashboard KPIs**: hoje `md:grid-cols-4`. Vai virar `md:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5` para aproveitar 1920+ sem inflar cada card.
- **Receitas (lista de cards)** e **Estoque (lista de produtos)**: adicionar `2xl:grid-cols-5` / `3xl:grid-cols-6` para evitar cards gigantes em monitor grande.
- **Receitas — abas internas (Ingredientes, Embalagens, Sub-receitas, Precificação)**: trocar grids `md:grid-cols-2` por `md:grid-cols-2 xl:grid-cols-3` quando fizer sentido.
- **Custos (FolhaPagamento, DespesasFixas, EncargosVenda)**: linhas mais espaçadas em monitor grande, mantendo proporção dos inputs.

### 3. Tabelas com colunas proporcionais

Padronizar as tabelas largas (Afiliados, Admin, Custos, Histórico) com:

- `whitespace-nowrap` nas colunas numéricas e de status (data, valor, %, ações) — para não quebrarem em telas estreitas.
- `min-w-0 truncate` nas colunas de texto longo (email, nome) — para encolherem com elegância em vez de empurrar a tabela.
- `w-[Xpx]` / `w-[X%]` definindo proporção de cada coluna (em vez de deixar o navegador decidir).
- Tipografia: cabeçalho `text-xs`, conteúdo `text-sm` constante (hoje varia entre tabelas).

### 4. Tipografia e ícones fluidos (ajuste fino)

Adicionar no `index.css` `clamp()` para títulos de página (`h1` da página) — escalam suavemente entre 1.5rem (1280) e 2rem (1920+), em vez de pular degraus. Ícones de header já estão bem; não mexer.

## Como vou validar

Subo as mudanças e te aviso pra você abrir o preview em 3 larguras representativas (uso o seletor do navegador):

1. **1366×768** (notebook) — checar se respira sem espremer.
2. **1920×1080** (monitor padrão) — checar se preenche sem virar ilha.
3. **2560×1440** ou simulado (ultrawide) — checar se não vira deserto lateral.

Se algum grid específico ficar estranho em alguma faixa, ajusto pontualmente antes de fechar.

## Fora do escopo

- Mobile (já entregue nas fases anteriores).
- Mudanças de cor, tipografia base, glassmorphism — identidade visual mantida.
- Lógica, banco, regras de negócio.
- Telas legais (já fluidas).
