import { test, expect } from '../playwright-fixture';

const photo = (fill: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="#eee8df"/><ellipse cx="200" cy="248" rx="145" ry="22" fill="#d3c7b6"/><path d="M85 110h230v120H85z" fill="${fill}"/><path d="M85 160h230v24H85z" fill="#fff4d2"/><ellipse cx="200" cy="110" rx="115" ry="32" fill="${fill}"/><path d="M100 98q40-25 65 8t65 0 65 0" fill="none" stroke="#fcf6df" stroke-width="8"/></svg>`)}`;
const types = [{ id: 'slices', nome: 'Fatia suprema', imagem_url: photo('#603e30') }, { id: 'pots', nome: 'Bolo no pote', imagem_url: photo('#caa561') }, { id: 'fillings', nome: 'Recheio', imagem_url: photo('#e3ca9b') }];
const names = ['Alemã', 'Bolo gelado de abacaxi com coco', 'Brigadeiro', 'Brigadeiro de ninho consistente'];
const products = names.map((nome, i) => ({ id: `product-${i}`, user_id: 'owner', nome, codigo_interno: i + 1, categorias: [types[i % 3].nome], marcas: [], codigos_barras: [], imagem_url: i === 1 ? null : types[i % 3].imagem_url, unidade_compra: i === 3 ? 'grama (g)' : 'unidade (un)', unidade_uso: null, fator_conversao: null, custo_unitario: i === 3 ? 0.02 : 6.99, estoque_atual: i === 3 ? 32742 : 35, estoque_minimo: 1, ativo: true, created_at: '', updated_at: '' }));

test('movement layout separates type, price and stock; type photos survive save and reload', async ({ page }, testInfo) => {
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
    if (table === 'listar_produtos_pagina') data = { produtos: products, total: 4, totalBusca: 4, pagina: 1, categorias: types.map(t => ({ nome: t.nome, imagem: t.imagem_url, count: 1 })) };
    if (table === 'geladeira_itens') data = products.map((p, i) => ({ id: `fridge-${i}`, receita_id: `recipe-${i}`, user_id: 'owner', unidade: p.unidade_compra, estoque_atual: p.estoque_atual, estoque_minimo: 1, receita: { id: `recipe-${i}`, nome: p.nome, numero_sequencial: i + 1, imagem_url: p.imagem_url, tipo_produto: types[i % 3], rendimento_valor: 1, rendimento_unidade: p.unidade_compra, ingredientes: [{ quantidade: 1, produto: { custo_unitario: p.custo_unitario } }] } }));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.goto('/e2e/fixtures/movement-design.html');
  const card = page.getByRole('button', { name: 'Movimentar Alemã', exact: true });
  await expect(card).toBeVisible();
  await expect(card.getByText('Categoria:')).toBeVisible();
  await expect(card.getByText('Custo / un')).toBeVisible();
  await expect(card.getByText('Em estoque')).toBeVisible();
  const checkOverflow = async () => expect(await page.locator('body').evaluate(e => e.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await checkOverflow();
  await page.screenshot({ path: testInfo.outputPath('movement-products.png'), fullPage: true });
  await page.getByRole('button', { name: 'Geladeira', exact: true }).click();
  await expect(card.getByText('Tipo:')).toBeVisible();
  await expect(page.getByRole('button', { name: /Fatia suprema/, exact: false }).first()).toBeVisible();
  await checkOverflow();
  await page.screenshot({ path: testInfo.outputPath('movement-fridge.png'), fullPage: true });
  await page.getByRole('button', { name: 'Gerenciar tipos', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toBeVisible();
  await dialog.getByRole('button', { name: 'Editar Fatia suprema' }).click();
  await expect(dialog.getByAltText('Foto do tipo')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('movement-types.png'), fullPage: true });
  await dialog.getByLabel('Foto do tipo de produto').setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
  await page.getByRole('button', { name: 'Confirmar Corte', exact: true }).click();
  expect(uploads).toBe(0);
  await dialog.getByRole('button', { name: 'Salvar tipo de produto' }).click();
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toHaveAttribute('src', /\/tipos-produto\/.+\.jpg$/);
  expect(uploads).toBe(1);
  await page.reload();
  await page.getByRole('button', { name: 'Gerenciar tipos', exact: true }).click();
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toHaveAttribute('src', /\/tipos-produto\/.+\.jpg$/);
  await dialog.getByRole('button', { name: 'Editar Fatia suprema' }).click();
  await dialog.getByRole('button', { name: 'Remover foto' }).click();
  await dialog.getByRole('button', { name: 'Salvar tipo de produto' }).click();
  await expect(dialog.getByAltText('Foto de Fatia suprema')).toHaveCount(0);
  expect(writes.at(-1)).toMatchObject({ nome: 'Fatia suprema', imagem_url: null });
  await page.reload();
  await page.getByRole('button', { name: 'Gerenciar tipos', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Fatia suprema' })).toBeVisible();
  await expect(page.getByAltText('Foto de Fatia suprema')).toHaveCount(0);
  await checkOverflow();
});
