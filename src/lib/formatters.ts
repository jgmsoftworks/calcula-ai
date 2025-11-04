// Formatadores pt-BR para valores numéricos

// Formatadores por tipo
export const formatters = {
  valor: (num: number): string => 
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(num),
  
  percentual: (num: number): string => 
    `${new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)}%`,
  
  quantidadeUn: (num: number): string => 
    new Intl.NumberFormat('pt-BR', {
      maximumFractionDigits: 0
    }).format(num),
  
  quantidadeContinua: (num: number, maxDecimais: number = 3): string => 
    new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimais
    }).format(num)
};

// Parser universal pt-BR → número
export const parsePtBrNumber = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (!value || value === '') return 0;
  
  // Remove tudo exceto dígitos, vírgula e ponto
  const cleaned = String(value)
    .replace(/[^\d,.-]/g, '') // Remove tudo exceto dígitos, vírgula, ponto e sinal negativo
    .replace(/\./g, '') // Remove pontos de milhar
    .replace(',', '.'); // Vírgula vira ponto decimal
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Converte qualquer valor para número válido para o banco
 * Garante que nunca retorna NaN, null ou undefined
 */
export const toSafeNumber = (value: any, defaultValue: number = 0): number => {
  // Se já é número válido, retorna
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  
  // Se é string, tenta converter
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return !isNaN(parsed) && isFinite(parsed) ? parsed : defaultValue;
  }
  
  // Para qualquer outro caso (null, undefined, etc)
  return defaultValue;
};

// Validador por tipo
export const validateNumericInput = (
  value: number,
  tipo: 'valor' | 'percentual' | 'quantidade_un' | 'quantidade_continua',
  options?: { min?: number; max?: number }
): { valid: boolean; message?: string } => {
  
  // Quantidade discreta não pode ter decimais
  if (tipo === 'quantidade_un' && !Number.isInteger(value)) {
    return { valid: false, message: 'Apenas números inteiros são permitidos' };
  }
  
  // Percentual normalmente entre 0-100 (salvo exceções)
  if (tipo === 'percentual' && options?.max === undefined) {
    if (value < 0 || value > 100) {
      return { valid: false, message: 'Percentual deve estar entre 0% e 100%' };
    }
  }
  
  // Validações de min/max
  if (options?.min !== undefined && value < options.min) {
    return { 
      valid: false, 
      message: `Valor mínimo: ${tipo === 'valor' ? formatters.valor(options.min) : options.min}` 
    };
  }
  
  if (options?.max !== undefined && value > options.max) {
    return { 
      valid: false, 
      message: `Valor máximo: ${tipo === 'valor' ? formatters.valor(options.max) : options.max}` 
    };
  }
  
  return { valid: true };
};
