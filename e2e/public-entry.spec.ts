import { test, expect } from '../playwright-fixture';

test('login renders, preserves input and toggles password visibility on desktop/mobile', async ({ page }) => {
  const crashes: string[] = [];
  page.on('pageerror', error => crashes.push(error.message));
  await page.goto('/auth?mode=login');
  const email = page.locator('#email');
  const password = page.locator('#password');
  await expect(email).toBeVisible();
  await email.fill('fixture@example.invalid');
  await password.fill('fixture-only-password');
  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar senha', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(email).toHaveValue('fixture@example.invalid');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect(crashes).toEqual([]);
});

test('protected recipe editor redirects an anonymous browser to login', async ({ page }) => {
  await page.goto('/receitas/nova');
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  await expect(page.locator('#email')).toBeVisible();
});

test('unknown route offers a working return to the application', async ({ page }) => {
  await page.goto('/e2e-route-that-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  const cookies = page.getByRole('dialog', { name: 'Aviso de cookies' });
  await cookies.getByRole('button', { name: 'Recusar opcionais', exact: true }).click();
  await expect(cookies).toBeHidden();
  await page.getByRole('link', { name: 'Voltar ao Dashboard' }).click();
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
});
