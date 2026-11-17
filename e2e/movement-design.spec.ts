import type { Page } from '@playwright/test';
import { test, expect } from '../playwright-fixture';

const photo = (fill: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eee8df"/><ellipse cx="200" cy="248" rx="145" ry="22" fill="#d3c7b6"/><path d="M85 110h230v120H85z" fill="${fill}"/><path d="M85 160h230v24H85z" fill="#fff4d2"/><ellipse cx="200" cy="110" rx="115" ry="32" fill="${fill}"/><path d="M100 98q40-25 65 8t65 0 65 0" fill="none" stroke="#fcf6df" stroke-width="8"/></svg>`)}`;
const types = [{ id: 'slices', nome: 'Fatia suprema', imagem_url: photo('#603e30') }, { id: 'pots', nome: 'Bolo no pote', imagem_url: photo('#caa561') }, { id: 'fillings', nome: 'Recheio', imagem_url: photo('#e3ca9b') }];
const names = ['Alemã', 'Bolo gelado de abacaxi com coco', 'Brigadeiro', 'Brigadeiro de ninho consistente'];
const products = Array.from({ length: 40 }, (_, i) => ({ nome: names[i % 4] + (i < 4 ? '' : ` ${i}`), i })).map(({ nome, i }) => ({ id: `product-${i}`, user_id: 'owner', nome, codigo_interno: i + 1, categorias: [types[i % 3].nome], marcas: [], codigos_barras: [], imagem_url: i === 1 ? null : types[i % 3].imagem_url, unidade_compra: i === 3 ? 'grama (g)' : 'unidade (un)', unidade_uso: null, fator_conversao: null, custo_unitario: i === 3 ? 0.02 : 6.99, estoque_atual: i === 3 ? 32742 : 35, estoque_minimo: 1, ativo: true, created_at: '', updated_at: '' }));

async function setupMovement(page: Page) {
  let catalog = structuredClone(types);
  const writes: Record<string, unknown>[] = [];
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvJkAAAAASUVORK5CYII=', 'base64');
  let uploads = 0;
  await page.route('**/storage/v1/object/**', async route => {
    if (route.request().method() === 'POST') {
      uploads++;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'uploaded-photo' }) });
    } else await route.fulfill({ status: 200, contentType: 'image/png', body: png });
  });
  await page.route('**/rest/v1/**', async route => {
    const url = new URL(route.request().url());
    const table = url.pathname.split('/').pop();
    let data: unknown = [];
    if (table === 'tipos_produto') {
      if (route.request().method() === 'PATCH') {
        const input = route.request().postDataJSON(); writes.push(input);
        catalog = catalog.map(t => t.id === url.searchParams.get('id')?.replace('eq.', '') ? { ...t, ...input } : t);
        data = catalog.find(t => t.id === url.searchParams.get('id')?.replace('eq.', ''));
      } else data = catalog;
    }
    if (table === 'get_my_access') data = { can_access: true, reason: 'active', server_now: new Date().toISOString(), access_mode: 'legacy', plan: 'Empresarial', trial_ends_at: null, subscription_status: page.url().includes('grace') ? 'past_due' : 'active', grace_period_ends_at: new Date(Date.now() + 86400000).toISOString(), access_blocked_at: null, is_admin: false, has_subscription: true };
    if (table === 'folha_pagamento') data = [{ id: 'employee', nome: 'Pessoa de teste' }];
    if (table === 'listar_produtos_pagina') data = { produtos: products, total: products.length, totalBusca: products.length, pagina: 1, categorias: types.map(t => ({ nome: t.nome, imagem: t.imagem_url, count: 1 })) };
    if (table === 'geladeira_itens') data = products.map((p, i) => ({ id: `fridge-${i}`, receita_id: `recipe-${i}`, user_id: 'owner', unidade: p.unidade_compra, estoque_atual: p.estoque_atual, estoque_minimo: 1, receita: { id: `recipe-${i}`, nome: p.nome, numero_sequencial: i + 1, imagem_url: p.imagem_url, tipo_produto: types[i % 3], rendimento_valor: 1, rendimento_unidade: p.unidade_compra, ingredientes: [{ quantidade: 1, produto: { custo_unitario: p.custo_unitario } }] } }));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  return { writes, png, uploads: () => uploads };
}

async function expectViewport(page: Page) {
  const bounds = await page.evaluate(() => ({ fitsWidth: document.documentElement.scrollWidth <= innerWidth + 1, fitsHeight: document.documentElement.scrollHeight <= innerHeight + 1, mainFits: document.querySelector('main')!.scrollHeight <= document.querySelector('main')!.clientHeight + 1, documentTop: window.scrollY, mainTop: document.querySelector('main')!.scrollTop }));
  expect(bounds).toEqual({ fitsWidth: true, fitsHeight: true, mainFits: true, documentTop: 0, mainTop: 0 });
}

test('movement layout separates type, price and stock; type photos survive save and reload', async ({ page }, testInfo) => {
  const state = await setupMovement(page);
  await page.goto('/e2e/fixtures/movement-design.html');
  const card = page.getByRole('button', { name: 'Movimentar Alemã', exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByText('Categoria:')).toBeVisible();
  await expect(card.getByText('Custo / un')).toBeVisible();
  await expect(card.getByText('Em estoque')).toBeVisible();
  const checkOverflow = () => expectViewport(page);
  await checkOverflow();
  await page.screenshot({ path: testInfo.outputPath('movement-products.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Geladeira', exact: true }).click();
  await expect(card.getByText('Tipo:')).toBeVisible();
  await expect(page.getByRole('button', { name: /Fatia suprema/, exact: false }).first()).toBeVisible();
  await checkOverflow();
  await page.screenshot({ path: testInfo.outputPath('movement-fridge.png'), fullPage: true, animations: 'disabled' });
  await page.goto('/e2e/fixtures/movement-design.html?types=1');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toBeVisible();
  await dialog.getByRole('button', { name: 'Editar Fatia suprema' }).click();
  await expect(dialog.getByAltText('Foto do tipo')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('movement-types.png'), fullPage: true, animations: 'disabled' });
  await dialog.getByLabel('Foto do tipo de produto').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: state.png });
  await page.getByRole('button', { name: 'Confirmar Corte', exact: true }).click();
  expect(state.uploads()).toBe(0);
  await dialog.getByRole('button', { name: 'Salvar tipo de produto' }).click();
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toHaveAttribute('src', /\/tipos-produto\/.+\.jpg$/);
  expect(state.uploads()).toBe(1);
  await page.reload();
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toHaveAttribute('src', /\/tipos-produto\/.+\.jpg$/);
  await dialog.getByRole('button', { name: 'Editar Fatia suprema' }).click();
  await dialog.getByRole('button', { name: 'Remover foto' }).click();
  await dialog.getByRole('button', { name: 'Salvar tipo de produto' }).click();
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toHaveCount(0);
  expect(state.writes.at(-1)).toMatchObject({ nome: 'Fatia suprema', imagem_url: null });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Editar Fatia suprema' })).toBeVisible();
  await expect(page.getByAltText('Foto de Fatia suprema')).toHaveCount(0);
  await checkOverflow();
});


