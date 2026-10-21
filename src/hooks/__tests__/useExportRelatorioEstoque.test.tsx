import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ excelLoaded: vi.fn(), pdfLoaded: vi.fn(), writeFile: vi.fn(), save: vi.fn(), toast: vi.fn(), docs: [] as any[] }));
vi.mock('sonner', () => ({ toast: { error: mocks.toast } }));
vi.mock('xlsx', async importOriginal => {
  mocks.excelLoaded();
  return { ...await importOriginal<typeof import('xlsx')>(), writeFile: mocks.writeFile };
});
vi.mock('jspdf', async importOriginal => {
  mocks.pdfLoaded();
  const actual = await importOriginal<typeof import('jspdf')>();
  return { ...actual, default: class extends actual.default {
    constructor(...args: ConstructorParameters<typeof actual.default>) {
      super(...args);
      mocks.docs.push(this);
      this.save = mocks.save;
    }
  } };
});
import { useExportRelatorioEstoque } from '../useExportRelatorioEstoque';

const args = [
  { titulo: 'Posição de Estoque', filtros: ['Apenas abaixo do mínimo'], geradoEm: '21/10/2026 12:00' },
  [{ key: 'nome', header: 'Produto' }, { key: 'valor', header: 'Valor', format: 'currency' as const }],
  [{ nome: 'Morango', valor: 30.25 }, { nome: 'Farinha', valor: 15.5 }],
  { Total: 45.75 },
] as const;
const exportArgs = (): Parameters<ReturnType<typeof useExportRelatorioEstoque>['exportarRelatorioExcel']> => [
  { ...args[0], filtros: [...args[0].filtros] }, [...args[1]], [...args[2]], args[3],
];
afterEach(() => { cleanup(); mocks.writeFile.mockClear(); mocks.save.mockClear(); mocks.toast.mockClear(); });

it('loads Excel only after a click, prevents duplicate exports and retains every row, filter and total', async () => {
  const { result } = renderHook(() => useExportRelatorioEstoque());
  expect(mocks.excelLoaded).not.toHaveBeenCalled();
  expect(mocks.pdfLoaded).not.toHaveBeenCalled();
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.exportarRelatorioExcel(...exportArgs());
    void result.current.exportarRelatorioExcel(...exportArgs());
  });
  expect(result.current.exportando).toBe('excel');
  await act(async () => { await pending; });
  expect(result.current.exportando).toBeNull();
  expect(mocks.writeFile).toHaveBeenCalledTimes(1);
  const XLSX = await import('xlsx');
  const workbook = mocks.writeFile.mock.calls[0][0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Relatório'], { header: 1 });
  expect(rows).toContainEqual(['Filtros: Apenas abaixo do mínimo']);
  expect(rows).toContainEqual(['Morango', 30.25]);
  expect(rows).toContainEqual(['Farinha', 15.5]);
  expect(rows).toContainEqual(['Total', 45.75]);
  expect(mocks.pdfLoaded).not.toHaveBeenCalled();
});

it('exports PDF using the same report data and totals', async () => {
  const { result } = renderHook(() => useExportRelatorioEstoque());
  await act(async () => { await result.current.exportarRelatorioPDF(...exportArgs()); });
  expect(mocks.save).toHaveBeenCalledTimes(1);
  expect(mocks.save.mock.calls[0][0]).toMatch(/\.pdf$/);
  const pdf = mocks.docs[0].output();
  expect(pdf).toContain('Morango');
  expect(pdf).toContain('Farinha');
  expect(pdf).toContain('30,25');
  expect(pdf).toContain('Total: 45.75');
  expect(result.current.exportando).toBeNull();
});

it('reports export failures, releases the busy state and allows another attempt', async () => {
  const { result } = renderHook(() => useExportRelatorioEstoque());
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.writeFile.mockImplementationOnce(() => { throw new Error('download failed'); });
  await act(async () => { await result.current.exportarRelatorioExcel(...exportArgs()); });
  expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('Tente novamente'));
  expect(result.current.exportando).toBeNull();
  await act(async () => { await result.current.exportarRelatorioExcel(...exportArgs()); });
  expect(mocks.writeFile).toHaveBeenCalledTimes(2);
  log.mockRestore();
});
