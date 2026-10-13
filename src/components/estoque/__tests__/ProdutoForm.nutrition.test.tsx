import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProdutoForm } from '../ProdutoForm';
import { emptyNutritionLabel } from '@/lib/nutritionLabel';
import type { Produto } from '@/hooks/useEstoque';

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), upload: vi.fn(), photoUpload: vi.fn(), photoRemove: vi.fn(), code: vi.fn().mockResolvedValue(1) }));
vi.mock('@/hooks/useEstoque', () => ({ useEstoque: () => ({ createProduto: mocks.create, updateProduto: mocks.update, uploadImagemProduto: mocks.upload, gerarCodigoInterno: mocks.code }) }));
vi.mock('@/lib/nutritionStorage', () => ({ uploadNutritionPhoto: mocks.photoUpload, removeNutritionPhoto: mocks.photoRemove, nutritionPhotoUrl: vi.fn(), validateNutritionPhoto: vi.fn() }));
vi.mock('../CodigosBarrasInput', () => ({ CodigosBarrasInput: () => null }));
vi.mock('../MarcasSelector', () => ({ MarcasSelector: () => null }));
vi.mock('../CategoriasSelector', () => ({ CategoriasSelector: () => null }));
vi.mock('../HistoricoProduto', () => ({ HistoricoProduto: () => null }));
vi.mock('../SugestaoFotosModal', () => ({ SugestaoFotosModal: () => null }));
vi.mock('../ConsumoMedioCard', () => ({ ConsumoMedioCard: () => null }));
vi.mock('@/lib/nutritionOcr', () => ({ recognizeNutritionPhoto: vi.fn().mockRejectedValue(new Error('offline')) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const product: Produto = { id: 'product-1', user_id: 'owner-1', nome: 'Farinha', codigo_interno: 1, codigos_barras: [], marcas: ['Marca X'], categorias: [], unidade_compra: 'kg', custo_unitario: 8, estoque_atual: 20, estoque_minimo: 2, unidade_uso: 'g', fator_conversao: 1000, imagem_url: null, ativo: true, created_at: '', updated_at: '' };
function openNutrition() { fireEvent.mouseDown(screen.getByRole('tab', { name: 'Rótulo nutricional' }), { button: 0, ctrlKey: false }); }
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  mocks.update.mockResolvedValue(product);
  URL.createObjectURL = vi.fn().mockReturnValue('blob:photo');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('product form nutrition persistence', () => {
  it('saves a partial label in the same product update without changing costs or stock', async () => {
    render(<ProdutoForm produto={product} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    openNutrition();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo nutricional' }));
    fireEvent.change(screen.getByLabelText('Quantidade de referência'), { target: { value: '100' } });
    fireEvent.change(screen.getByLabelText('Nutriente 1'), { target: { value: 'Sódio' } });
    fireEvent.change(screen.getByLabelText('Quantidade de Sódio'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update).toHaveBeenCalledWith('product-1', expect.objectContaining({ custo_unitario: 8, estoque_atual: 20, rotulos_nutricionais: [expect.objectContaining({ quantidade_referencia: 100, marca: 'Marca X', nutrientes: [{ nutriente: 'Sódio', quantidade: 0, unidade: 'mg' }], conferido: false })] }));
  });

  it('preserves saved nutrition when editing another tab without opening nutrition', async () => {
    const rotulo = { versao: 1, quantidade_referencia: 20, unidade_referencia: 'g', marca: 'Marca X', nutrientes: [{ nutriente: 'proteinas', quantidade: 2 }], foto_path: null, origem: 'manual', conferido: false };
    render(<ProdutoForm produto={{ ...product, rotulo_nutricional: rotulo }} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][1].rotulos_nutricionais[0]).toMatchObject({ marca: 'Marca X', quantidade_referencia: 20, nutrientes: [{ nutriente: 'Proteínas', quantidade: 2, unidade: 'g' }] });
    expect(mocks.update.mock.calls[0][1]).not.toHaveProperty('rotulo_nutricional');
  });
  it('saves every brand together and preserves values even without opening the nutrition tab', async () => {
    const labels = [
      { ...emptyNutritionLabel('Marca A'), nutrientes: [{ nutriente: 'Vitamina C', quantidade: 0, unidade: 'mg' }] },
      { ...emptyNutritionLabel('Marca B'), nutrientes: [{ nutriente: 'Vitamina C', quantidade: 12, unidade: 'mg' }] },
    ];
    render(<ProdutoForm produto={{ ...product, rotulos_nutricionais: labels }} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledOnce());
    expect(mocks.update.mock.calls[0][1].rotulos_nutricionais).toEqual(labels);
  });

  it('cleans up the first new photo if uploading the second brand photo fails', async () => {
    const labels = [emptyNutritionLabel('Marca A'), emptyNutritionLabel('Marca B')];
    mocks.photoUpload.mockResolvedValueOnce('owner-1/new-a.png').mockRejectedValueOnce(new Error('Falha na segunda foto'));
    render(<ProdutoForm produto={{ ...product, marcas: ['Marca A', 'Marca B'], rotulos_nutricionais: labels }} onCancel={vi.fn()} onSuccess={vi.fn()} />);
    openNutrition();
    for (const brand of ['a', 'b']) {
      fireEvent.change(screen.getByLabelText('Foto do rótulo nutricional'), { target: { files: [new File(['photo'], `${brand}.png`, { type: 'image/png' })] } });
      await screen.findByText(/Não foi possível ler a foto/);
      if (brand === 'a') fireEvent.click(screen.getByRole('button', { name: 'Rótulo da próxima marca' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Salvar Produto' }));
    await waitFor(() => expect(mocks.photoUpload).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.photoRemove).toHaveBeenCalledWith('owner-1/new-a.png'));
    expect(mocks.update).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Marca B' })).toBeVisible();
  });

});
