import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telefone, fornecedor_nome, produtos, mensagem } = await req.json();

    console.log('[GENERATE-WHATSAPP] Generating link for:', fornecedor_nome);

    // Limpar telefone (remover caracteres não numéricos)
    const telefoneLimpo = telefone.replace(/\D/g, '');

    // Montar mensagem WhatsApp
    let textoMensagem = `Olá ${fornecedor_nome}! Gostaria de solicitar um orçamento:\n\n`;

    // Adicionar produtos
    if (produtos && produtos.length > 0) {
      textoMensagem += '*Produtos solicitados:*\n';
      produtos.forEach((produto: any) => {
        textoMensagem += `• ${produto.produto} - ${produto.quantidade} ${produto.unidade}\n`;
      });
      textoMensagem += '\n';
    }

    // Adicionar mensagem adicional
    if (mensagem) {
      textoMensagem += `*Mensagem:*\n${mensagem}\n\n`;
    }

    textoMensagem += 'Aguardo retorno. Obrigado!';

    // Codificar mensagem para URL
    const mensagemCodificada = encodeURIComponent(textoMensagem);

    // Gerar link WhatsApp (adicionar 55 se não houver código do país)
    const telefoneCompleto = telefoneLimpo.startsWith('55') 
      ? telefoneLimpo 
      : `55${telefoneLimpo}`;

    const whatsappLink = `https://wa.me/${telefoneCompleto}?text=${mensagemCodificada}`;

    console.log('[GENERATE-WHATSAPP] Link generated successfully');

    return new Response(
      JSON.stringify({ 
        link: whatsappLink,
        telefone: telefoneCompleto
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[GENERATE-WHATSAPP] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});