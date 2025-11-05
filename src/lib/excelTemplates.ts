import * as XLSX from 'xlsx';

export function gerarModeloProdutos() {
  // Cabeçalhos
  const headers = [
    'nome',
    'codigo_interno',
    'codigos_barras',
    'marcas',
    'categorias',
    'unidade_compra',
    'unidade_uso',
    'fator_conversao',
    'custo_unitario',
    'estoque_atual',
    'estoque_minimo'
  ];

  // Exemplos
  const exemplos = [
    {
      nome: 'Farinha de Trigo 1kg',
      codigo_interno: '', // será gerado automaticamente
      codigos_barras: '7891234567890',
      marcas: 'Marca A',
      categorias: 'Farinhas,Ingredientes Secos',
      unidade_compra: 'UN',
      unidade_uso: 'G',
      fator_conversao: 1000,
      custo_unitario: 5.50,
      estoque_atual: 100,
      estoque_minimo: 20
    },
    {
      nome: 'Açúcar Cristal 5kg',
      codigo_interno: '',
      codigos_barras: '',
      marcas: 'Marca B,Marca C',
      categorias: 'Açúcares',
      unidade_compra: 'KG',
      unidade_uso: 'G',
      fator_conversao: 1000,
      custo_unitario: 12.00,
      estoque_atual: 50,
      estoque_minimo: 10
    },
    {
      nome: 'Leite Integral 1L',
      codigo_interno: '',
      codigos_barras: '7899999999999',
      marcas: 'Marca D',
      categorias: 'Laticínios,Bebidas',
      unidade_compra: 'L',
      unidade_uso: 'ML',
      fator_conversao: 1000,
      custo_unitario: 4.80,
      estoque_atual: 200,
      estoque_minimo: 50
    }
  ];

  // Criar planilha
  const ws = XLSX.utils.json_to_sheet(exemplos, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

  // Download
  XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
}
