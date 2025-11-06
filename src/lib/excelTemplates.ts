import * as XLSX from 'xlsx';

export function gerarModeloProdutos() {
  // Cabeçalhos com asterisco nos obrigatórios
  const headers = [
    'codigo_interno*',
    'nome*',
    'codigos_barras',
    'marcas',
    'categorias',
    'unidade_compra*',
    'custo_unitario*',
    'estoque_atual*',
    'estoque_minimo',
    'unidade_uso',
    'fator_conversao'
  ];

  // Exemplos
  const exemplos = [
    {
      'codigo_interno*': 1001,
      'nome*': 'Farinha de Trigo 1kg',
      codigos_barras: '7891234567890',
      marcas: 'Marca A',
      categorias: 'Farinhas,Ingredientes Secos',
      'unidade_compra*': 'un',
      'custo_unitario*': 5.50,
      'estoque_atual*': 100,
      estoque_minimo: 20,
      unidade_uso: 'g',
      fator_conversao: 1000
    },
    {
      'codigo_interno*': 1002,
      'nome*': 'Açúcar Cristal 5kg',
      codigos_barras: '',
      marcas: 'Marca B,Marca C',
      categorias: 'Açúcares',
      'unidade_compra*': 'k',
      'custo_unitario*': 12.00,
      'estoque_atual*': 50,
      estoque_minimo: 10,
      unidade_uso: 'g',
      fator_conversao: 1000
    },
    {
      'codigo_interno*': 1003,
      'nome*': 'Leite Integral 1L',
      codigos_barras: '7899999999999',
      marcas: 'Marca D',
      categorias: 'Laticínios,Bebidas',
      'unidade_compra*': 'l',
      'custo_unitario*': 4.80,
      'estoque_atual*': 200,
      estoque_minimo: 50,
      unidade_uso: 'ml',
      fator_conversao: 1000
    }
  ];

  // Criar primeira aba com produtos
  const ws = XLSX.utils.json_to_sheet(exemplos, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

  // Criar segunda aba com unidades válidas
  const unidadesValidas = [
    { unidade: 'Centímetro (cm)' },
    { unidade: 'Caixa (cx)' },
    { unidade: 'Fardo (fd)' },
    { unidade: 'Grama (g)' },
    { unidade: 'Quilo (k)' },
    { unidade: 'Litro (l)' },
    { unidade: 'Metro (m)' },
    { unidade: 'Mililitro (ml)' },
    { unidade: 'Pacote (pct)' },
    { unidade: 'Unidade (un)' }
  ];

  const wsUnidades = XLSX.utils.json_to_sheet(unidadesValidas);
  XLSX.utils.book_append_sheet(wb, wsUnidades, 'Unidades Válidas');

  // Download
  XLSX.writeFile(wb, 'modelo_importacao_produtos.xlsx');
}
