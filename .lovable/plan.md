

# Plano de Limpeza do Sistema CalculaAI

## Resumo

Remover funcionalidades não utilizadas (Fornecedor, Marketplace, Simulador e Sugestões) e melhorar o design da página de Planos, mantendo o sistema 100% funcional.

## O que será removido

### 1. Funcionalidades de Fornecedor
- Páginas: `FornecedorDashboard.tsx`, `FornecedorOrcamentos.tsx`, `MeuPainelFornecedor.tsx`
- Componente: `FornecedorProtectedRoute.tsx`
- Badge "FORNECEDOR" no sidebar
- Menu de navegação para fornecedores
- Verificação `isFornecedor` do useAuth (deixar apenas a estrutura para não quebrar)

### 2. Páginas a Remover
- **Marketplace**: `MarketplaceFornecedores.tsx` + componentes `CriarPromocaoModal.tsx`, `SolicitarOrcamentoModal.tsx`
- **Simulador**: `Simulador.tsx` + componente `SimuladorModal.tsx`
- **Sugestões**: `Sugestoes.tsx` + todos os componentes em `/components/sugestoes/`

### 3. Navegação
- Remover itens do menu: Simulador, Marketplace, Sugestões
- Remover rotas do App.tsx

## O que será melhorado

### Design da Página de Planos (Antes/Depois)

```text
ATUAL:                              NOVO:
┌────────────────────┐              ┌────────────────────┐
│ Título simples     │              │ Header com ícone   │
│                    │              │ + gradiente visual │
├────────────────────┤              ├────────────────────┤
│ Card plano atual   │              │ Badge plano atual  │
│ (básico)           │              │ com destaque       │
├────────────────────┤              ├────────────────────┤
│ 3 cards lado a     │              │ 3 cards com:       │
│ lado (simples)     │              │ - Ícones coloridos │
│                    │              │ - Hover animado    │
│                    │              │ - Popular badge    │
│                    │              │ - Melhor contraste │
├────────────────────┤              ├────────────────────┤
│ Tabela comparação  │              │ Tabela com ícones  │
│ (sem estilo)       │              │ ✓/✗ coloridos     │
└────────────────────┘              └────────────────────┘
```

### Melhorias visuais na página de Planos:
- Header com gradiente e ícone Crown
- Card do plano atual com borda gradiente animada
- Cards dos planos com hover scale e sombra elegante
- Toggle mensal/anual mais visível e centralizado
- Tabela de comparação com ícones ✓ (verde) e ✗ (vermelho)
- Seção de FAQ removida (deixar mais clean)
- Botões com feedback visual melhor

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/App.tsx` | Remover rotas e imports |
| `src/components/layout/AppSidebar.tsx` | Limpar navegação |
| `src/hooks/useAuth.tsx` | Remover lógica de fornecedor |
| `src/pages/Planos.tsx` | Redesign completo |
| `src/components/planos/PlanSelector.tsx` | Melhorar visual |

## Arquivos a Deletar

**Páginas (5 arquivos):**
- `src/pages/FornecedorDashboard.tsx`
- `src/pages/FornecedorOrcamentos.tsx`
- `src/pages/MeuPainelFornecedor.tsx`
- `src/pages/MarketplaceFornecedores.tsx`
- `src/pages/Simulador.tsx`
- `src/pages/Sugestoes.tsx`

**Componentes (9 arquivos):**
- `src/components/FornecedorProtectedRoute.tsx`
- `src/components/marketplace/CriarPromocaoModal.tsx`
- `src/components/marketplace/SolicitarOrcamentoModal.tsx`
- `src/components/simulador/SimuladorModal.tsx`
- `src/components/sugestoes/AdminPanel.tsx`
- `src/components/sugestoes/AdminRoadmapPanel.tsx`
- `src/components/sugestoes/RoadmapItemModal.tsx`
- `src/components/sugestoes/RoadmapList.tsx`
- `src/components/sugestoes/SuggestionForm.tsx`

**Hooks (1 arquivo):**
- `src/hooks/useRoadmap.tsx`
- `src/hooks/useSuggestions.tsx`

## Segurança

- O banco de dados NÃO será alterado (tabelas permanecem)
- Nenhuma funcionalidade existente será afetada
- Rotas existentes continuam funcionando normalmente
- Apenas a interface será simplificada

---

## Detalhes Técnicos

### 1. Limpeza do App.tsx
Remover:
- Imports de FornecedorDashboard, FornecedorOrcamentos, MeuPainelFornecedor
- Imports de MarketplaceFornecedores, Simulador, Sugestoes
- Import de FornecedorProtectedRoute
- Todas as rotas correspondentes

### 2. Limpeza do AppSidebar.tsx
- Remover `fornecedorNavigationItems` e `fornecedorItems`
- Remover itens: Simulador, Marketplace, Sugestões de `businessNavigationItems`
- Remover Sugestões de `adminNavigationItems`
- Remover badge FORNECEDOR do header
- Simplificar lógica de seleção de menu (remover `isFornecedor`)

### 3. Simplificação do useAuth.tsx
- Manter `isFornecedor: false` sempre (para não quebrar tipos existentes)
- Remover a chamada RPC `user_is_fornecedor`

### 4. Redesign da Página Planos
- Novo header com gradiente
- Cards com glassmorphism e animações
- Toggle mensal/anual centralizado e destacado
- Tabela de comparação com ícones visuais
- Remoção de informações redundantes

