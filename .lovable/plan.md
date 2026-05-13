## Problema

No celular (390px), a página **Estoque** fica ruim porque:

1. **Aba "Lista de Produtos"** usa uma `<Table>` com 10 colunas (Imagem, Código, Nome, Marcas, Categorias, Unidade, Estoque, Custo, Valor, Ações). No mobile a tabela estoura horizontalmente, texto fica espremido e cada linha ocupa muito espaço vertical sem hierarquia.
2. **Filtros** (busca, marca, categoria, unidade, checkbox "Abaixo do mínimo") empilham em 1 coluna ocupando uma tela inteira antes do conteúdo aparecer.
3. **Botões de ação** (Criar, Recarregar, Exportar, Importar) ficam todos visíveis em linha quebrando feio.
4. **Aba "Histórico Geral"** tem o mesmo problema: tabela de 9 colunas + 4 filtros sempre visíveis.
5. As **TabsList** ocupam largura total mas os títulos ("Lista de Produtos" / "Histórico Geral") quase não cabem.

## Solução

Manter o layout desktop atual intacto e criar uma versão mobile (`<md`) baseada em cards e filtros recolhíveis.

### 1. `ListaProdutos.tsx` (aba Produtos)

**Filtros (mobile)**
- Mostrar apenas a barra de busca + um botão "Filtros" com ícone que abre um `Sheet` lateral contendo: Marca, Categoria, Unidade, checkbox "Abaixo do mínimo".
- Badge no botão Filtros indicando quantos filtros ativos.

**Ações (mobile)**
- "Criar Produto" como botão primário em largura total.
- Os outros (Recarregar, Exportar, Importar) entram num menu `DropdownMenu` "Mais ações" com ícone de três pontos.

**Listagem (mobile)**
- Substituir `<Table>` por uma lista de **cards** (`<md:hidden`), cada card com:
  - Linha 1: imagem 56x56 à esquerda + nome em destaque + badge "Abaixo do mínimo" se aplicável.
  - Linha 2 (sob o nome): código mono pequeno + unidade em uppercase.
  - Linha 3: grid 2 colunas → "Estoque: X un" / "Custo: R$ X" e abaixo "Valor em estoque" destacado.
  - Marcas/categorias como chips pequenos limitados a 2 + "+N".
  - Tap no card abre o modal de edição; ícone de lixeira no canto para excluir (com confirm já existente).
- Em `≥md`, manter a `<Table>` atual sem alterações.

### 2. `HistoricoGeral.tsx` (aba Histórico)

**Filtros (mobile)**
- Período: dois inputs de data lado a lado (grid 2 colunas).
- Tipo + Responsável dentro de um `Sheet` "Filtros" com botão acima da lista.

**Listagem (mobile)**
- Cards no lugar da tabela:
  - Topo: badge "Entrada"/"Saída" + data/hora à direita.
  - Nome do produto em destaque.
  - Linha de métricas: Quantidade · Custo · **Subtotal** (negrito).
  - Rodapé: Responsável · Origem · badge comprovante (#número) se existir.
- Em `≥md`, manter a `<Table>` atual.

### 3. `Estoque.tsx` (tabs)

- Encurtar rótulos das abas no mobile: "Produtos" / "Histórico" (manter completos no desktop usando `hidden md:inline` / `md:hidden`).
- Garantir que o container da página tenha `px-3` no mobile para não colar nas bordas.

## Detalhes técnicos

- Usar `useIsMobile()` (já existe em `src/hooks/use-mobile.tsx`) **ou** classes Tailwind (`md:hidden` / `hidden md:block`) para alternar entre cards e tabela. Preferir classes Tailwind para evitar re-render extra; usar o hook só quando precisar de comportamento JS diferente.
- Componente `Sheet` (`src/components/ui/sheet.tsx`) para o painel de filtros no mobile.
- `DropdownMenu` (já presente) para "Mais ações".
- Reutilizar `formatters.valor` / `formatters.quantidadeContinua`.
- Sem alterações em hooks, dados ou regras de negócio — somente apresentação.

## Arquivos a alterar

- `src/components/estoque/ListaProdutos.tsx`
- `src/components/estoque/HistoricoGeral.tsx`
- `src/pages/Estoque.tsx`
