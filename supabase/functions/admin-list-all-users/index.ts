import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user making the request
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('has_role_or_higher', {
      required_role: 'admin',
      check_user_id: user.id
    });

    if (roleError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // List all users from auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (listError) {
      throw listError;
    }

    // Get all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name, business_name, plan, created_at, cnpj_cpf');

    if (profilesError) {
      throw profilesError;
    }

    // Get all fornecedores
    const { data: fornecedores, error: fornecedoresError } = await supabaseAdmin
      .from('fornecedores')
      .select('user_id, eh_fornecedor, id')
      .eq('eh_fornecedor', true);

    if (fornecedoresError) {
      throw fornecedoresError;
    }

    // Create maps for quick lookup
    const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    const fornecedoresMap = new Map(fornecedores?.map(f => [f.user_id, f]) || []);

    // Merge data
    const mergedUsers = authUsers.users.map(authUser => {
      const profile = profilesMap.get(authUser.id);
      const fornecedor = fornecedoresMap.get(authUser.id);
      
      return {
        user_id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        last_sign_in_at: authUser.last_sign_in_at,
        created_at: authUser.created_at,
        // Profile data (may be null if user hasn't logged in yet)
        full_name: profile?.full_name || null,
        business_name: profile?.business_name || null,
        plan: profile?.plan || 'free',
        cnpj_cpf: profile?.cnpj_cpf || null,
        has_profile: !!profile,
        // Fornecedor status
        eh_fornecedor: fornecedor?.eh_fornecedor || false,
        fornecedor_id: fornecedor?.id || null
      };
    });

    // Sort by created_at descending
    mergedUsers.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return new Response(
      JSON.stringify({ users: mergedUsers }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error listing users:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
