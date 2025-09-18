-- Update markups table with correct values from user_configurations
UPDATE markups 
SET 
  margem_lucro = (
    SELECT (config.configuration->>'lucroDesejado')::numeric
    FROM user_configurations config
    WHERE config.user_id = markups.user_id 
    AND config.type = 'markups_blocos'
    AND config.configuration @> json_build_array(json_build_object('nome', markups.nome))::jsonb
    LIMIT 1
  ),
  gasto_sobre_faturamento = (
    SELECT (tooltip_config.configuration->>'gastoSobreFaturamento')::numeric
    FROM user_configurations tooltip_config
    WHERE tooltip_config.user_id = markups.user_id 
    AND tooltip_config.type = 'markup_' || replace(lower(markups.nome), ' ', '_')
    LIMIT 1
  ),
  encargos_sobre_venda = (
    SELECT 
      COALESCE((tooltip_config.configuration->>'impostos')::numeric, 0) +
      COALESCE((tooltip_config.configuration->>'taxas')::numeric, 0) +
      COALESCE((tooltip_config.configuration->>'comissoes')::numeric, 0) +
      COALESCE((tooltip_config.configuration->>'outros')::numeric, 0)
    FROM user_configurations tooltip_config
    WHERE tooltip_config.user_id = markups.user_id 
    AND tooltip_config.type = 'markup_' || replace(lower(markups.nome), ' ', '_')
    LIMIT 1
  ),
  markup_ideal = (
    SELECT 
      CASE 
        WHEN (
          COALESCE((tooltip_config.configuration->>'gastoSobreFaturamento')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'impostos')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'taxas')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'comissoes')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'outros')::numeric, 0) +
          COALESCE((bloco_config.configuration->>idx)::jsonb->>'lucroDesejado', '0')::numeric
        ) > 0 
        THEN 100.0 / (100.0 - (
          COALESCE((tooltip_config.configuration->>'gastoSobreFaturamento')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'impostos')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'taxas')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'comissoes')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'outros')::numeric, 0) +
          COALESCE((bloco_config.configuration->>idx)::jsonb->>'lucroDesejado', '0')::numeric
        ))
        ELSE 1.25
      END
    FROM user_configurations tooltip_config,
         user_configurations bloco_config,
         LATERAL (
           SELECT ordinality - 1 as idx
           FROM jsonb_array_elements(bloco_config.configuration) WITH ORDINALITY arr
           WHERE arr.value->>'nome' = markups.nome
         ) AS bloco_idx
    WHERE tooltip_config.user_id = markups.user_id 
    AND tooltip_config.type = 'markup_' || replace(lower(markups.nome), ' ', '_')
    AND bloco_config.user_id = markups.user_id
    AND bloco_config.type = 'markups_blocos'
    LIMIT 1
  ),
  markup_aplicado = (
    SELECT 
      CASE 
        WHEN (
          COALESCE((tooltip_config.configuration->>'gastoSobreFaturamento')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'impostos')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'taxas')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'comissoes')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'outros')::numeric, 0) +
          COALESCE((bloco_config.configuration->>idx)::jsonb->>'lucroDesejado', '0')::numeric
        ) > 0 
        THEN 100.0 / (100.0 - (
          COALESCE((tooltip_config.configuration->>'gastoSobreFaturamento')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'impostos')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'taxas')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'comissoes')::numeric, 0) +
          COALESCE((tooltip_config.configuration->>'outros')::numeric, 0) +
          COALESCE((bloco_config.configuration->>idx)::jsonb->>'lucroDesejado', '0')::numeric
        ))
        ELSE 1.25
      END
    FROM user_configurations tooltip_config,
         user_configurations bloco_config,
         LATERAL (
           SELECT ordinality - 1 as idx
           FROM jsonb_array_elements(bloco_config.configuration) WITH ORDINALITY arr
           WHERE arr.value->>'nome' = markups.nome
         ) AS bloco_idx
    WHERE tooltip_config.user_id = markups.user_id 
    AND tooltip_config.type = 'markup_' || replace(lower(markups.nome), ' ', '_')
    AND bloco_config.user_id = markups.user_id
    AND bloco_config.type = 'markups_blocos'
    LIMIT 1
  );