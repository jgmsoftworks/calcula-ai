## Melhorias no modal "Registrar Perda"

### 1. Seletor de produto enriquecido
Substituir o item simples da lista por um card com:
- **Foto** (`imagem_url`, 40x40 com fallback ícone Package)
- **Nome** (destaque)
- **Estoque atual** + unidade de compra (badge colorido: vermelho se 0, amarelo se ≤ mínimo, verde caso contrário)
- **Marcas** (array `marcas`) — chips pequenos
- **Categorias** (array `categorias`) — chips pequenos
- Buscar por nome, marca e categoria simultaneamente (via prop `value` do `CommandItem` concatenando os campos)

### 2. Seletor de receita com mesmo padrão visual
Aplicar o mesmo layout compacto do seletor de produtos:
- **Ícone** (`ChefHat`) em caixa muted
- **Nome** com prefixo `#numero`
- **Rendimento** em badge `secondary`
- Mesmo alinhamento, truncamento e scroll com roda do mouse

### 3. Scroll do mouse no popover
O `CommandList` herda `max-h-[300px] overflow-y-auto`, mas dentro de `PopoverContent` o Radix bloqueia eventos de wheel por padrão. Vou:
- Manter altura visível reduzida (`max-h-[260px]`)
- Adicionar `onWheel` handler no `CommandList` que faz `e.stopPropagation()` e ajusta `scrollTop` manualmente, garantindo que a roda do mouse funcione sem precisar arrastar a barra
- Usar `avoidCollisions` e `collisionPadding={8}` no `PopoverContent` para evitar que a lista saia da tela

### 4. Campo "Responsável" puxando de Folha de Pagamento
Trocar o `Input` livre por um `Select` populado a partir de `folha_pagamento` (filtro `ativo = true`, ordenado por `nome`), mostrando o `cargo` como descrição secundária. Manter opção "Outro" para digitar manualmente caso o responsável não esteja cadastrado.

### Arquivos afetados
- `src/components/estoque/perdas/RegistrarPerdaModal.tsx` — refatorar Popover/CommandItem dos produtos e receitas, adicionar Select de funcionários, fix do wheel
- Query de `produtos`: incluir `imagem_url, marcas, categorias, estoque_minimo, unidade_compra`
- Nova query de `folha_pagamento` (id, nome, cargo) ao abrir o modal

Nenhuma mudança de schema ou lógica de negócio.
