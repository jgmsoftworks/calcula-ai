import { test, expect } from '../playwright-fixture';

test('home compares recipe margins, simulates another markup and opens the price editor', async ({ page }, testInfo) => {
  const makeRecipe = (id: string, nome: string, price: number, cost: number) => ({
    id, nome, preco_venda: price, markup_id: 'credit', markup: { tipo: 'normal' },
    rendimento_valor: 10, rendimento_unidade: 'un', status: 'finalizada',
    ingredientes: [{ quantidade: 10, produto: { custo_unitario: cost, unidade_uso: null } }],
    embalagens: [], sub_receitas: [], mao_obra: [],
  });
  const recipes = [
    makeRecipe('bolo', 'Bolo de cenoura', 10, 6), { ...makeRecipe('torta', 'Torta de limão', 12, 6), sub_receitas: [
      { quantidade: 10, sub_receita_id: 'base', sub_receita: { preco_venda: 20, rendimento_valor: 10, status: 'finalizada', markup: { tipo: 'sub_receita' } } },
    ] },
    makeRecipe('bombom', 'Bombom de morango', 8, 4.5), makeRecipe('cookie', 'Cookie de chocolate', 9, 3),
    makeRecipe('brigadeiro', 'Brigadeiro tradicional', 5, 2), makeRecipe('brownie', 'Brownie de cacau', 8, 2.5),
    { ...makeRecipe('zero', 'Exemplo sem rendimento', 10, 0.1), rendimento_valor: 0 },
    { ...makeRecipe('base', 'Preparo de teste', 20, 50), markup_id: 'sub', tipo_produto_id: 'base', markup: { tipo: 'sub_receita' } },
    { ...makeRecipe('unknown', 'Ficha sem classificação', 1, 1.1), markup: null, markup_id: null },
    { ...makeRecipe('legacy', 'Preparo importado', 2.58761, 3), tipo_produto_id: 'base' },
    { ...makeRecipe('retail', 'Produto de venda medido por peso', 15.73214, 1), rendimento_unidade: 'Grama (g)', tipo_produto_id: 'base' },
    { ...makeRecipe('kit', 'Kit com componente sem custo', 9, 1), sub_receitas: [
      { sub_receita_id: 'bolo', quantidade: 5, sub_receita: { preco_venda: 10, rendimento_valor: 1, status: 'finalizada', markup: { tipo: 'normal' } } },
    ] },
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
    if (table === 'receitas') {
      if (url.searchParams.has('id')) data = recipes[1];
      else if (url.searchParams.get('markup.tipo') === 'eq.normal' && url.searchParams.get('select')?.includes('markup:markups!inner(tipo)')) {
        data = recipes.filter(r => r.markup?.tipo === 'normal');
      } else data = recipes;
    }
    if (table === 'markups') {
      const sub = { ...markups[0], id: 'sub', tipo: 'sub_receita', nome: 'Sub-receita' };
      const tipo = url.searchParams.get('tipo');
      data = tipo === 'eq.sub_receita' ? sub : tipo === 'eq.normal' ? markups : [...markups, sub];
    }
    if (table === 'user_configurations') data = url.searchParams.get('type')?.startsWith('like.') ? [
      { type: 'markup_crédito', configuration: { gastoSobreFaturamento: 10, taxas: 8, valorEmReal: 1, lucroDesejado: 25 } },
    ] : null;
    if (table === 'produtos') data = Array.from({ length: 29 }, () => ({ estoque_atual: 2, custo_unitario: 4.5 }));
    if (table === 'geladeira_itens') data = [
      { id: 'cold-cake', estoque_atual: 2, receita: recipes[0] },
      { id: 'cold-base', estoque_atual: 0.5, receita: recipes.find(r => r.id === 'base') },
    ];
    await route.fulfill({ status: 200, json: data });
  });

  await page.goto('/e2e/fixtures/movement-design.html?home');
  const review = page.getByRole('link', { name: 'Revisar preço de Torta de limão' });
  await expect(page.getByRole('heading', { name: 'Receitas abaixo da meta' })).toBeVisible();
  await expect(review).toContainText('15,79');
  await expect(page.getByText('9 de 12 receitas de venda analisadas.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Produtos ativos/ })).toContainText('29');
  await expect(page.getByRole('link', { name: /Total em estoque/ })).toContainText('261,00');
  await expect(page.getByRole('link', { name: /Total na geladeira/ })).toContainText('37,00');
  const cmv = page.getByRole('button', { name: 'Como é calculado o indicador CMV médio das receitas?' });
  const margin = page.getByRole('button', { name: 'Como é calculado o indicador Margem líquida média?' });
  await expect(page.getByText('51,0%', { exact: true })).toBeVisible();
  await cmv.click();
  await expect(page.getByRole('dialog', { name: 'CMV médio das receitas' })).toContainText('13 fichas consideradas');
  await page.keyboard.press('Escape');
  await margin.click();
  await expect(page.getByRole('dialog', { name: 'Margem líquida média' })).toContainText('9 receitas analisadas · De cada receita');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('inicio.png'), fullPage: true, animations: 'disabled' });
  const alerts = page.getByRole('region', { name: 'Receitas abaixo da meta' });
  await expect(alerts.getByRole('link')).toHaveCount(3);
  await alerts.getByRole('button', { name: 'Mostrar mais receitas' }).click();
  await expect(alerts.getByRole('link')).toHaveCount(4);
  await expect(alerts.getByRole('link', { name: /Exemplo sem rendimento|Preparo importado|Preparo de teste|Kit com componente/ })).toHaveCount(0);
  await alerts.getByText('3 fichas fora da análise').click();
  await expect(alerts.getByText('1 ficha sem rendimento válido.')).toBeVisible();
  await expect(alerts.getByText('1 ficha sem preço de venda unitário confirmado.')).toBeVisible();
  await alerts.getByRole('button', { name: 'Mostrar menos' }).click();
  await expect(alerts.getByRole('link')).toHaveCount(3);
  await expect(alerts.getByText('1 ficha com custo de sub-receita pendente.')).toBeVisible();
  const details = alerts.getByRole('button', { name: 'Detalhes' });
  await expect(review.getByText(/Lucro de/)).toHaveCount(0);
  await details.click();
  await expect(review.getByText(/Lucro de/)).toBeVisible();
  await expect(review.getByText(/Ajuste de/)).toBeVisible();
  await details.click();
  await page.getByLabel('Markup da análise').click();
  await expect(page.getByRole('option', { name: 'Sub-receita', exact: true })).toHaveCount(0);
  await page.getByRole('option', { name: 'Pix', exact: true }).click();
  await expect(page.getByText('9 de 12 receitas de venda analisadas.')).toBeVisible();
  await expect(page.getByText('51,0%', { exact: true })).toBeVisible();
  await margin.click();
  await expect(page.getByRole('dialog', { name: 'Margem líquida média' })).toContainText('9 receitas analisadas · Pix');
  await page.keyboard.press('Escape');
  await expect(page.getByText('Todas as receitas analisadas atingem o lucro desejado.')).toBeVisible();
  await page.getByLabel('Markup da análise').click();
  await page.getByRole('option', { name: 'De cada receita' }).click();
  await review.click();
  await expect(page.getByText('Resumo de Custos', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await expect(review).toBeVisible();
});
