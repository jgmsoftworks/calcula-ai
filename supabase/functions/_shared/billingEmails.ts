import { APP_URL } from './billingRules.ts';

export type EmailKind = 'pending' | 'approved' | 'trial' | 'failed';
const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function paymentEmail(kind: EmailKind, email: string, plan: string, setupLink?: string) {
  const titles = {
    pending: 'Estamos aguardando a aprovação do seu pagamento',
    approved: 'Pagamento aprovado! Seu acesso ao Calcula Aí está liberado',
    trial: 'Seu período de teste no Calcula Aí começou',
    failed: 'Não foi possível confirmar seu pagamento',
  };
  const message = {
    pending: 'Recebemos sua solicitação. Assim que o pagamento for aprovado, você receberá outro e-mail com as instruções de acesso. Não é necessário comprar novamente.',
    approved: `Seu plano ${plan} está liberado. ${setupLink ? 'Sua conta foi criada. Use o botão abaixo para definir sua senha pessoal e começar.' : 'Use o e-mail desta compra e sua senha atual para entrar. Sua senha não foi alterada.'}`,
    trial: `Seu plano ${plan} está disponível durante o período de teste contratado. Este e-mail não é uma confirmação de cobrança. ${setupLink ? 'Defina sua senha pessoal para começar.' : 'Entre com sua senha atual.'}`,
    failed: 'Seu pagamento não foi aprovado. Confira a forma de pagamento antes de tentar novamente. Se você acredita que já foi cobrado, fale com nosso suporte.',
  }[kind];
  const link = setupLink ?? `${APP_URL}/auth?mode=login`;
  const button = setupLink ? 'Definir minha senha e acessar' : 'Entrar no Calcula Aí';
  const access = kind === 'approved' || kind === 'trial';
  const text = `${titles[kind]}\n\n${message}\n\n${access ? `Seu login: ${email}\n${button}: ${link}\n\nSe o link expirar, use “Esqueci minha senha” em ${APP_URL}/auth.\n\n` : ''}Suporte: calculaai.adm@gmail.com`;
  const html = `<div style="background:#f4f7fb;padding:32px 16px;font-family:Arial,sans-serif;color:#19263d"><div style="max-width:540px;margin:auto;background:white;border-radius:16px;padding:32px"><p style="font-size:23px;font-weight:bold;color:#2563eb">Calcula Aí</p><h1 style="font-size:24px;line-height:1.3">${escape(titles[kind])}</h1><p style="line-height:1.7">${escape(message)}</p>${access ? `<p>Seu login: <strong>${escape(email)}</strong></p><p style="margin:28px 0"><a href="${escape(link)}" style="background:#2563eb;color:#fff;padding:14px 20px;border-radius:8px;text-decoration:none;display:inline-block">${button}</a></p><p style="font-size:13px;color:#64748b">Se o link expirar, use “Esqueci minha senha” na tela de entrada.</p>` : ''}<p style="font-size:13px;color:#64748b">Precisa de ajuda? <a href="mailto:calculaai.adm@gmail.com">Fale com o suporte</a>.</p></div></div>`;
  return { subject: titles[kind], html, text };
}

// The webhook retries on transport failure. A provider acceptance is persisted;
// repeated Stripe events reuse the same key and cannot enqueue another email.
export async function sendPaymentEmail(db: any, key: string, build: () => Promise<{ to: string; subject: string; html: string; text: string }>) {
  const { data: existing, error: readError } = await db.from('billing_emails').select('*').eq('key', key).maybeSingle();
  if (readError) throw new Error('email_state_read_failed');
  if (existing?.sent_at) return;
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('PAYMENTS_EMAIL_FROM');
  if (!apiKey || !from) throw new Error('payment_email_not_configured');
  let payload = existing?.payload;
  if (!payload) {
    const content = await build();
    payload = { from, to: [content.to], subject: content.subject, html: content.html, text: content.text, reply_to: 'calculaai.adm@gmail.com' };
    const { error } = await db.from('billing_emails').insert({ key, payload });
    if (error) throw new Error('email_queue_failed');
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`payment_email_provider_${response.status}`);
  const result = await response.json();
  if (!result.id) throw new Error('payment_email_provider_missing_id');
  const { error } = await db.from('billing_emails').update({ sent_at: new Date().toISOString(), provider_id: result.id, payload: null }).eq('key', key);
  if (error) throw new Error('email_receipt_write_failed');
}
