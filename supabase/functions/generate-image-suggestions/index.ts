import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logError = (error: unknown, context: string, details?: any) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  console.error(`[GENERATE-IMAGE-SUGGESTIONS ERROR] ${context}`, {
    message: errorMessage,
    stack,
    details,
    timestamp: new Date().toISOString()
  });
  return errorMessage;
};

const logStep = (step: string, details?: any) => {
  console.log(`[GENERATE-IMAGE-SUGGESTIONS] ${step}`, details ? { details, timestamp: new Date().toISOString() } : { timestamp: new Date().toISOString() });
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!pixabayApiKey) {
      throw new Error('PIXABAY_API_KEY não configurada');
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

    logStep('Buscando imagens no Pixabay', { productName });

    // Buscar imagens na API do Pixabay
    const pixabayUrl = new URL('https://pixabay.com/api/');
    pixabayUrl.searchParams.set('key', pixabayApiKey);
    pixabayUrl.searchParams.set('q', productName);
    pixabayUrl.searchParams.set('image_type', 'photo');
    pixabayUrl.searchParams.set('category', 'all');
    pixabayUrl.searchParams.set('min_width', '512');
    pixabayUrl.searchParams.set('min_height', '512');
    pixabayUrl.searchParams.set('per_page', '20');
    pixabayUrl.searchParams.set('safesearch', 'true');
    pixabayUrl.searchParams.set('order', 'popular');

    const response = await fetch(pixabayUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Erro na API do Pixabay: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.hits || data.hits.length === 0) {
      logStep('Nenhuma imagem encontrada', { productName });
      return new Response(
        JSON.stringify({ 
          images: [],
          message: "Nenhuma imagem encontrada para este produto",
          fallback: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Pegar as primeiras 4 imagens (tamanho médio)
    const images = data.hits.slice(0, 4).map((hit: any) => hit.webformatURL);

    logStep('Imagens encontradas com sucesso', { productName, count: images.length });

    return new Response(
      JSON.stringify({ images }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const errorMessage = logError(error, "Image search failed");
    
    // Fallback: retornar array vazio em vez de erro para não quebrar UX
    logStep("Using fallback empty images array");
    
    return new Response(
      JSON.stringify({ 
        images: [],
        error: false, // Não é erro crítico para o usuário
        message: "Não foi possível buscar imagens no momento. Você pode fazer upload manual.",
        fallback: true
      }),
      { 
        status: 200, // Retorna sucesso com fallback
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});