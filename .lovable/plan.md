## Plano: Excluir usuários pelo painel ADM

### Objetivo
Adicionar um botão "Excluir Usuário" em cada card da tela de Gerenciar Usuários (`/admin-users`) para que o admin master possa apagar completamente o usuário — tanto do `auth.users` quanto de todos os dados associados no banco — permitindo que o e-mail seja reutilizado em um novo cadastro.

### Mudanças

**1. Nova Edge Function: `admin-delete-user`**
- Recebe `userId` no body.
- Valida que o chamador está autenticado e possui role `admin` (via `has_role_or_higher`).
- Bloqueia o admin de excluir a si mesmo (proteção contra perda de acesso).
- Usa o `service_role` para deletar o usuário do `auth.users` via `supabaseAdmin.auth.admin.deleteUser(userId)`.
- Como praticamente todas as tabelas usam `user_id = auth.uid()` sem foreign key direta, será feita uma limpeza explícita de dados em ordem segura nas principais tabelas: `profiles`, `produtos`, `receitas` (e dependentes), `markups`, `movimentacoes`, `comprovantes`, `despesas_fixas`, `categorias_despesas_fixas`, `encargos_venda`, `folha_pagamento`, `categorias`, `marcas`, `tipos_produto`, `fornecedores`, `user_roles`, `user_configurations`, `notifications`, `estoque_fechamentos_mensais`, `ordens_producao` (+ itens), `affiliates` (se existir vinculado), `coupon_redemptions`, `backup_history` e `admin_actions` referentes a ele.
- Registra a ação em `admin_actions` (action_type `delete_user`) com email/nome para auditoria.
- Retorna mensagem de sucesso.

**2. Frontend: `src/pages/AdminUsers.tsx`**
- Adicionar botão vermelho "Excluir" (ícone Trash2) em cada card, ao lado dos botões existentes.
- Abrir um `AlertDialog` de confirmação **com dupla validação**: o admin precisa digitar o e-mail do usuário no input para liberar o botão "Excluir Permanentemente".
- Texto do diálogo deixa claro: "Esta ação é IRREVERSÍVEL. Todos os dados do usuário (receitas, produtos, despesas, configurações) serão apagados. O e-mail ficará livre para novo cadastro."
- Após sucesso: toast de confirmação e refresh da lista.
- Esconder o botão de excluir para o próprio usuário logado.

### Segurança
- Verificação de role `admin` server-side (não confia no cliente).
- Auto-exclusão bloqueada.
- Auditoria gravada em `admin_actions`.
- Confirmação dupla no UI (digitar e-mail) para evitar acidentes.

### Arquivos
- **Novo:** `supabase/functions/admin-delete-user/index.ts`
- **Editado:** `src/pages/AdminUsers.tsx` (botão + diálogo de confirmação + handler)

Nenhuma migração SQL é necessária — tudo é feito via service role na edge function.