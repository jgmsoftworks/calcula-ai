export const MOTIVOS_ENTRADA = [
  'Compra de fornecedor',
  'Devolução de cliente',
  'Ajuste de inventário (aumento)',
  'Transferência entre estabelecimentos',
  'Produção interna',
  'Doação recebida',
  'Outros',
] as const;

export const MOTIVOS_SAIDA = [
  'Venda',
  'Consumo interno',
  'Perda/Quebra',
  'Vencimento',
  'Devolução a fornecedor',
  'Ajuste de inventário (redução)',
  'Doação',
  'Transferência entre estabelecimentos',
  'Outros',
] as const;

export type MotivoEntrada = typeof MOTIVOS_ENTRADA[number];
export type MotivoSaida = typeof MOTIVOS_SAIDA[number];
export type Motivo = MotivoEntrada | MotivoSaida;