test('only catalog and cart scroll within the real application layout', async ({ page }, testInfo) => {
  await setupMovement(page);
  await page.goto('/e2e/fixtures/movement-design.html?grace=1');
  await expect(page.getByText('Pagamento em atraso.', { exact: true })).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.getByRole('button', { name: 'Movimentar Alemã', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Motivo', { exact: true }).click();
    await page.getByRole('option', { name: 'Compra de fornecedor', exact: true }).click();
    await dialog.getByRole('button', { name: /Adicionar/ }).click();
  }
  const sizes = testInfo.project.name === 'desktop'
    ? [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 1024, height: 600 }]
    : [{ width: 393, height: 700 }, { width: 360, height: 640 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await expect(page.getByRole('button', { name: 'Movimentar Alemã', exact: true })).toBeVisible();
    await expectViewport(page);
    if (size.width >= 1024) {
      const logo = await page.getByAltText('CalculaAi - Precificação Inteligente', { exact: true }).boundingBox();
      const noticeAction = await page.getByRole('button', { name: 'Regularizar pagamento', exact: true }).boundingBox();
      expect(logo!.y).toBeGreaterThanOrEqual(noticeAction!.y + noticeAction!.height);
    }
    const list = page.getByRole('region', { name: 'Produtos disponíveis' });
    const searchBefore = await page.getByPlaceholder('Busque por nome, código ou código de barras...').boundingBox();
    await list.evaluate(e => { e.scrollTop = e.scrollHeight; });
    await expect(page.getByRole('button', { name: 'Movimentar Brigadeiro de ninho consistente 39', exact: true })).toBeInViewport();
    expect(await list.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
    expect(await page.getByPlaceholder('Busque por nome, código ou código de barras...').boundingBox()).toEqual(searchBefore);
    await expectViewport(page);
    await list.evaluate(e => { e.scrollTop = 0; });
    if (size.width < 1024) await page.getByRole('group', { name: 'Área de movimentação' }).getByRole('button', { name: 'Carrinho' }).click();
    await expect(page.getByRole('button', { name: 'Finalizar e Gerar Comprovante' })).toBeInViewport();
    const cartItems = page.getByRole('region', { name: 'Itens no carrinho' });
    await cartItems.evaluate(e => { e.scrollTop = e.scrollHeight; });
    expect(await cartItems.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
    const lastRemove = cartItems.getByRole('button', { name: 'Remover Alemã' }).last();
    await lastRemove.scrollIntoViewIfNeeded();
    await expect(lastRemove).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Finalizar e Gerar Comprovante' })).toBeInViewport();
    await page.getByLabel('Observação', { exact: true }).fill('Preservar ao alternar as abas');
    await expectViewport(page);
    await page.screenshot({ path: testInfo.outputPath(`movement-viewport-${size.width}.png`), fullPage: true, animations: 'disabled' });
    if (size.width < 1024) {
      await page.getByRole('group', { name: 'Área de movimentação' }).getByRole('button', { name: 'Produtos' }).click();
      await page.getByRole('group', { name: 'Área de movimentação' }).getByRole('button', { name: 'Carrinho' }).click();
      await expect(page.getByLabel('Observação', { exact: true })).toHaveValue('Preservar ao alternar as abas');
      await page.getByRole('group', { name: 'Área de movimentação' }).getByRole('button', { name: 'Produtos' }).click();
    }
  }
  // Returning to an ordinary page must restore its normal document scrolling.
  if (testInfo.project.name === 'mobile') await page.getByRole('button', { name: 'Abrir menu principal' }).click();
  await page.getByRole('link', { name: 'Receitas', exact: true }).click();
  await expect(page.getByText('Lista de receitas de teste', { exact: true })).toBeVisible();
  const lastRow = page.getByText('Fim da lista de receitas de teste', { exact: true });
  await lastRow.scrollIntoViewIfNeeded();
  await expect(lastRow).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY > 0 || document.querySelector('main')!.scrollTop > 0)).toBe(true);
});
