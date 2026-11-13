export default {
  createTransport: (..._args: unknown[]): {
    sendMail(message: { to: string[]; subject: string; html: string; text: string; from: string; replyTo: string; messageId: string }): Promise<{ messageId: string; accepted: string[]; rejected: string[] }>;
    close(): void;
  } => {
    throw new Error('Unexpected live SMTP client in billing unit test');
  },
};
