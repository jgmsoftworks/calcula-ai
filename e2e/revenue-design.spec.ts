import { test, expect } from '../playwright-fixture';

test('revenue layout saves monthly entries, retains input on failure and stays within mobile width', async ({ page }, testInfo) => {
  let entries = [
    { id: '3', valor: 12500, mes: '2026-10-01T12:00:00Z' },
    { id: '2', valor: 10000, mes: '2026-09-01T12:00:00Z' },
    { id: '1', valor: 7500, mes: '2026-08-01T12:00:00Z' },
  ];
  let fail = false;
  const writes: unknown[] = [];
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    let data: unknown = [];
    if (table === 'get_my_access') data = { can_access: true, reason: 'active', server_now: new Date().toISOString(), access_mode: 'legacy', plan: 'Empresarial', trial_ends_at: null, subscription_status: 'active', is_admin: false, has_subscription: true };
    if (table === 'user_configurations') {
      if (route.request().method() === 'POST') {
        if (fail) return route.fulfill({ status: 503, json: { message: 'Falha sintética' } });
        const body = route.request().postDataJSON();
        entries = body.configuration; writes.push(body);
        data = null;
      } else data = url.searchParams.get('type') === 'eq.faturamentos_historicos' ? { configuration: entries } : null;
    }
    await route.fulfill({ status: 200, json: data });
  });
  await page.goto('/e2e/fixtures/movement-design.html?revenue=1');
  const table = page.getByRole('table', { name: 'Lançamentos de faturamento' });
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByLabel('Resumo do faturamento')).toContainText('10.000,00');
  await expect(page.getByLabel('Resumo do faturamento')).toContainText('30.000,00');
  await page.screenshot({ path: testInfo.outputPath('movement-revenue.png'), fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByLabel('Valor do faturamento', { exact: true }).fill('123456');
  await page.getByLabel('Mês', { exact: true }).click();
  await page.getByRole('option', { name: 'Novembro', exact: true }).click();
  await page.getByLabel('Ano', { exact: true }).fill('2026');
  fail = true;
  await page.getByRole('button', { name: 'Adicionar lançamento', exact: true }).click();
  await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
  await expect(table.locator('tbody tr')).toHaveCount(3);
  await expect(page.getByLabel('Valor do faturamento', { exact: true })).toHaveValue(/1\.234,56/);
  fail = false;
  await page.getByRole('button', { name: 'Adicionar lançamento', exact: true }).click();
  await expect(table.locator('tbody tr')).toHaveCount(4);
  expect(entries.find(entry => entry.valor === 1234.56)).toBeTruthy();
  expect(writes).toHaveLength(1);
  await page.reload();
  await expect(table.locator('tbody tr')).toHaveCount(4);
  await expect(table.getByText('novembro/2026', { exact: true })).toBeVisible();
  await table.getByRole('button', { name: /Excluir lançamento de novembro/ }).click();
  await expect(table.locator('tbody tr')).toHaveCount(3);
  expect(entries).toHaveLength(3);
  expect(writes).toHaveLength(2);
});
