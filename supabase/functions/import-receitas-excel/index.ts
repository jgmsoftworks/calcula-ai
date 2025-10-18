import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[IMPORT-RECEITAS] Iniciando importação de receitas');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Não autenticado');
    }

    // Verificar se é admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      throw new Error('Acesso negado. Apenas administradores podem importar receitas.');
    }

    const { clientUserId, fileBase64 } = await req.json();
    console.log(`[IMPORT-RECEITAS] Cliente: ${clientUserId}`);

    // Validar cliente existe
    const { data: clientProfile, error: clientError } = await supabaseClient
      .from('profiles')
      .select('user_id, plan, full_name')
      .eq('user_id', clientUserId)
      .single();

    if (clientError || !clientProfile) {
      throw new Error('Cliente não encontrado');
    }

    // Decodificar base64 e parsear Excel
    const binaryString = atob(fileBase64.split(',')[1]);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const workbook = XLSX.read(bytes, { type: 'array' });
    
    console.log(`[IMPORT-RECEITAS] Excel parseado: ${workbook.SheetNames.length} páginas`);

    const unidadesMap: Record<string, string> = {
      'Grama (g)': 'g',
      'Quilograma (kg)': 'kg',
      'Mililitro (ml)': 'ml',
      'Litro (l)': 'l',
      'Unidade': 'un',
      'Centímetro': 'cm',
    };

    let receitasCriadas = 0;
    let produtosCriados = 0;
    let produtosExistentes = 0;
    const detalhes: any[] = [];
    const erros: any[] = [];

    // Processar cada página (receita)
    for (const sheetName of workbook.SheetNames) {
      try {
        console.log(`[IMPORT-RECEITAS] Processando: ${sheetName}`);
        
        const sheet = workbook.Sheets[sheetName];
        const data: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Extrair dados da receita
        const nomeReceita = data[0]?.[0] || sheetName;
        
        // Buscar tipo e rendimento
        let tipoProduto = 'MASSA';
        let rendimentoValor = 0;
        let rendimentoUnidade = 'g';
        let conservacao: any = {};

        for (let i = 0; i < data.length; i++) {
          const row = data[i];
          if (row[1] === 'Tipo do Produto' && row[2]) {
            tipoProduto = row[2];
          }
          if (row[1] === 'Rendimento' && row[2]) {
            rendimentoValor = parseFloat(row[2]) || 0;
            rendimentoUnidade = unidadesMap[row[3]] || row[3] || 'g';
          }
          if (row[1] === 'Congelado' && row[2] && row[3]) {
            conservacao.congelado = { temperatura: row[2], tempo: row[3] };
          }
          if (row[1] === 'Refrigerado' && row[2] && row[3]) {
            conservacao.refrigerado = { temperatura: row[2], tempo: row[3] };
          }
          if (row[1] === 'Ambiente' && row[2] && row[3]) {
            conservacao.ambiente = { temperatura: row[2], tempo: row[3] };
          }
        }

        // Inserir receita
        const { data: receita, error: receitaError } = await supabaseClient
          .from('receitas')
          .insert({
            user_id: clientUserId,
            nome: nomeReceita,
            tipo_produto: tipoProduto,
            rendimento_valor: rendimentoValor,
            rendimento_unidade: rendimentoUnidade,
            conservacao: conservacao,
            status: 'publicado',
          })
          .select()
          .single();

        if (receitaError) {
          console.error(`[IMPORT-RECEITAS] Erro ao criar receita ${nomeReceita}:`, receitaError);
          erros.push({ receita: nomeReceita, erro: receitaError.message });
          continue;
        }

        console.log(`[IMPORT-RECEITAS] Receita criada: ${receita.id}`);

        // Extrair ingredientes
        let ingredientesInicio = -1;
        let embalagemInicio = -1;
        let modoPreparoInicio = -1;

        for (let i = 0; i < data.length; i++) {
          if (data[i][0] === 'INGREDIENTES') ingredientesInicio = i + 2;
          if (data[i][0] === 'EMBALAGEM') embalagemInicio = i + 2;
          if (data[i][0] === 'MODO DE PREPARO') modoPreparoInicio = i + 1;
        }

        // Processar ingredientes
        if (ingredientesInicio > 0) {
          for (let i = ingredientesInicio; i < data.length; i++) {
            const row = data[i];
            if (!row[0] || row[0] === 'EMBALAGEM' || row[0] === 'MODO DE PREPARO') break;

            const nomeIngrediente = row[0];
            const quantidade = parseFloat(row[1]) || 0;
            const unidade = unidadesMap[row[2]] || row[2] || 'g';

            if (!nomeIngrediente || quantidade === 0) continue;

            // Buscar ou criar produto
            const { data: produtoExistente } = await supabaseClient
              .from('produtos')
              .select('id')
              .eq('user_id', clientUserId)
              .eq('nome', nomeIngrediente)
              .maybeSingle();

            let produtoId = produtoExistente?.id;

            if (!produtoId) {
              const { data: novoProduto, error: produtoError } = await supabaseClient
                .from('produtos')
                .insert({
                  user_id: clientUserId,
                  nome: nomeIngrediente,
                  unidade: unidade,
                  categoria: 'INGREDIENTES',
                  estoque_atual: 0,
                  custo_medio: 0,
                  ativo: true,
                })
                .select()
                .single();

              if (produtoError) {
                console.error(`[IMPORT-RECEITAS] Erro ao criar produto ${nomeIngrediente}:`, produtoError);
                continue;
              }

              produtoId = novoProduto.id;
              produtosCriados++;
              console.log(`[IMPORT-RECEITAS] Produto criado: ${nomeIngrediente}`);
            } else {
              produtosExistentes++;
            }

            // Inserir ingrediente na receita
            await supabaseClient
              .from('receita_ingredientes')
              .insert({
                receita_id: receita.id,
                produto_id: produtoId,
                nome: nomeIngrediente,
                quantidade: quantidade,
                unidade: unidade,
                custo_unitario: 0,
                custo_total: 0,
              });
          }
        }

        // Processar embalagem
        if (embalagemInicio > 0) {
          for (let i = embalagemInicio; i < data.length; i++) {
            const row = data[i];
            if (!row[0] || row[0] === 'MODO DE PREPARO') break;

            const nomeEmbalagem = row[0];
            const quantidade = parseFloat(row[1]) || 0;
            const unidade = unidadesMap[row[2]] || row[2] || 'un';

            if (!nomeEmbalagem || quantidade === 0) continue;

            // Buscar ou criar produto de embalagem
            const { data: produtoExistente } = await supabaseClient
              .from('produtos')
              .select('id')
              .eq('user_id', clientUserId)
              .eq('nome', nomeEmbalagem)
              .maybeSingle();

            let produtoId = produtoExistente?.id;

            if (!produtoId) {
              const { data: novoProduto } = await supabaseClient
                .from('produtos')
                .insert({
                  user_id: clientUserId,
                  nome: nomeEmbalagem,
                  unidade: unidade,
                  categoria: 'EMBALAGENS',
                  estoque_atual: 0,
                  custo_medio: 0,
                  ativo: true,
                })
                .select()
                .single();

              produtoId = novoProduto?.id;
              if (produtoId) produtosCriados++;
            } else {
              produtosExistentes++;
            }

            if (produtoId) {
              await supabaseClient
                .from('receita_embalagens')
                .insert({
                  receita_id: receita.id,
                  produto_id: produtoId,
                  nome: nomeEmbalagem,
                  quantidade: quantidade,
                  unidade: unidade,
                  custo_unitario: 0,
                  custo_total: 0,
                });
            }
          }
        }

        // Processar modo de preparo
        if (modoPreparoInicio > 0) {
          let ordem = 1;
          for (let i = modoPreparoInicio; i < data.length; i++) {
            const row = data[i];
            const descricao = row[0];

            if (!descricao || descricao.length < 5) continue;

            await supabaseClient
              .from('receita_passos_preparo')
              .insert({
                receita_id: receita.id,
                ordem: ordem++,
                descricao: descricao,
              });
          }
        }

        receitasCriadas++;
        detalhes.push({
          receita: nomeReceita,
          status: 'criada',
          id: receita.id,
        });

      } catch (error) {
        console.error(`[IMPORT-RECEITAS] Erro ao processar ${sheetName}:`, error);
        erros.push({ receita: sheetName, erro: error.message });
      }
    }

    const resultado = {
      success: true,
      receitas_criadas: receitasCriadas,
      produtos_criados: produtosCriados,
      produtos_existentes: produtosExistentes,
      cliente: clientProfile.full_name || clientProfile.user_id,
      detalhes,
      erros,
    };

    console.log('[IMPORT-RECEITAS] Importação concluída:', resultado);

    return new Response(JSON.stringify(resultado), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[IMPORT-RECEITAS] Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
