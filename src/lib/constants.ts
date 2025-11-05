// ✅ Valores do enum unidade_medida no banco (SEMPRE MINÚSCULAS)
// Sincronizado com: SELECT enumlabel FROM pg_enum WHERE enumtypid = 'unidade_medida'::regtype
export const UNIDADES_VALIDAS = ['cm', 'cx', 'fd', 'g', 'k', 'l', 'm', 'ml', 'pct', 'un'] as const;

export type UnidadeMedida = typeof UNIDADES_VALIDAS[number];

// Labels formatados para exibição nos selects
export const UNIDADES_LABELS: Record<UnidadeMedida, string> = {
  cm: 'Centímetro (cm)',
  cx: 'Caixa (cx)',
  fd: 'Fardo (fd)',
  g: 'Grama (g)',
  k: 'Quilo (k)',
  l: 'Litro (l)',
  m: 'Metro (m)',
  ml: 'Mililitro (ml)',
  pct: 'Pacote (pct)',
  un: 'Unidade (un)'
};

// Validação de unidade
export const isUnidadeValida = (unidade: string): unidade is UnidadeMedida => {
  return UNIDADES_VALIDAS.includes(unidade.toLowerCase() as UnidadeMedida);
};

// Normalizar unidade para minúscula
export const normalizarUnidade = (unidade: string): string => {
  return unidade.toLowerCase();
};
