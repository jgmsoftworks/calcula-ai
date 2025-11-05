/**
 * ✅ IMPORTANTE: Estes valores são sincronizados com o enum unidade_medida do banco.
 * 
 * Para verificar os valores no banco:
 * SELECT enumlabel FROM pg_enum WHERE enumtypid = 'unidade_medida'::regtype ORDER BY enumlabel;
 * 
 * Últimas verificações:
 * - 05/11/2025: Confirmado que todos os valores são minúsculos
 * - Arquivos que usam estas constantes:
 *   • ProductModalV2.tsx
 *   • CadastroProdutoForm.tsx
 *   • ImportacaoProdutos.tsx
 *   • ModoUsoTab.tsx
 *   • EntradasForm.tsx
 */
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
