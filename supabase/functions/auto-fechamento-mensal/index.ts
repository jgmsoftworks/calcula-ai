import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Determinar competência: mês anterior
    const now = new Date()
    // Ajustar para Brasília (UTC-3)
    const brasiliaOffset = -3 * 60 * 60 * 1000
    const brasiliaTime = new Date(now.getTime() + brasiliaOffset)
    
    const year = brasiliaTime.getUTCFullYear()
    const month = brasiliaTime.getUTCMonth() // 0-indexed, já é o mês atual
    
    // Competência = mês anterior
    const prevYear = month === 0 ? year - 1 : year
    const prevMonth = month === 0 ? 12 : month
    const competencia = `${prevYear}-${String(prevMonth).padStart(2, '0')}`

    console.log(`Fechamento mensal automático - competência: ${competencia}`)

    // Buscar todos os user_ids distintos que têm produtos ativos
    const { data: users, error: usersError } = await supabase
      .from('produtos')
      .select('user_id')
      .eq('ativo', true)

    if (usersError) {
      throw new Error(`Erro ao buscar usuários: ${usersError.message}`)
    }

    // Extrair user_ids únicos
    const uniqueUserIds = [...new Set(users?.map(u => u.user_id) || [])]
    console.log(`Processando ${uniqueUserIds.length} usuários`)

    let processed = 0
    let errors = 0

    for (const userId of uniqueUserIds) {
      try {
        // Calcular valor do estoque: SUM(estoque_atual * custo_unitario)
        const { data: produtos, error: prodError } = await supabase
          .from('produtos')
          .select('estoque_atual, custo_unitario')
          .eq('user_id', userId)
          .eq('ativo', true)

        if (prodError) {
          console.error(`Erro ao buscar produtos do user ${userId}:`, prodError.message)
          errors++
          continue
        }

        const valorEstoque = (produtos || []).reduce((sum, p) => {
          return sum + ((p.estoque_atual || 0) * (p.custo_unitario || 0))
        }, 0)

        const qtdProdutos = (produtos || []).length

        // Upsert no fechamento mensal
        const { error: upsertError } = await supabase
          .from('estoque_fechamentos_mensais')
          .upsert(
            {
              user_id: userId,
              competencia,
              valor_estoque_fechamento: valorEstoque,
              qtd_produtos_ativos: qtdProdutos,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,competencia' }
          )

        if (upsertError) {
          console.error(`Erro ao gravar fechamento do user ${userId}:`, upsertError.message)
          errors++
          continue
        }

        processed++
      } catch (err) {
        console.error(`Erro inesperado para user ${userId}:`, err)
        errors++
      }
    }

    const result = {
      competencia,
      total_users: uniqueUserIds.length,
      processed,
      errors,
    }

    console.log('Resultado:', JSON.stringify(result))

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Erro geral no fechamento mensal:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
