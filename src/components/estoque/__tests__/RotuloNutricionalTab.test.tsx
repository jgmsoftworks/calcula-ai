import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RotuloNutricionalTab } from '../RotuloNutricionalTab';
import { emptyNutritionLabel, type NutritionLabel } from '@/lib/nutritionLabel';

vi.mock('@/lib/nutritionStorage', () => ({ nutritionPhotoUrl: vi.fn().mockResolvedValue('https://example.invalid/private-photo'), validateNutritionPhoto: vi.fn().mockReturnValue(null) }));
vi.mock('@/lib/nutritionOcr', () => ({ recognizeNutritionPhoto: vi.fn() }));
import { recognizeNutritionPhoto } from '@/lib/nutritionOcr';
const busy = vi.fn();

function Harness({ initial = null }: { initial?: NutritionLabel | null }) {
  const [value, setValue] = useState(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  return <><RotuloNutricionalTab value={value} onChange={setValue} photo={photo} onPhotoChange={setPhoto} onBusyChange={busy} /><output data-testid="saved-data">{JSON.stringify(value)}</output></>;
}
const state = () => JSON.parse(screen.getByTestId('saved-data').textContent!);
beforeEach(() => {
  vi.clearAllMocks();
  URL.createObjectURL = vi.fn().mockReturnValue('blob:photo');
  URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

describe('stock nutrition editor', () => {
  it('opens a single row editor, adds/removes lines and preserves zero vs missing', () => {
    render(<Harness />);
    expect(screen.queryByText('Preencher manualmente')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar rótulo nutricional' }));
    fireEvent.change(screen.getByLabelText('Nutriente 1'), { target: { value: 'Sódio' } });
    const quantity = screen.getByLabelText('Quantidade de Sódio');
    fireEvent.change(quantity, { target: { value: '0' } });
    expect(state().nutrientes[0].quantidade).toBe(0);
    expect(quantity).toHaveValue('0');
    fireEvent.change(quantity, { target: { value: '' } });
    expect(state().nutrientes[0].quantidade).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar linha' }));
    expect(screen.getByLabelText('Nutriente 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remover linha 2' }));
    expect(state().nutrientes).toHaveLength(1);
  });

  it('reopens saved values with the original reference unit and brand', () => {
    const label = { ...emptyNutritionLabel('Marca X'), quantidade_referencia: 0.1, unidade_referencia: 'kg' as const, nutrientes: [{ nutriente: 'Proteínas', unidade: 'g', quantidade: 3.5 }] };
    render(<Harness initial={label} />);
    expect(screen.getByLabelText('Quantidade de referência')).toHaveValue('0,1');
    expect(screen.getByLabelText('Unidade de referência')).toHaveValue('kg');
    expect(screen.getByLabelText('Quantidade de Proteínas')).toHaveValue('3,5');
    expect(state().marca).toBe('Marca X');
  });

  it('imports a photo into the same editable fields without submitting or requiring a mode switch', async () => {
    vi.mocked(recognizeNutritionPhoto).mockResolvedValue({ ...emptyNutritionLabel(), quantidade_referencia: 100, nutrientes: [{ nutriente: 'Sódio', unidade: 'mg', quantidade: 25 }], origem: 'foto' });
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Foto do rótulo nutricional'), { target: { files: [new File(['photo'], 'label.png', { type: 'image/png' })] } });
    await waitFor(() => expect(screen.getByLabelText('Quantidade de Sódio')).toHaveValue('25'));
    fireEvent.change(screen.getByLabelText('Quantidade de Sódio'), { target: { value: '30' } });
    expect(state().nutrientes[0].quantidade).toBe(30);
    expect(state().conferido).toBe(false);
    expect(busy).toHaveBeenLastCalledWith(false);
  });

  it('retains manual data when recognition fails', async () => {
    vi.mocked(recognizeNutritionPhoto).mockRejectedValue(new Error('offline'));
    render(<Harness initial={{ ...emptyNutritionLabel(), nutrientes: [{ nutriente: 'Proteínas', unidade: 'g', quantidade: 12 }] }} />);
    fireEvent.change(screen.getByLabelText('Foto do rótulo nutricional'), { target: { files: [new File(['photo'], 'label.png', { type: 'image/png' })] } });
    await screen.findByText(/Não foi possível ler a foto/);
    expect(screen.getByLabelText('Quantidade de Proteínas')).toHaveValue('12');
    expect(screen.getByRole('button', { name: 'Adicionar linha' })).toBeEnabled();
  });

  it('ignores a late recognition result after cancellation', async () => {
    let resolve: (value: NutritionLabel) => void;
    vi.mocked(recognizeNutritionPhoto).mockImplementation(() => new Promise(done => { resolve = done; }));
    render(<Harness initial={{ ...emptyNutritionLabel(), nutrientes: [{ nutriente: 'Proteínas', unidade: 'g', quantidade: 12 }] }} />);
    fireEvent.change(screen.getByLabelText('Foto do rótulo nutricional'), { target: { files: [new File(['photo'], 'label.png', { type: 'image/png' })] } });
    await waitFor(() => expect(recognizeNutritionPhoto).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar leitura' }));
    resolve!({ ...emptyNutritionLabel(), nutrientes: [{ nutriente: 'Sódio', unidade: 'mg', quantidade: 500 }] });
    await waitFor(() => expect(busy).toHaveBeenLastCalledWith(false));
    expect(state().nutrientes).toEqual([{ nutriente: 'Proteínas', unidade: 'g', quantidade: 12 }]);
  });
});
