import { UNIDADES_LABELS, type UnidadeMedida } from './constants';

export function productUnit(value?: string | null) {
  const raw = value?.trim() || '';
  const key = raw.toLowerCase() === 'kg' ? 'k' : raw.toLowerCase();
  return {
    symbol: key === 'k' ? 'kg' : key,
    label: key === 'k' ? 'Quilo (kg)' : UNIDADES_LABELS[key as UnidadeMedida] || raw || 'Não informada',
  };
}

// Compact presentation for movement cards; does not alter the stored unit or quantities.
export function compactProductUnit(value?: string | null) {
  return productUnit(value?.trim().match(/\(([^)]+)\)$/)?.[1] || value).symbol || '—';
}
