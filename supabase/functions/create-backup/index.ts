import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const logError = (error: unknown, context: string, details?: any) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[CREATE-BACKUP ERROR] ${context}`, {
    message: errorMessage,
    stack,
    details,
    timestamp: new Date().toISOString()
  });
  return errorMessage;
};

const logStep = (step: string, details?: any) => {
  console.log(`[CREATE-BACKUP] ${step}`, details ? { details, timestamp: new Date().toISOString() } : { timestamp: new Date().toISOString() });
};

interface BackupRequest {
  backup_type?: 'full' | 'incremental';
  tables?: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    logStep('Starting backup process');

    // Parse request body
    let requestData: BackupRequest = { backup_type: 'full' };
    try {
      requestData = await req.json();
    } catch (error) {
      logStep('No request body provided, using defaults');
    }

    // Get the requesting user
    const authHeader = req.headers.get('authorization');
    let user = null;
    if (authHeader) {
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      if (!authError) {
        user = authUser;
      }
    }

    // Check if user is admin using secure RPC function
    if (user) {
      const { data: isAdmin, error: roleError } = await supabaseClient.rpc('has_role_or_higher', {
        required_role: 'admin',
        check_user_id: user.id
      });

      if (roleError || !isAdmin) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized. Admin access required.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create backup record
    const { data: backup, error: backupError } = await supabaseClient
      .from('backup_history')
      .insert({
        backup_type: requestData.backup_type || 'full',
        status: 'in_progress',
        tables_included: requestData.tables || [
          'profiles', 'produtos', 'receitas', 'receita_ingredientes',
          'receita_embalagens', 'receita_mao_obra', 'receita_sub_receitas',
          'receita_passos_preparo', 'user_configurations', 'despesas_fixas',
          'folha_pagamento', 'encargos_venda', 'markups', 'movimentacoes',
          'movimentacoes_receitas', 'estoque_receitas', 'categorias',
          'marcas', 'fornecedores', 'tipos_produto'
        ],
        created_by: user?.id
      })
      .select()
      .single();

    if (backupError) {
      console.error('Error creating backup record:', backupError);
      return new Response(
        JSON.stringify({ error: 'Failed to create backup record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Created backup record with ID: ${backup.id}`);

    // Collect backup data
    const backupData: Record<string, any> = {};
    const recordCounts: Record<string, number> = {};
    const tables = backup.tables_included || [];

    for (const tableName of tables) {
      try {
        console.log(`Backing up table: ${tableName}`);
        
        // Get table count
        const { count, error: countError } = await supabaseClient
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (countError) {
          console.warn(`Could not count table ${tableName}:`, countError);
          recordCounts[tableName] = 0;
          continue;
        }

        recordCounts[tableName] = count || 0;

        // For full backup, get actual data (limited for performance)
        if (requestData.backup_type === 'full' && (count || 0) <= 1000) {
          const { data, error: dataError } = await supabaseClient
            .from(tableName)
            .select('*');

          if (dataError) {
            console.warn(`Could not backup data from table ${tableName}:`, dataError);
          } else {
            backupData[tableName] = data || [];
          }
        }

      } catch (error) {
        logError(error, `Processing table ${tableName}`, { tableName });
        recordCounts[tableName] = -1; // Indicate error
      }
    }

    // Calculate backup size (rough estimate)
    const backupJson = JSON.stringify(backupData);
    const estimatedSize = new Blob([backupJson]).size;

    // Update backup record with results
    const { error: updateError } = await supabaseClient
      .from('backup_history')
      .update({
        status: 'completed',
        records_count: recordCounts,
        backup_data: Object.keys(backupData).length > 0 ? backupData : null,
        file_size: estimatedSize,
        completed_at: new Date().toISOString()
      })
      .eq('id', backup.id);

    if (updateError) {
      console.error('Error updating backup record:', updateError);
    }

    console.log(`Backup completed successfully. Size: ${estimatedSize} bytes`);

    return new Response(
      JSON.stringify({
        success: true,
        backup_id: backup.id,
        records_count: recordCounts,
        total_tables: tables.length,
        file_size: estimatedSize,
        status: 'completed'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorMessage = logError(error, "Main backup function execution");
    
    // Fallback: tentar criar um backup mínimo com informações de erro
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      await supabaseClient
        .from('backup_history')
        .insert({
          backup_type: 'error_fallback',
          status: 'failed',
          tables_included: [],
          records_count: { error: errorMessage },
          file_size: 0,
          completed_at: new Date().toISOString()
        });
        
      logStep('Created error fallback backup record');
    } catch (fallbackError) {
      logError(fallbackError, "Fallback backup record creation");
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Falha ao criar backup. Tente novamente ou contate o suporte.',
        message: errorMessage,
        backup_id: null,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});