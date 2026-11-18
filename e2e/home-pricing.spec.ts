import { test, expect } from '../playwright-fixture';

test('home compares recipe margins, simulates another markup and opens the price editor', async ({ page }, testInfo) => {
  const makeRecipe = (id: string, nome: string, price: number, cost: number) => ({
    id, nome, preco_venda: price, markup_id: 'credit', markup: { tipo: 'normal' },
    rendimento_valor: 10, rendimento_unidade: 'un', status: 'finalizada',
    ingredientes: [{ quantidade: 10, produto: { custo_unitario: cost, unidade_uso: null } }],
    embalagens: [], sub_receitas: [], mao_obra: [],
  });
  const recipes = [
    makeRecipe('bolo', 'Bolo de cenoura', 10, 6), makeRecipe('torta', 'Torta de limão', 12, 8),
    makeRecipe('bombom', 'Bombom de morango', 8, 4.5), makeRecipe('cookie', 'Cookie de chocolate', 9, 3),
    makeRecipe('brigadeiro', 'Brigadeiro tradicional', 5, 2), makeRecipe('brownie', 'Brownie de cacau', 8, 2.5),
    makeRecipe('pudim', 'Pudim de leite', 12, 4), makeRecipe('trufa', 'Trufa de café', 6, 2),
  ];
  const markups = [
    { id: 'credit', nome: 'Crédito', markup_ideal: 1 / 0.57, periodo: '3', tipo: 'normal', margem_lucro: 25, gasto_sobre_faturamento: 10, encargos_sobre_venda: 8 },
    { id: 'pix', nome: 'Pix', markup_ideal: 1.25, periodo: '3', tipo: 'normal', margem_lucro: 20, gasto_sobre_faturamento: 0, encargos_sobre_venda: 0 },
  ];
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    let data: unknown = [];
    if (table === 'get_my_access') data = { can_access: true, reason: 'active', server_now: new Date().toISOString(),
      access_mode: 'legacy', plan: 'Empresarial', is_admin: false, has_subscription: true };
    if (table === 'receitas') data = url.searchParams.has('id') ? recipes[1] : recipes;
    if (table === 'markups') data = url.searchParams.get('tipo') === 'eq.sub_receita' ? null : markups;
    if (table === 'user_configurations') data = url.searchParams.get('type')?.startsWith('like.') ? [
      { type: 'markup_crédito', configuration: { gastoSobreFaturamento: 10, taxas: 8, valorEmReal: 1, lucroDesejado: 25 } },
    ] : null;
    if (table === 'produtos' && route.request().method() === 'HEAD') {
      return route.fulfill({ status: 200, headers: { 'content-range': '0-28/29', 'access-control-expose-headers': 'Content-Range' } });
    }
    await route.fulfill({ status: 200, json: data });
  });

  await page.goto('/e2e/fixtures/movement-design.html?home');
  const review = page.getByRole('link', { name: 'Revisar preço de Torta de limão' });
  await expect(page.getByRole('heading', { name: 'Receitas abaixo da meta' })).toBeVisible();
  await expect(review).toContainText('15,79');
  await expect(page.getByText('8 de 8 fichas analisadas.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Produtos ativos/ })).toContainText('29');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('inicio.png'), fullPage: true, animations: 'disabled' });
  const alerts = page.getByRole('region', { name: 'Receitas abaixo da meta' });
  await expect(alerts.getByRole('link')).toHaveCount(3);
  await alerts.getByRole('button', { name: 'Mostrar mais receitas' }).click();
  await expect(alerts.getByRole('link')).toHaveCount(4);
  await alerts.getByRole('button', { name: 'Mostrar menos' }).click();
  await expect(alerts.getByRole('link')).toHaveCount(3);
  const details = alerts.getByRole('button', { name: 'Detalhes' });
  await expect(review.getByText(/Lucro de/)).toHaveCount(0);
  await details.click();
  await expect(review.getByText(/Lucro de/)).toBeVisible();
  await expect(review.getByText(/Ajuste de/)).toBeVisible();
  await details.click();
  await page.getByLabel('Markup da análise').click();
  await page.getByRole('option', { name: 'Pix', exact: true }).click();
  await expect(page.getByText('Todas as receitas analisadas atingem o lucro desejado.')).toBeVisible();
  await page.getByLabel('Markup da análise').click();
  await page.getByRole('option', { name: 'De cada receita' }).click();
  await review.click();
  await expect(page.getByText('Resumo de Custos', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await expect(review).toBeVisible();
});
