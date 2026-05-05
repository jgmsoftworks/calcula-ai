## Objetivo

Adicionar visualização de **telefone** dos usuários no painel Admin Master (atualmente só mostra email), e criar uma seção de destaque para "Usuários Novos" (últimos 7 dias) com email e telefone para contato rápido.

## O que existe hoje

- Página `/admin/usuarios` (`AdminUsers.tsx`) já lista todos os usuários com email, plano, status, etc.
- Edge function `admin-list-all-users` retorna `email`, mas **não retorna telefone**.
- Tabela `profiles` tem 3 campos de telefone: `phone`, `telefone_comercial`, `celular`, `whatsapp`.

## Mudanças

### 1. Edge function `admin-list-all-users`
Incluir os campos de telefone do `profiles` no `select` e no objeto retornado:
- `phone`, `celular`, `whatsapp`, `telefone_comercial`

### 2. `AdminUsers.tsx`
- Estender interface `MergedUser` com os campos de telefone.
- Adicionar **nova seção no topo** "Novos Usuários (últimos 7 dias)" com cards compactos mostrando:
  - Nome / Empresa
  - Email (clicável `mailto:`)
  - Telefone principal (clicável `tel:` + botão WhatsApp se disponível)
  - Data de cadastro
  - Plano
- Na lista principal existente, adicionar uma coluna/linha com o telefone do usuário (com ícone Phone e link clicável).

### 3. Sem mudanças de banco
Nenhuma migração necessária — os telefones já existem em `profiles`.

## Acesso

A rota `/admin/usuarios` já é protegida por `isAdmin`, então a funcionalidade fica restrita ao admin master automaticamente.

## Fora do escopo

- Editar telefone do usuário pelo painel (só leitura por enquanto).
- Notificações automáticas para novos cadastros.