import { test as base, expect } from '@playwright/test';

// Every browser test must import this fixture. No production traffic or accounts.
export const test = base.extend<{ isolatedNetwork: void }>({
  isolatedNetwork: [async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL!).origin;
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return url.origin === origin ? route.continue() : route.abort('blockedbyclient');
    });
    await context.routeWebSocket('**/*', socket => {
      const url = new URL(socket.url());
      if (url.hostname === '127.0.0.1' && url.port === '4173') socket.connectToServer();
      else socket.close();
    });
    await use();
  }, { auto: true }],
});
export { expect };
