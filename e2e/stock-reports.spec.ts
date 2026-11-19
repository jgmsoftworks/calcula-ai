import { test, expect } from '../playwright-fixture';

test('stock reports share one menu destination and expose all four views', async ({ page, isMobile }, testInfo) => {
  const stock = [
    { id: 'c', codigo_interno: 1, nome: 'Cacau', estoque_atual: 4, estoque_minimo: 6, custo_unitario: 18, unidade_compra: 'kg', categorias: ['Ingredientes'] },
    { id: 'a', codigo_interno: 2, nome: 'Açúcar', estoque_atual: 12, estoque_minimo: 5, custo_unitario: 6, unidade_compra: 'kg', categorias: ['Ingredientes'] },
  ];
  const movements = [
    { id: 'm1', tipo: 'saida', quantidade: 2, subtotal: 36, produto_id: 'c', custo_aplicado: 18, produtos: { nome: 'Cacau' } },
    { id: 'm2', tipo: 'entrada', quantidade: 12, subtotal: 72, produto_id: 'a', custo_aplicado: 6, produtos: { nome: 'Açúcar' } },
  ].map((m, i) => ({ ...m, data_hora: new Date().toISOString(), responsavel: i ? 'Lia' : 'Rui', motivo: i ? 'Compra' : 'Produção' }));
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    let data: unknown = [];
    if (table === 'get_my_access') data = { can_access: true, reason: 'active', server_now: new Date().toISOString(), access_mode: 'legacy', plan: 'Empresarial', is_admin: false, has_subscription: true };
    if (table === 'produtos') data = stock;
    if (table === 'movimentacoes') {
      const tipo = url.searchParams.get('tipo');
      data = movements.filter(m => !tipo || tipo === 'eq.' + m.tipo);
    }
    if (table === 'estoque_fechamentos_mensais' || table === 'user_configurations') data = null;
    await route.fulfill({ status: 200, json: data });
  });
  await page.goto('/e2e/fixtures/movement-design.html?reports');
  const panel = page.getByRole('tabpanel');
  const tabs = page.getByRole('tablist', { name: 'Relatórios de estoque' });
  await expect(tabs.getByRole('tab', { selected: true })).toHaveText('Resumo');
  await expect(panel.getByText('144,00', { exact: false }).first()).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'Movimentação diária' })).toBeVisible();
  await expect.poll(() => panel.locator('.recharts-bar-rectangle path').evaluateAll(paths =>
    paths.some(path => path.getBoundingClientRect().height > 5))).toBe(true);
  await panel.getByRole('button', { name: /Como se calcula CMV/ }).click();
  await expect(page.getByText(/Cada receita com percentual conta uma vez/)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: testInfo.outputPath('resumo.png'), animations: 'disabled' });
  if (isMobile) await page.getByRole('button', { name: 'Abrir menu principal' }).click();
  await expect(page.locator('a[href="/relatorios/estoque"]:visible')).toHaveCount(1);
  await expect(page.locator('a[href="/relatorios/resumo-estoque"]')).toHaveCount(0);
  if (isMobile) await page.keyboard.press('Escape');

  for (const tab of ['Posição', 'Movimentações', 'Ranking']) {
    await tabs.getByRole('tab', { name: tab, exact: true }).click();
    await expect(panel.locator('tbody')).toContainText('Cacau');
    await expect(panel.getByRole('button', { name: 'Excel' })).toBeEnabled();
    expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(tab + '.png'), animations: 'disabled' });
    if (tab === 'Posição') {
      await panel.getByRole('switch', { name: 'Abaixo do mínimo' }).click();
      await expect(panel.locator('tbody tr')).toHaveCount(1);
      await expect(panel.locator('tbody')).toContainText('Cacau');
      for (const [format, extension] of [['Excel', '.xlsx'], ['PDF', '.pdf']]) {
        const downloading = page.waitForEvent('download');
        await panel.getByRole('button', { name: format }).click();
        expect((await downloading).suggestedFilename().endsWith(extension)).toBe(true);
      }
    }
    if (tab === 'Movimentações') {
      await panel.getByLabel('Responsável', { exact: true }).fill('Lia');
      await panel.getByRole('button', { name: 'Aplicar filtros' }).click();
      await expect(panel.locator('tbody tr')).toHaveCount(1);
      await expect(panel.locator('tbody')).toContainText('Açúcar');
    }
    if (tab === 'Ranking') {
      await panel.getByRole('combobox', { name: 'Tipo' }).click();
      await page.getByRole('option', { name: 'Todos' }).click();
      await panel.getByRole('button', { name: 'Aplicar filtros' }).click();
      await expect(panel.locator('tbody tr').first()).toContainText('Açúcar');
    }
  }
});
