# Restaurar planos no link de afiliado e estabilizar testes de cobrança

## 1. Planos visíveis no link público de afiliado (prioridade)

**Causa confirmada:** a única regra de leitura de `planos` é `ativo = true OR has_role_or_higher('admin', auth.uid())`, aplicada a todos. Para visitantes, o banco avalia a função protegida e a consulta inteira falha com "permission denied".

**Nova migração (sem tocar na função `has_role_or_higher`):**
- Remover a regra de leitura combinada atual.
- Leitura de planos ativos: `anon` e `authenticated`, `USING (ativo = true)`, sem chamar nenhuma função.
- Leitura de planos inativos: só `authenticated` com `has_role_or_higher('admin', auth.uid())`.
- Regra de alteração do catálogo (inserir/editar/excluir): recriar restrita a `authenticated` + admin, para que visitantes nunca avaliem a função.
- Conferir e garantir os acessos de leitura da tabela: `SELECT` para `anon`; os acessos atuais de `authenticated`/`service_role` continuam como estão.

**Teste de regressão (PGlite, em `supabase/tests/planos-public-read.test.ts`):**
- Visitante lê os planos ativos sem erro e não vê os inativos.
- Usuário comum: mesmo resultado, e qualquer alteração é bloqueada.
- Admin vê os inativos e consegue editar.
- A função `has_role_or_higher` continua sem permissão de execução para visitantes.

**Validação manual:** abrir `/affiliate/:code` em navegador anônimo (Playwright) com um código real e confirmar que os planos ativos aparecem e os inativos não. Depois, conferir a gestão de planos do Master ADM com consulta direta ao banco, já que não consigo entrar como admin pelo navegador neste projeto.

## 2. Os sete testes de cobrança

**Causa:** `GMAIL_SMTP_PASSWORD` vindo do ambiente faz o código escolher o envio por Gmail nos testes que esperam o caminho de teste, e a proteção contra cliente real derruba os testes.

**Mudança só em `supabase/functions/_shared/billing.test.ts`:**
- Guardar e limpar antes de cada teste as variáveis de e-mail e cobrança (`GMAIL_SMTP_PASSWORD`, `RESEND_API_KEY`, `PAYMENTS_EMAIL_FROM`, `STRIPE_WEBHOOK_SECRET`) e restaurá-las depois.
- Cada teste define só os valores fictícios de que precisa.
- O bloqueio contra envio real fica como está. Nenhum arquivo de produção (pagamentos, Stripe, webhooks, preços, e-mails) é alterado.

## Verificação
- `npm run test:billing` sem `GMAIL_SMTP_PASSWORD` e de novo com valor fictício; esperado: 30/30 nas duas.
- `npm run check` completo com Node 24.22.1 (`.nvmrc`).

## Sobre a aplicação em produção
O banco ligado a este projeto é o de produção. A migração entra no ar assim que eu a executar pela ferramenta de banco, e você confirma essa execução no cartão que aparece. Se preferir aplicar você mesmo, eu só deixo o arquivo e aviso. No relatório final digo qual dos dois aconteceu.
