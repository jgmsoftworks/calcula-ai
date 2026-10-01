# Fluxo de compra e acesso

Landing e VSL usam os seis Payment Links existentes; o app cria Checkout Sessions
para usuários autenticados. Todos retornam a
`https://calculaaibr.com/auth/success?session_id={CHECKOUT_SESSION_ID}`.

O webhook assinado é responsável pelo cadastro, plano e e-mails. A página de
retorno só consulta o estado e não aceita uma senha nem autentica pelo ID da compra.

| Situação | Conta e plano | E-mail |
| --- | --- | --- |
| Checkout concluído, pagamento pendente | Não cria conta nem libera plano | Aguardando aprovação |
| Pagamento aprovado, cliente novo | Cria conta com senha inicial aleatória e individual; vincula o plano | E-mail usado na compra, senha inicial, botão de login e recomendação de troca no perfil |
| Pagamento aprovado, conta existente | Mantém a conta e a senha; atualiza o plano | Login em calculaaibr.com |
| Teste contratado ativo | Libera somente o período contratado | Explica que o teste começou, sem afirmar que houve cobrança |
| Pagamento assíncrono recusado | Não libera novo acesso | Orientação para conferir o pagamento |
| Renovação / conversão do teste | Sincroniza período e status | Confirmação da cobrança ou aviso de falha |

## Configuração antes de ativar

- Configurar o transporte transacional com Gmail SMTP (TLS, porta 465) ou Resend.
  As credenciais devem permanecer nos secrets do servidor e nunca no repositório.
  Não ocorre troca automática de provedor depois de uma falha de envio.
- Configurar a chave da API Stripe e a chave de assinatura do endpoint webhook.
  A assinatura pode usar o secret de Edge `STRIPE_WEBHOOK_SECRET` ou o secret
  criptografado `billing_stripe_webhook_secret` no Supabase Vault. A função
  `billing_webhook_signing_secret` é SECURITY INVOKER e restrita a service_role;
  anon e authenticated não podem executá-la. Nenhum valor vai para o repositório.
  Não substituir a validação da assinatura por confiança no corpo recebido.
- Configurar separadamente o SMTP do Supabase Auth e testar “Esqueci minha senha”.
  O transporte transacional envia a senha inicial somente para contas novas.
  Contas existentes e ainda não confirmadas recebem um link individual do Auth.
- Aplicar as migrações `payment_access_flow` e `billing_webhook_vault`.
- Publicar as novas telas antes de ativar o envio de links com `token_hash`.
- Implantar `stripe-webhook`, `process-stripe-payment`, `check-subscription`,
  `create-checkout` e `affiliate-checkout` com seus arquivos compartilhados.
- No endpoint existente, preservar os eventos atuais e acrescentar
  `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed`.
- Configurar o retorno dos Payment Links para a página de confirmação com `session_id`.

As funções públicas de webhook e status permanecem com `verify_jwt=false`:
o webhook exige assinatura Stripe; o status não concede acesso nem envia e-mails.
`check-subscription` valida o usuário via `auth.getUser`.

## Verificação

`npm run build`

`npx vitest run --config vitest.billing.config.ts`

Os 23 testes usam clientes em memória e impedem conexões reais. Cobrem aprovação,
pendência, teste, conta existente, repetição, ordem atrasada, bloqueio concorrente,
falha de cadastro, transporte e configuração ausente, aceite/rejeição SMTP,
fechamento da conexão, proteção dos detalhes de erro, preservação da senha em
retentativas, corrida com cadastro existente e leitura protegida da configuração
de assinatura (falha fechada quando indisponível). Os testes de integração devem verificar RLS e as funções de bloqueio
sem deixar registros de teste no ambiente de produção.

Validar em sandbox uma compra nova, uma conta existente e pagamento assíncrono,
incluindo recebimento do e-mail, login com a senha inicial, troca em
Perfil do negócio → Segurança da conta → Alterar senha e acesso ao plano. Não usar
cartão real para testes. Usar um destinatário de teste autorizado e confirmar
a publicação das telas antes de verificar a entrega e a ativação.

## Retentativas e acompanhamento

`billing_checkouts` registra o estado por compra. `billing_jobs` evita concorrência
e repetição de eventos concluídos. `billing_emails` guarda o payload enquanto
aguarda envio e o remove após aceite do provedor. Todas são privadas ao servidor.
O recibo do provedor indica aceite para envio, não garante chegada à caixa de entrada.
Uma verificação de autenticação SMTP sem envio não valida a entrega nem a ativação
em uma caixa de entrada real.

Erros de processamento ou transporte retornam HTTP 500 à Stripe para permitir
retentativa. Após corrigir um problema persistente, reenviar o evento pelo painel
Stripe; não marcar eventos manualmente como processados. O payload da mensagem
permanece estável para a chave de idempotência do provedor. No Gmail, o Message-ID é
determinístico por evento e o banco evita repetição após recibo confirmado. SMTP não
garante idempotência: se o servidor aceitar a mensagem e a resposta ou a gravação do
recibo se perder, uma retentativa pode duplicar o e-mail. Não prometer envio exatamente
uma vez. A janela de idempotência do transporte alternativo Resend também é limitada:
após falhas prolongadas, conferir os recibos antes de reenvio.

## Senha inicial e contas existentes

A senha inicial é gerada com `crypto.getRandomValues` para cada conta nova e enviada
somente ao e-mail da compra. Não existe uma senha pública compartilhada. O Auth cria
a conta com e-mail confirmado para permitir esse primeiro login. Quem já tem conta
mantém sua senha; o webhook nunca chama uma atualização de senha em conta existente.

Uma entrada privada `signup:<session_id>` em `billing_emails` guarda temporariamente
a senha e o identificador de criação antes da chamada ao Auth. O identificador é
vinculado em `app_metadata`, de modo que uma corrida de cadastro não envie uma senha
que pertence a outra tentativa. Retentativas reutilizam o mesmo estado. Após o aceite
do e-mail de acesso, o payload temporário é removido, assim como o payload da mensagem.
Esses valores nunca aparecem no endpoint público de confirmação ou nos logs.

A recomendação de troca aparece no e-mail. O perfil contém a seção Segurança da conta,
com o botão Alterar senha; após salvar, o usuário volta ao perfil. A troca é recomendada,
sem expiração automática da senha inicial ou bloqueio adicional de navegação.

Para contas existentes e ainda não confirmadas, o token de ativação é de uso único e
tem a validade configurada no Supabase Auth.
O cliente o consome ao enviar o formulário de senha. Links expirados podem ser
substituídos por recuperação de senha. Não registrar tokens ou payloads de e-mail
em logs, nem expor essas tabelas a usuários do app.
