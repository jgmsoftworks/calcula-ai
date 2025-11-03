-- Criar função RPC para atualizar produto com cast explícito
CREATE OR REPLACE FUNCTION update_produto_with_cast(
  p_id uuid,
  p_nome text,
  p_marcas text[],
  p_categorias text[],
  p_categoria text,
  p_codigo_interno text,
  p_codigo_barras text[],
  p_unidade text,
  p_total_embalagem numeric,
  p_custo_unitario numeric,
  p_custo_medio numeric,
  p_custo_total numeric,
  p_estoque_atual numeric,
  p_estoque_minimo numeric,
  p_fornecedor_ids uuid[],
  p_imagem_url text,
  p_ativo boolean,
  p_rotulo_porcao text,
  p_rotulo_kcal numeric,
  p_rotulo_carb numeric,
  p_rotulo_prot numeric,
  p_rotulo_gord_total numeric,
  p_rotulo_gord_sat numeric,
  p_rotulo_gord_trans numeric,
  p_rotulo_fibra numeric,
  p_rotulo_sodio numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE produtos
  SET 
    nome = p_nome,
    marcas = p_marcas,
    categorias = p_categorias,
    categoria = p_categoria,
    codigo_interno = p_codigo_interno,
    codigo_barras = p_codigo_barras,
    unidade = p_unidade::unidade_medida,  -- Cast explícito aqui
    total_embalagem = p_total_embalagem,
    custo_unitario = p_custo_unitario,
    custo_medio = p_custo_medio,
    custo_total = p_custo_total,
    estoque_atual = p_estoque_atual,
    estoque_minimo = p_estoque_minimo,
    fornecedor_ids = p_fornecedor_ids,
    imagem_url = p_imagem_url,
    ativo = p_ativo,
    rotulo_porcao = p_rotulo_porcao,
    rotulo_kcal = p_rotulo_kcal,
    rotulo_carb = p_rotulo_carb,
    rotulo_prot = p_rotulo_prot,
    rotulo_gord_total = p_rotulo_gord_total,
    rotulo_gord_sat = p_rotulo_gord_sat,
    rotulo_gord_trans = p_rotulo_gord_trans,
    rotulo_fibra = p_rotulo_fibra,
    rotulo_sodio = p_rotulo_sodio,
    updated_at = now()
  WHERE id = p_id AND user_id = auth.uid();
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false, 
      'error', SQLERRM,
      'code', SQLSTATE
    );
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION update_produto_with_cast IS 'Função RPC para atualizar produtos com cast explícito de text para unidade_medida, contornando limitação de cast implícito no Supabase';