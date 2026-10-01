# Fluxo de compra e acesso

Landing e VSL usam os seis Payment Links existentes; o app cria Checkout Sessions
para usuários autenticados. Todos retornam a
`https://calculaaibr.com/auth/success?session_id={CHECKOUT_SESSION_ID}`.

O webhook assinado é responsável pelo cadastro, plano e e-mails. A página de
retorno só consulta o estado e não aceita uma senha nem autentica pelo ID da compra.

| Situação | Conta e plano | E-mail |
| --- | --- | --- |
| Checkout concluído, pagamento pendente | Não cria conta nem libera plano | Aguardando aprovação |
| Pagamento aprovado, cliente novo | Cria conta sem senha compartilhada e vincula o plano | Link individual para confirmar o e-mail e definir senha |
| Pagamento aprovado, conta existente | Mantém a conta e a senha; atualiza o plano | Login em calculaaibr.com |
| Teste contratado ativo | Libera somente o período contratado | Explica que o teste começou, sem afirmar que houve cobrança |
| Pagamento assíncrono recusado | Não libera novo acesso | Orientação para conferir o pagamento |
| Renovação / conversão do teste | Sincroniza período e status | Confirmação da cobrança ou aviso de falha |

## Configuração antes de ativar

- O Gmail existente foi confirmado em 01/10/2026: `jgmsoftworks@gmail.com`,
  nome `Calcula Aí`, secret `GMAIL_SMTP_PASSWORD` já presente nas Edge Functions.
  O transporte usa SMTP com TLS na porta 465 (as Edge Functions bloqueiam a 587).
  A senha fica somente no servidor. Nenhum valor precisa ser copiado para o código.
  A autenticação SMTP foi verificada no runtime de produção, sem envio de mensagem.
  A função temporária `billing-mail-preflight` foi desativada após o teste
  (versão 2, sempre HTTP 410, JWT obrigatório).
- Sem a credencial Gmail, o transporte alternativo Resend exige `RESEND_API_KEY`
  e `PAYMENTS_EMAIL_FROM`, com domínio verificado. Não ocorre troca automática de
  provedor após falha de envio. Não usar `onboarding@resend.dev` para clientes reais.
- Manter `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` da conta Calcula Aí.
- Supabase Auth já mostra SMTP Gmail ativo na porta 587, com senha salva. Essa
  configuração é independente das Edge Functions. Testar “Esqueci minha senha”
  antes de ativar o fluxo. A geração do link inicial é feita pelo Auth; seu envio
  é feito pelo transporte transacional acima.
- Aplicar a migração `payment_access_flow` (já aplicada em produção em 30/09/2026).
- Publicar as novas telas antes de ativar o envio de links com `token_hash`.
- Implantar `stripe-webhook`, `process-stripe-payment`, `check-subscription`,
  `create-checkout` e `affiliate-checkout` com seus arquivos compartilhados.
- No endpoint já existente, preservar os eventos atuais e acrescentar
  `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed`.
  Os seis retornos dos Payment Links já foram corrigidos em produção.

As funções públicas de webhook e status permanecem com `verify_jwt=false`:
o webhook exige assinatura Stripe; o status não concede acesso nem envia e-mails.
`check-subscription` valida o usuário via `auth.getUser`.

## Verificação

`npm run build`

`npx vitest run --config vitest.billing.config.ts`

Os 14 testes usam clientes em memória e impedem conexões reais. Cobrem aprovação,
pendência, teste, conta existente, repetição, ordem atrasada, bloqueio concorrente,
falha de cadastro, transporte e configuração ausente, aceite/rejeição SMTP,
fechamento da conexão e proteção dos detalhes de erro. RLS e as funções de bloqueio
foram verificadas no banco, com a transação de teste revertida.

Validar em sandbox uma compra nova, uma conta existente e pagamento assíncrono,
incluindo recebimento do e-mail, definição da senha e acesso ao plano. Não usar
cartão real para testes. O teste de entrega/ativação ainda depende da configuração
do remetente e da publicação das telas.

## Retentativas e acompanhamento

`billing_checkouts` registra o estado por compra. `billing_jobs` evita concorrência
e repetição de eventos concluídos. `billing_emails` guarda o payload enquanto
aguarda envio e o remove após aceite do provedor. Todas são privadas ao servidor.
O recibo do provedor indica aceite para envio, não garante chegada à caixa de entrada.
O teste SMTP sem mensagem passou em 01/10/2026; entrega e ativação ainda não foram
validadas em caixa de entrada real.

Erros de processamento ou transporte retornam HTTP 500 à Stripe para permitir
retentativa. Após corrigir um problema persistente, reenviar o evento pelo painel
Stripe; não marcar eventos manualmente como processados. O payload da mensagem
permanece estável para a chave de idempotência do provedor. No Gmail, o Message-ID é
determinístico por evento e o banco evita repetição após recibo confirmado. SMTP não
garante idempotência: se o servidor aceitar a mensagem e a resposta ou a gravação do
recibo se perder, uma retentativa pode duplicar o e-mail. Não prometer envio exatamente
uma vez. A janela de idempotência do transporte alternativo Resend também é limitada:
após falhas prolongadas, conferir os recibos antes de reenvio.

O token de ativação é de uso único e tem a validade configurada no Supabase Auth.
O cliente o consome ao enviar o formulário de senha. Links expirados podem ser
substituídos por recuperação de senha. Não registrar tokens ou payloads de e-mail
em logs, nem expor essas tabelas a usuários do app.
