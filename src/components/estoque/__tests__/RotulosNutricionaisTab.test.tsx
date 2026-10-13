import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RotulosNutricionaisTab } from '../RotulosNutricionaisTab';
import { emptyNutritionLabel, type NutritionLabel } from '@/lib/nutritionLabel';
import { recognizeNutritionPhoto } from '@/lib/nutritionOcr';
vi.mock('@/lib/nutritionOcr', () => ({ recognizeNutritionPhoto: vi.fn() }));
vi.mock('@/lib/nutritionStorage', () => ({ nutritionPhotoUrl: vi.fn().mockResolvedValue('https://example.invalid/photo'), validateNutritionPhoto: vi.fn().mockReturnValue(null) }));
const goToBrands = vi.fn();
function Harness({ brands = ['Marca A', 'Marca B'], initial = [] }: { brands?: string[]; initial?: NutritionLabel[] }) {
  const [value, setValue] = useState(initial);
  const [photos, setPhotos] = useState<Record<string, File>>({});
  const [busy, setBusy] = useState(false);
  return <><RotulosNutricionaisTab value={value} onChange={setValue} marcas={brands} photos={photos}
    onPhotoChange={(id, file) => setPhotos(previous => ({ ...previous, [id]: file }))} busy={busy} onBusyChange={setBusy} onManageBrands={goToBrands} />
    <output data-testid="labels">{JSON.stringify(value)}</output><output data-testid="photos">{JSON.stringify(Object.keys(photos))}</output></>;
}
const labels = (): NutritionLabel[] => JSON.parse(screen.getByTestId('labels').textContent!);
beforeEach(() => { vi.clearAllMocks(); URL.createObjectURL = vi.fn().mockReturnValue('blob:photo'); URL.revokeObjectURL = vi.fn(); });
afterEach(cleanup);

describe('nutrition labels by brand', () => {
  it('asks which brand, keeps free-text values separate and navigates with arrows', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo nutricional' }));
    expect(screen.getByRole('region', { name: 'Escolher marca do rótulo' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Marca A' }));
    fireEvent.change(screen.getByLabelText('Nutriente 1'), { target: { value: 'Vitamina C' } });
    fireEvent.change(screen.getByLabelText('Quantidade de Vitamina C'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('Unidade de Vitamina C'), { target: { value: 'mg' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Marca B' }));
    expect(screen.getByRole('heading', { name: 'Marca B' })).toBeVisible();
    expect(screen.getByLabelText('Nutriente 1')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Nutriente 1'), { target: { value: 'Cálcio' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rótulo da marca anterior' }));
    expect(screen.getByRole('heading', { name: 'Marca A' })).toBeVisible();
    expect(screen.getByLabelText('Quantidade de Vitamina C')).toHaveValue('0');
    fireEvent.click(screen.getByRole('button', { name: 'Rótulo da próxima marca' }));
    expect(screen.getByLabelText('Nutriente 1')).toHaveValue('Cálcio');
    expect(labels()).toHaveLength(2);
  });

  it('opens the only brand directly and never duplicates its label', () => {
    render(<Harness brands={['Marca única']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo nutricional' }));
    expect(screen.queryByRole('region', { name: 'Escolher marca do rótulo' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo' }));
    expect(labels()).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Rótulo da próxima marca' })).toBeDisabled();
  });

  it('opens an existing brand without overwriting its values', () => {
    const label = { ...emptyNutritionLabel('Marca A'), nutrientes: [{ nutriente: 'Cálcio', quantidade: 30, unidade: 'mg' }] };
    render(<Harness initial={[label]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Marca A Já cadastrado' }));
    expect(labels()).toEqual([label]);
    expect(screen.getByLabelText('Quantidade de Cálcio')).toHaveValue('30');
  });

  it('keeps the imported photo and OCR result on the chosen brand only', async () => {
    vi.mocked(recognizeNutritionPhoto).mockResolvedValue({ ...emptyNutritionLabel(), quantidade_referencia: 100, nutrientes: [{ nutriente: 'Sódio', quantidade: 25, unidade: 'mg' }] });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Importar primeira foto do rótulo'), { target: { files: [new File(['photo'], 'label.png', { type: 'image/png' })] } });
    fireEvent.click(screen.getByRole('button', { name: 'Marca B' }));
    await waitFor(() => expect(screen.getByLabelText('Quantidade de Sódio')).toHaveValue('25'));
    expect(labels()[0].marca).toBe('Marca B');
    expect(JSON.parse(screen.getByTestId('photos').textContent!)).toEqual([labels()[0].id]);
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Marca A' }));
    expect(labels()[1].nutrientes[0].quantidade).toBeNull();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('directs products without a brand to stock fields', () => {
    render(<Harness brands={[]} />);
    expect(screen.getByRole('button', { name: 'Adicionar rótulo nutricional' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ir para Estoque & Custos' }));
    expect(goToBrands).toHaveBeenCalledOnce();
  });
});
