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

- Confirmar o provedor de e-mail existente. O transporte implementado usa a API
  Resend: configurar `RESEND_API_KEY` e `PAYMENTS_EMAIL_FROM` como secrets das
  Edge Functions. O remetente precisa pertencer a um domínio verificado no provedor.
  Não usar `onboarding@resend.dev` para clientes reais.
- Manter `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` da conta Calcula Aí.
- Conferir SMTP do Supabase Auth para que “Esqueci minha senha” também chegue a
  clientes. A geração do link inicial é feita pelo Auth; seu envio é feito pelo
  transporte transacional acima.
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

Os testes usam clientes em memória e impedem conexões reais. Cobrem aprovação,
pendência, teste, conta existente, repetição, ordem atrasada, bloqueio concorrente,
falha de cadastro, transporte e configuração ausente. RLS e as funções de bloqueio
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

Erros de processamento ou transporte retornam HTTP 500 à Stripe para permitir
retentativa. Após corrigir um problema persistente, reenviar o evento pelo painel
Stripe; não marcar eventos manualmente como processados. O payload da mensagem
permanece estável para a chave de idempotência do provedor. A janela de idempotência
do Resend é limitada: após falhas prolongadas, conferir os recibos antes de reenvio.

O token de ativação é de uso único e tem a validade configurada no Supabase Auth.
O cliente o consome ao enviar o formulário de senha. Links expirados podem ser
substituídos por recuperação de senha. Não registrar tokens ou payloads de e-mail
em logs, nem expor essas tabelas a usuários do app.
