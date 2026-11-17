import { test, expect } from '../playwright-fixture';

const photo = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="#e0f2fe"/><path d="M25 30h50v45H25z" fill="#008cf0"/><path d="M30 30q20-30 40 0" fill="none" stroke="#244bd6" stroke-width="8"/></svg>')}`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvJkAAAAASUVORK5CYII=', 'base64');
const owner = '00000000-0000-4000-8000-000000000001';

for (const tabela of ['marcas', 'categorias']) {
  test(`${tabela}: crop, save, reopen, remove and select photos without submitting the product`, async ({ page }, testInfo) => {
    const singular = tabela === 'marcas' ? 'marca' : 'categoria';
    let rows = [
      { id: 'a', nome: tabela === 'marcas' ? 'Aline Produção' : 'Embalagens', ativo: true, imagem_url: photo },
      { id: 'b', nome: tabela === 'marcas' ? 'Amélia Mix' : 'Decoração', ativo: true, imagem_url: null as string | null },
      { id: 'c', nome: tabela === 'marcas' ? 'Nestlé' : 'Bebidas', ativo: true, imagem_url: photo },
    ];
    const existingName = rows[0].nome;
    let failRead = false;
    let failSave = false;
    let uploads = 0;
    await page.route('**/storage/v1/object/**', async route => {
      if (route.request().method() === 'POST') {
        expect(route.request().url()).toContain(`/receitas-images/${owner}/${tabela}/`);
        uploads++;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'uploaded-photo' }) });
      } else await route.fulfill({ status: 200, contentType: 'image/png', body: png });
    });
    await page.route('**/rest/v1/**', async route => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (!url.pathname.endsWith(`/${tabela}`)) return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      if ((method === 'GET' && failRead) || (method !== 'GET' && failSave)) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic failure' }) });
      let result: unknown = rows;
      if (method === 'PATCH') {
        expect(url.searchParams.get('user_id')).toBe(`eq.${owner}`);
        const id = url.searchParams.get('id')!.replace('eq.', '');
        const input = route.request().postDataJSON();
        rows = rows.map(row => row.id === id ? { ...row, ...input } : row);
        result = rows.find(row => row.id === id);
      } else if (method === 'POST') {
        const input = route.request().postDataJSON();
        expect(input.user_id).toBe(owner);
        const row = { id: 'new', ativo: true, ...input };
        rows.push(row); result = row;
      } else expect(url.searchParams.get('user_id')).toBe(`eq.${owner}`);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(result) });
    });
    await page.goto(`/e2e/fixtures/catalog-photos.html?catalog=${tabela}`);
    await page.getByRole('button', { name: `Gerenciar ${tabela}` }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByAltText(`Foto de ${existingName}`)).toBeVisible();
    await dialog.getByLabel(`Buscar ${tabela}`).fill(tabela === 'marcas' ? 'amelia' : 'decoracao');
    await expect(dialog.getByRole('button', { name: `Editar ${rows[1].nome}` })).toBeVisible();
    await expect(dialog.getByRole('button', { name: `Editar ${existingName}` })).toHaveCount(0);
    await dialog.getByLabel(`Buscar ${tabela}`).clear();
    await dialog.getByRole('button', { name: `Editar ${existingName}` }).click();
    await page.screenshot({ path: testInfo.outputPath(`catalog-${tabela}.png`), fullPage: true, animations: 'disabled' });
    await dialog.getByLabel(`Foto da ${singular}`, { exact: true }).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Confirmar Corte', exact: true }).click();
    expect(uploads).toBe(0);
    await dialog.getByRole('button', { name: `Salvar ${singular}` }).click();
    await expect(dialog.getByAltText(`Foto de ${existingName}`)).toHaveAttribute('src', new RegExp(`/${tabela}/.+\\.jpg$`));
    expect(uploads).toBe(1);
    await expect(page.getByLabel('Produto salvo')).toHaveText('0');
    await page.reload();
    await page.getByRole('button', { name: `Gerenciar ${tabela}` }).click();
    await expect(dialog.getByAltText(`Foto de ${existingName}`)).toHaveAttribute('src', new RegExp(`/${tabela}/.+\\.jpg$`));
    await dialog.getByRole('button', { name: `Editar ${existingName}` }).click();
    await dialog.getByRole('button', { name: 'Remover foto' }).click();
    await dialog.getByRole('button', { name: `Salvar ${singular}` }).click();
    await expect(dialog.getByAltText(`Foto de ${existingName}`)).toHaveCount(0);
    expect(uploads).toBe(1);
    await dialog.getByRole('button', { name: `Criar nova ${singular}` }).click();
    await dialog.getByLabel(`Nome da ${singular}`).fill('Nova com foto');
    await dialog.getByLabel(`Foto da ${singular}`, { exact: true }).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png });
    await page.getByRole('button', { name: 'Confirmar Corte', exact: true }).click();
    failSave = true;
    await dialog.getByRole('button', { name: `Salvar ${singular}` }).click();
    await expect(page.getByText('Não foi possível salvar', { exact: true })).toBeVisible();
    await expect(dialog.getByLabel(`Nome da ${singular}`)).toHaveValue('Nova com foto');
    await expect(dialog.getByAltText(`Foto da ${singular}`, { exact: true })).toBeVisible();
    failSave = false;
    await dialog.getByRole('button', { name: `Salvar ${singular}` }).click();
    await expect(dialog.getByAltText('Foto de Nova com foto')).toBeVisible();
    // A fresh toast consumes Escape; close the dialog through its own control.
    await dialog.getByRole('button', { name: 'Fechar', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('combobox').click();
    const option = page.getByRole('option', { name: 'Nova com foto', exact: true });
    await expect(option.locator('img')).toHaveAttribute('src', new RegExp(`/${tabela}/.+\\.jpg$`));
    await option.click();
    await page.getByRole('combobox', { name: '1 selecionada(s)', exact: true }).click();
    await expect(page.getByRole('combobox')).toHaveText('1 selecionada(s)');
    await expect(page.getByLabel('Produto salvo')).toHaveText('0');
    await page.reload();
    failRead = true;
    await page.getByRole('button', { name: `Gerenciar ${tabela}` }).click();
    await expect(dialog.getByRole('alert')).toContainText(`Não foi possível carregar ${tabela}`);
    failRead = false;
    await dialog.getByRole('button', { name: 'Tentar novamente' }).click();
    await expect(dialog.getByAltText('Foto de Nova com foto')).toBeVisible();
    await expect(dialog.getByAltText(`Foto de ${existingName}`)).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}
