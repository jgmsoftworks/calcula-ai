import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const pixabayApiKey = Deno.env.get('PIXABAY_API_KEY');

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

    console.log('Buscando imagens no Pixabay para:', productName);

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
      console.log('Nenhuma imagem encontrada para:', productName);
      return new Response(
        JSON.stringify({ images: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Pegar as primeiras 4 imagens (tamanho médio)
    const images = data.hits.slice(0, 4).map((hit: any) => hit.webformatURL);

    console.log(`Encontradas ${images.length} imagens para: ${productName}`);

    return new Response(
      JSON.stringify({ images }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Erro ao buscar imagens:', error);
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