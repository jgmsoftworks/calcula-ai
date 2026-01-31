
# Plano de Limpeza Final - CalculaAI

## Resumo
Remover a aba "Sou Fornecedor" da tela de login e verificar todo o código para garantir que nada está quebrado após as remoções anteriores.

---

## Problema Identificado

A aba "Sou Fornecedor" ainda existe na tela de login (`src/pages/Auth.tsx`), nas linhas 424-429:

```tsx
<TabsTrigger 
  value="fornecedor"
  className="..."
>
  Sou Fornecedor
</TabsTrigger>
```

Além disso, todo o formulário de cadastro de fornecedor (linhas 44-267) ainda existe no arquivo.

---

## Arquivos a Modificar

| Arquivo | Ação |
|---------|------|
| `src/pages/Auth.tsx` | Remover aba "Sou Fornecedor" e formulário relacionado |

---

## Detalhes das Alterações

### 1. src/pages/Auth.tsx

**Remover:**
- Estados do formulário de fornecedor (linhas 44-50):
  - `businessNameFornecedor`
  - `cnpjFornecedor`
  - `cidadeFornecedor`
  - `emailFornecedor`
  - `passwordFornecedor`
  - `telefoneFornecedor`

- Import de ícones não utilizados (linha 23-24):
  - `Store`
  - `Phone`

- Função `handleSignupFornecedor` (linhas 200-267)

- TabsTrigger "Sou Fornecedor" (linhas 424-429)

- TabsContent com formulário de fornecedor (todo o bloco que contém o formulário de cadastro de fornecedor)

**Manter:**
- Grid de 2 colunas para as abas (Entrar e Criar conta)

---

## Verificação de Integridade

**Já verificado e OK:**
- `src/App.tsx` - Rotas limpas, sem referências a páginas removidas
- `src/components/layout/AppSidebar.tsx` - Menu limpo, sem itens de fornecedor
- `src/hooks/useAuth.tsx` - `isFornecedor` hardcoded como `false`
- `src/contexts/ActivityContext.tsx` - Corrigido para não usar `useActivityLog`

**Não será alterado:**
- Banco de dados (tabelas permanecem intactas)
- Edge Functions (mantidas para uso futuro)
- Termos "fornecedor" no contexto de estoque/CMV (ex: "Compra de fornecedor")
- Arquivo `src/lib/motivosMovimentacao.ts` (contém "Compra de fornecedor" e "Devolução a fornecedor" - são motivos válidos de movimentação de estoque)
- `src/integrations/supabase/types.ts` (tipos gerados automaticamente do Supabase)

---

## Resultado Esperado

Após esta alteração:

```text
ANTES:                              DEPOIS:
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ [Entrar] [Criar] [Fornec.]  │     │   [Entrar]    [Criar]       │
│ (3 abas)                    │     │   (2 abas)                  │
├─────────────────────────────┤     ├─────────────────────────────┤
│ Formulário de login/        │     │ Formulário de login/        │
│ cadastro/fornecedor         │     │ cadastro apenas             │
└─────────────────────────────┘     └─────────────────────────────┘
```

---

## Segurança

- O banco de dados NÃO será alterado
- As Edge Functions NÃO serão removidas
- Nenhum dado será perdido
- O sistema continuará funcionando normalmente
- Termos de "fornecedor" no contexto de estoque/compras permanecem

