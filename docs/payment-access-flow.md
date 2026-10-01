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

- Configurar o transporte transacional com Gmail SMTP (TLS, porta 465) ou Resend.
  As credenciais devem permanecer nos secrets do servidor e nunca no repositório.
  Não ocorre troca automática de provedor depois de uma falha de envio.
- Configurar a chave da API Stripe e a chave de assinatura do endpoint webhook.
  Não substituir a validação da assinatura por confiança no corpo recebido.
- Configurar separadamente o SMTP do Supabase Auth e testar “Esqueci minha senha”.
  A geração do link inicial é feita pelo Auth; o transporte transacional o envia.
- Aplicar a migração `payment_access_flow`.
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

Os 14 testes usam clientes em memória e impedem conexões reais. Cobrem aprovação,
pendência, teste, conta existente, repetição, ordem atrasada, bloqueio concorrente,
falha de cadastro, transporte e configuração ausente, aceite/rejeição SMTP,
fechamento da conexão e proteção dos detalhes de erro. Os testes de integração devem verificar RLS e as funções de bloqueio
sem deixar registros de teste no ambiente de produção.

Validar em sandbox uma compra nova, uma conta existente e pagamento assíncrono,
incluindo recebimento do e-mail, definição da senha e acesso ao plano. Não usar
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

O token de ativação é de uso único e tem a validade configurada no Supabase Auth.
O cliente o consome ao enviar o formulário de senha. Links expirados podem ser
substituídos por recuperação de senha. Não registrar tokens ou payloads de e-mail
em logs, nem expor essas tabelas a usuários do app.
