import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { parseBody, z } from "../_shared/validate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BodySchema = z.object({
  telefone: z.string().trim().min(8).max(20),
  fornecedor_nome: z.string().trim().min(1).max(120),
  produtos: z
    .array(
      z.object({
        produto: z.string().trim().min(1).max(120),
        quantidade: z.union([z.number(), z.string().max(20)]),
        unidade: z.string().trim().max(20),
      }),
    )
    .max(200)
    .optional(),
  mensagem: z.string().trim().max(1000).optional(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const limited = await enforceRateLimit(req, { bucket: "whatsapp-link", limit: 30, windowSeconds: 60 }, corsHeaders);
  if (limited) return limited;

  try {
    const parsed = await parseBody(req, BodySchema, corsHeaders);
    if (!parsed.ok) return parsed.response;
    const { telefone, fornecedor_nome, produtos, mensagem } = parsed.data;

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