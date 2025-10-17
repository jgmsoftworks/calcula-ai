import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Verify the user is authenticated and is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin using has_role_or_higher function
    const { data: isAdminData, error: adminError } = await supabase.rpc('has_role_or_higher', {
      required_role: 'admin',
      check_user_id: user.id,
    });

    if (adminError || !isAdminData) {
      throw new Error('Access denied. Admin privileges required.');
    }

    const { userId, setAsFornecedor } = await req.json();

    if (!userId || typeof setAsFornecedor !== 'boolean') {
      throw new Error('Missing or invalid parameters: userId and setAsFornecedor are required');
    }

    console.log(`Admin ${user.id} toggling fornecedor status for user ${userId} to ${setAsFornecedor}`);

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, business_name, cnpj_cpf, phone')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      throw new Error(`Failed to fetch user profile: ${profileError.message}`);
    }

    if (setAsFornecedor) {
      // Add fornecedor role - create fornecedores record with eh_fornecedor = true
      // First check if there's already a fornecedor record
      const { data: existingFornecedor, error: checkError } = await supabase
        .from('fornecedores')
        .select('id, eh_fornecedor')
        .eq('user_id', userId)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Failed to check existing fornecedor: ${checkError.message}`);
      }

      if (existingFornecedor) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('fornecedores')
          .update({ eh_fornecedor: true })
          .eq('id', existingFornecedor.id);

        if (updateError) {
          throw new Error(`Failed to update fornecedor status: ${updateError.message}`);
        }

        console.log(`Updated existing fornecedor record ${existingFornecedor.id} to eh_fornecedor=true`);
      } else {
        // Create new fornecedor record
        const { error: insertError } = await supabase
          .from('fornecedores')
          .insert({
            user_id: userId,
            nome: profile.business_name || profile.full_name || 'Fornecedor',
            cnpj_cpf: profile.cnpj_cpf || '',
            cidade: 'Não informado',
            email: '', // Will be populated if needed
            telefone: profile.phone || '',
            eh_fornecedor: true,
          });

        if (insertError) {
          throw new Error(`Failed to create fornecedor record: ${insertError.message}`);
        }

        console.log(`Created new fornecedor record for user ${userId}`);
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        admin_user_id: user.id,
        target_user_id: userId,
        action_type: 'add_fornecedor_role',
        old_value: { eh_fornecedor: false },
        new_value: { eh_fornecedor: true },
        reason: 'Admin toggled fornecedor status',
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Usuário transformado em fornecedor com sucesso',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Remove fornecedor role - update fornecedores record to eh_fornecedor = false
      const { data: fornecedor, error: fetchError } = await supabase
        .from('fornecedores')
        .select('id')
        .eq('user_id', userId)
        .eq('eh_fornecedor', true)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to fetch fornecedor record: ${fetchError.message}`);
      }

      if (!fornecedor) {
        throw new Error('Fornecedor record not found');
      }

      // Update to eh_fornecedor = false
      const { error: updateError } = await supabase
        .from('fornecedores')
        .update({ eh_fornecedor: false })
        .eq('id', fornecedor.id);

      if (updateError) {
        throw new Error(`Failed to remove fornecedor status: ${updateError.message}`);
      }

      console.log(`Updated fornecedor record ${fornecedor.id} to eh_fornecedor=false`);

      // Log admin action
      await supabase.from('admin_actions').insert({
        admin_user_id: user.id,
        target_user_id: userId,
        action_type: 'remove_fornecedor_role',
        old_value: { eh_fornecedor: true },
        new_value: { eh_fornecedor: false },
        reason: 'Admin toggled fornecedor status',
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Usuário removido da lista de fornecedores com sucesso',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('Error in admin-toggle-fornecedor-role:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
