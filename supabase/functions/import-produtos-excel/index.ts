import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProdutoRow {
  nome: string;
  codigo_interno?: string;
  codigos_barras?: string;
  marcas?: string;
  categorias?: string;
  unidade_compra: string;
  unidade_uso?: string;
  fator_conversao?: number;
  custo_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
}

const UNIDADES_VALIDAS = ['UN', 'KG', 'G', 'L', 'ML', 'CX', 'PC', 'FD'];

function validarLinha(row: any, lineNumber: number): string[] {
  const erros: string[] = [];

  if (!row.nome || String(row.nome).trim() === '') {
    erros.push(`Linha ${lineNumber}: Nome é obrigatório`);
  }

  if (!row.unidade_compra || !UNIDADES_VALIDAS.includes(String(row.unidade_compra).toUpperCase())) {
    erros.push(`Linha ${lineNumber}: Unidade de compra inválida (use: ${UNIDADES_VALIDAS.join(', ')})`);
  }

  if (isNaN(Number(row.custo_unitario)) || Number(row.custo_unitario) < 0) {
    erros.push(`Linha ${lineNumber}: Custo unitário inválido`);
  }

  if (isNaN(Number(row.estoque_atual)) || Number(row.estoque_atual) < 0) {
    erros.push(`Linha ${lineNumber}: Estoque atual inválido`);
  }

  if (isNaN(Number(row.estoque_minimo)) || Number(row.estoque_minimo) < 0) {
    erros.push(`Linha ${lineNumber}: Estoque mínimo inválido`);
  }

  if (row.fator_conversao && !row.unidade_uso) {
    erros.push(`Linha ${lineNumber}: Se informar fator de conversão, unidade de uso é obrigatória`);
  }

  return erros;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const { fileBase64 } = await req.json();

    // Decodificar base64
    const binaryString = atob(fileBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Ler Excel
    const workbook = XLSX.read(bytes, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: ProdutoRow[] = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Processando ${data.length} linhas do Excel`);

    const erros: string[] = [];
    const produtosCriados: any[] = [];
    const marcasSet = new Set<string>();
    const categoriasSet = new Set<string>();

    // Obter próximo código interno
    const { data: ultimoProduto } = await supabaseClient
      .from('produtos')
      .select('codigo_interno')
      .eq('user_id', user.id)
      .order('codigo_interno', { ascending: false })
      .limit(1)
      .single();

    let proximoCodigo = ultimoProduto ? ultimoProduto.codigo_interno + 1 : 1;

    // Processar cada linha
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const lineNumber = i + 2; // +2 porque linha 1 é cabeçalho

      // Validar linha
      const errosLinha = validarLinha(row, lineNumber);
      if (errosLinha.length > 0) {
        erros.push(...errosLinha);
        continue;
      }

      // Processar arrays
      const codigosBarras = row.codigos_barras
        ? String(row.codigos_barras).split(',').map(c => c.trim()).filter(c => c)
        : [];

      const marcas = row.marcas
        ? String(row.marcas).split(',').map(m => m.trim()).filter(m => m)
        : [];

      const categorias = row.categorias
        ? String(row.categorias).split(',').map(c => c.trim()).filter(c => c)
        : [];

      // Adicionar marcas e categorias aos sets
      marcas.forEach(m => marcasSet.add(m));
      categorias.forEach(c => categoriasSet.add(c));

      // Criar produto
      const codigoInterno = row.codigo_interno ? Number(row.codigo_interno) : proximoCodigo++;

      const produto = {
        user_id: user.id,
        nome: String(row.nome).trim(),
        codigo_interno: codigoInterno,
        codigos_barras: codigosBarras,
        marcas: marcas,
        categorias: categorias,
        unidade_compra: String(row.unidade_compra).toUpperCase(),
        unidade_uso: row.unidade_uso ? String(row.unidade_uso).toUpperCase() : null,
        fator_conversao: row.fator_conversao ? Number(row.fator_conversao) : null,
        custo_unitario: Number(row.custo_unitario),
        estoque_atual: Number(row.estoque_atual),
        estoque_minimo: Number(row.estoque_minimo),
        ativo: true
      };

      const { data: novoProduto, error: produtoError } = await supabaseClient
        .from('produtos')
        .insert(produto)
        .select()
        .single();

      if (produtoError) {
        console.error('Erro ao criar produto:', produtoError);
        erros.push(`Linha ${lineNumber}: Erro ao criar produto - ${produtoError.message}`);
      } else {
        produtosCriados.push(novoProduto);
      }
    }

    // Criar marcas que não existem
    let marcasCriadas = 0;
    for (const marcaNome of marcasSet) {
      const { data: marcaExistente } = await supabaseClient
        .from('marcas')
        .select('id')
        .eq('user_id', user.id)
        .eq('nome', marcaNome)
        .single();

      if (!marcaExistente) {
        const { error: marcaError } = await supabaseClient
          .from('marcas')
          .insert({ user_id: user.id, nome: marcaNome });

        if (!marcaError) {
          marcasCriadas++;
        }
      }
    }

    // Criar categorias que não existem
    let categoriasCriadas = 0;
    for (const categoriaNome of categoriasSet) {
      const { data: categoriaExistente } = await supabaseClient
        .from('categorias')
        .select('id')
        .eq('user_id', user.id)
        .eq('nome', categoriaNome)
        .single();

      if (!categoriaExistente) {
        const { error: categoriaError } = await supabaseClient
          .from('categorias')
          .insert({ user_id: user.id, nome: categoriaNome });

        if (!categoriaError) {
          categoriasCriadas++;
        }
      }
    }

    console.log(`Importação concluída: ${produtosCriados.length} produtos, ${marcasCriadas} marcas, ${categoriasCriadas} categorias`);

    return new Response(
      JSON.stringify({
        produtos_criados: produtosCriados.length,
        marcas_criadas: marcasCriadas,
        categorias_criadas: categoriasCriadas,
        erros: erros
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro na importação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
