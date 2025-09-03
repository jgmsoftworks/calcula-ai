import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { productName } = await req.json();

    if (!productName) {
      return new Response(
        JSON.stringify({ error: 'Nome do produto é obrigatório' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Gerando sugestões de imagem para:', productName);

    // Gerar 4 imagens diferentes baseadas no nome do produto
    const promises = [];
    
    for (let i = 0; i < 4; i++) {
      const prompt = `A high-quality product photo of ${productName}, clean white background, professional lighting, commercial photography style, ${i === 0 ? 'front view' : i === 1 ? 'side angle' : i === 2 ? 'top view' : 'slight angle view'}`;
      
      const imagePromise = fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: prompt,
          n: 1,
          size: '512x512',
          quality: 'standard',
          response_format: 'b64_json'
        }),
      });
      
      promises.push(imagePromise);
    }

    const responses = await Promise.all(promises);
    const images = [];

    for (const response of responses) {
      if (response.ok) {
        const data = await response.json();
        if (data.data && data.data[0] && data.data[0].b64_json) {
          images.push(`data:image/png;base64,${data.data[0].b64_json}`);
        }
      } else {
        console.error('Erro na resposta da OpenAI:', await response.text());
      }
    }

    console.log(`Geradas ${images.length} sugestões de imagem`);

    return new Response(
      JSON.stringify({ images }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao gerar sugestões de imagem:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro interno do servidor',
        message: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});