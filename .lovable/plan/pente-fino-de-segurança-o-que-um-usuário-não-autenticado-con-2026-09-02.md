# Pente-fino de segurança — o que um usuário não autenticado consegue fazer

## Resumo do que foi verificado

Consultei os grants do banco, todas as policies RLS, o linter do Supabase e o código das edge functions abertas.

### Boa notícia: o banco está fechado para anônimos

O papel `anon` **não tem nenhum GRANT** em nenhuma tabela do schema `public`. Ou seja, mesmo com a chave pública (que fica visível no navegador, e isso é normal), um visitante não lê nem escreve nada via API de dados — inclusive nas tabelas com policy permissiva (`avaliacoes_fornecedores`, `planos_precos_historico`, `roadmap_items`).

### O que um não autenticado consegue fazer hoje

Pelo app:
- Ver as páginas públicas: login/cadastro, Política de Privacidade, Termos, Cookies, checkout, páginas de afiliado (`/ref/:code`, `/aff/:code`, `/affiliate/:code`), reset de senha e o quadro de produção compartilhado por link (`/producao-compartilhada/:token`).
- Criar conta, pedir reset de senha, reenviar confirmação, entrar com Google.

Pelas edge functions (as que estão com `verify_jwt = false`):
- `csp-report` — enviar relatórios de violação de CSP (intencional).
- `producao-compartilhada` — abrir um quadro de produção se tiver o token do link.
- `stripe-webhook` — protegido por assinatura do Stripe (correto).
- **`process-stripe-payment`** — chamar sem nenhuma autenticação, passando um `session_id` do Stripe e um `signup_data`.
- **`sync-stripe-sales`** — disparar sincronização de vendas.
- **`auto-fechamento-mensal`** — disparar o fechamento mensal de estoque de todos os usuários.
- **`purge-deleted-accounts`** — disparar a exclusão definitiva de contas com pedido pendente.
- **`cleanup-audit-logs`** — disparar limpeza de logs de auditoria.

`admin-list-all-users`, `admin-confirm-user-email` e `create-backup` também estão com `verify_jwt = false`, mas validam token + papel de admin dentro do código — estão OK.

## Problemas encontrados (por gravidade)

1. **Crítico — 4 funções com poder de service role abertas na internet, sem qualquer verificação.**
   `purge-deleted-accounts` (apaga contas e dados), `cleanup-audit-logs` (apaga trilha de auditoria), `auto-fechamento-mensal` (fecha estoque de todo mundo) e `sync-stripe-sales` podem ser chamadas por qualquer pessoa que saiba a URL. São jobs agendados; não deveriam aceitar chamada anônima.

2. **Alto — `process-stripe-payment` sem autenticação e sem validar dono da sessão.**
   Recebe `session_id` + `signup_data` de qualquer origem e cria/ativa usuário com plano pago. Além disso, quando o produto não é reconhecido, faz *fallback* para `professional` — ou seja, uma sessão qualquer pode virar plano Profissional.

3. **Médio — proteção contra senhas vazadas desligada** no Supabase Auth (apontado pelo linter).

4. **Médio — auditoria de logs sem retenção protegida**: como `cleanup-audit-logs` é pública, a trilha (`admin_actions`, `sensitive_data_access_log`) pode ser apagada por terceiros.

5. **Baixo — extensão instalada no schema `public`** e ampla exposição de tabelas no GraphQL para usuários logados (mitigada pelas RLS por `auth.uid()`).

## O que proponho fazer

### Etapa 1 — Fechar os jobs públicos (crítico)
- Criar o segredo `CRON_SECRET`.
- Em `purge-deleted-accounts`, `cleanup-audit-logs`, `auto-fechamento-mensal` e `sync-stripe-sales`: exigir o header `x-cron-secret` igual ao segredo **ou** um token de admin válido (`has_role_or_higher('admin')`). Sem isso, responder 401.
- Ajustar as chamadas internas do app/admin para mandar o token de admin (elas já rodam logadas).
- Reagendar/atualizar os cron jobs para enviarem o header.

### Etapa 2 — Endurecer `process-stripe-payment`
- Exigir `x-cron-secret` ou sessão autenticada, ou (melhor) restringir a função ao fluxo pós-checkout validando que a sessão do Stripe existe, está `paid` e ainda não foi processada (marcar em `stripe_events` para evitar reuso do mesmo `session_id`).
- Remover o fallback silencioso para `professional`: se o produto não mapear para um plano em `planos`, falhar com erro.

### Etapa 3 — Ajustes de plataforma
- Ligar "Leaked password protection" no painel do Supabase Auth (passo manual seu, eu indico o caminho).
- Revisar a extensão no schema `public` e mover se for segura mover.

### Etapa 4 — Verificação
- Testar cada função protegida sem header (deve dar 401) e com header/admin (deve funcionar).
- Rodar o linter de novo e confirmar que nada quebrou no app.

## Detalhes técnicos

- Guarda compartilhada nova em `supabase/functions/_shared/authGuard.ts`: `requireCronOrAdmin(req)` — compara `x-cron-secret` em tempo constante e, na ausência, valida JWT + `has_role_or_higher('admin')`.
- `supabase/config.toml` continua com `verify_jwt = false` nessas funções (o cron não manda JWT); a verificação passa a ser no código.
- Nenhuma alteração de schema é necessária, exceto (se aprovado) um índice único em `stripe_events(event_id)` para impedir reprocessamento — confirmo se já existe antes de criar.
