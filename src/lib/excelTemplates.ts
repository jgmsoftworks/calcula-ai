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
  
  // Adicionar validações de dados
  if (!ws['!dataValidation']) {
    ws['!dataValidation'] = [];
  }

  // Validação 1: Dropdown para unidade_compra* (coluna F, linhas 2-1000)
  ws['!dataValidation'].push({
    sqref: 'F2:F1000',
    type: 'list',
    formula1: '"cm,cx,fd,g,k,l,m,ml,pct,un"',
    allowBlank: false,
    showDropDown: true,
    error: 'Selecione uma unidade válida da lista',
    errorTitle: 'Unidade inválida'
  });

  // Validação 2: Dropdown para unidade_uso (coluna J, linhas 2-1000)
  ws['!dataValidation'].push({
    sqref: 'J2:J1000',
    type: 'list',
    formula1: '"cm,cx,fd,g,k,l,m,ml,pct,un"',
    allowBlank: true,
    showDropDown: true,
    error: 'Selecione uma unidade válida da lista',
    errorTitle: 'Unidade inválida'
  });

  // Validação 3: codigo_interno* deve ser número inteiro positivo (coluna A)
  ws['!dataValidation'].push({
    sqref: 'A2:A1000',
    type: 'whole',
    operator: 'greaterThan',
    formula1: '0',
    allowBlank: false,
    error: 'Código interno deve ser um número inteiro positivo',
    errorTitle: 'Valor inválido'
  });

  // Validação 4: custo_unitario* deve ser número decimal positivo (coluna G)
  ws['!dataValidation'].push({
    sqref: 'G2:G1000',
    type: 'decimal',
    operator: 'greaterThanOrEqual',
    formula1: '0',
    allowBlank: false,
    error: 'Custo unitário deve ser um valor numérico positivo',
    errorTitle: 'Valor inválido'
  });

  // Validação 5: estoque_atual* deve ser número inteiro positivo ou zero (coluna H)
  ws['!dataValidation'].push({
    sqref: 'H2:H1000',
    type: 'whole',
    operator: 'greaterThanOrEqual',
    formula1: '0',
    allowBlank: false,
    error: 'Estoque atual deve ser um número inteiro positivo ou zero',
    errorTitle: 'Valor inválido'
  });

  // Validação 6: estoque_minimo deve ser número inteiro positivo ou zero (coluna I)
  ws['!dataValidation'].push({
    sqref: 'I2:I1000',
    type: 'whole',
    operator: 'greaterThanOrEqual',
    formula1: '0',
    allowBlank: true,
    error: 'Estoque mínimo deve ser um número inteiro positivo ou zero',
    errorTitle: 'Valor inválido'
  });

  // Validação 7: fator_conversao deve ser número decimal positivo (coluna K)
  ws['!dataValidation'].push({
    sqref: 'K2:K1000',
    type: 'decimal',
    operator: 'greaterThan',
    formula1: '0',
    allowBlank: true,
    error: 'Fator de conversão deve ser um número positivo',
    errorTitle: 'Valor inválido'
  });
  
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
