import { UNIDADES_LABELS, type UnidadeMedida } from './constants';

export function productUnit(value?: string | null) {
  const raw = value?.trim() || '';
  const key = raw.toLowerCase() === 'kg' ? 'k' : raw.toLowerCase();
  return {
    symbol: key === 'k' ? 'kg' : key,
    label: key === 'k' ? 'Quilo (kg)' : UNIDADES_LABELS[key as UnidadeMedida] || raw || 'Não informada',
  };
}
