import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Criar cliente Supabase com service role para acessar auth.users
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verificar se o usuário logado é admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Autorização necessária');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Verificar se é admin
    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin');
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem buscar usuários.' }),
        { 
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Obter email do body
    const { email } = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email não fornecido' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('[GET-USER-BY-EMAIL] Buscando usuário com email:', email);

    // Buscar usuário no auth.users usando o admin client
    const { data: authUsers, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (searchError) {
      console.error('[GET-USER-BY-EMAIL] Erro ao buscar usuários:', searchError);
      throw searchError;
    }

    const foundUser = authUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
      console.log('[GET-USER-BY-EMAIL] Usuário não encontrado');
      return new Response(
        JSON.stringify({ 
          error: 'Usuário não encontrado',
          message: `Nenhum usuário cadastrado com o email: ${email}` 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Buscar informações adicionais do profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, business_name')
      .eq('user_id', foundUser.id)
      .single();

    console.log('[GET-USER-BY-EMAIL] Usuário encontrado:', foundUser.id);

    return new Response(
      JSON.stringify({
        user_id: foundUser.id,
        email: foundUser.email,
        last_sign_in_at: foundUser.last_sign_in_at,
        full_name: profile?.full_name,
        business_name: profile?.business_name,
        created_at: foundUser.created_at
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[GET-USER-BY-EMAIL] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao buscar usuário',
        details: error 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});