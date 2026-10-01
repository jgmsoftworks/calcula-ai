import nodemailer from 'npm:nodemailer@10.0.13';

export const GMAIL_SENDER = 'Calcula Aí <jgmsoftworks@gmail.com>';

export function gmailTransport() {
  const password = Deno.env.get('GMAIL_SMTP_PASSWORD');
  if (!password) throw new Error('payment_email_not_configured');
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: 'jgmsoftworks@gmail.com', pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    dnsTimeout: 10000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
}

export async function smtpMessageId(key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  return `<billing-${hash}@calculaaibr.com>`;
}

export async function sendGmailPayment(key: string, payload: { to: string[]; subject: string; html: string; text: string; reply_to: string }) {
  const transport = gmailTransport();
  try {
    const result = await transport.sendMail({
      from: GMAIL_SENDER,
      to: payload.to,
      replyTo: payload.reply_to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      messageId: await smtpMessageId(key),
    });
    if (!result.messageId || result.accepted.length !== payload.to.length || result.rejected.length) {
      throw new Error('payment_email_smtp_not_accepted');
    }
    return result.messageId;
  } catch {
    // SMTP errors can contain recipient addresses and server responses.
    // Never propagate credentials, activation links, or message bodies to logs.
    throw new Error('payment_email_smtp_failed');
  } finally {
    transport.close();
  }
}
