export default {
  createTransport: (..._args: unknown[]): any => {
    throw new Error('Unexpected live SMTP client in billing unit test');
  },
};
