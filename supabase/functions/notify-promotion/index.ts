import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { promocao_id } = await req.json();

    console.log('[NOTIFY-PROMOTION] Processing promotion:', promocao_id);

    // Buscar promoção com dados do fornecedor
    const { data: promocao, error: promocaoError } = await supabaseClient
      .from('promocoes_fornecedores')
      .select(`
        *,
        fornecedor:fornecedores(
          nome,
          cidade,
          estado
        )
      `)
      .eq('id', promocao_id)
      .single();

    if (promocaoError || !promocao) {
      console.error('[NOTIFY-PROMOTION] Error fetching promotion:', promocaoError);
      throw new Error('Promoção não encontrada');
    }

    console.log('[NOTIFY-PROMOTION] Promotion data:', {
      titulo: promocao.titulo,
      cidade: promocao.fornecedor.cidade
    });

    // Buscar usuários da mesma cidade
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, cidade')
      .eq('cidade', promocao.fornecedor.cidade);

    if (profilesError) {
      console.error('[NOTIFY-PROMOTION] Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log('[NOTIFY-PROMOTION] Found users in same city:', profiles?.length || 0);

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Nenhum usuário encontrado na mesma cidade',
          notified: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar notificações para todos os usuários da cidade
    const notifications = profiles.map(profile => ({
      user_id: profile.user_id,
      type: 'promo',
      title: `🎉 Nova promoção em ${promocao.fornecedor.cidade}!`,
      message: `${promocao.fornecedor.nome}: ${promocao.titulo}`,
      related_id: promocao_id
    }));

    const { error: notifyError } = await supabaseClient
      .from('notifications')
      .insert(notifications);

    if (notifyError) {
      console.error('[NOTIFY-PROMOTION] Error creating notifications:', notifyError);
      throw notifyError;
    }

    console.log('[NOTIFY-PROMOTION] Successfully notified users:', notifications.length);

    return new Response(
      JSON.stringify({ 
        message: 'Notificações enviadas com sucesso',
        notified: notifications.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[NOTIFY-PROMOTION] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});