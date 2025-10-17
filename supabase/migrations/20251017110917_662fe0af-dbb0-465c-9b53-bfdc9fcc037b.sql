-- Remover registro de fornecedor do marketplace para jotave.face
-- O trigger handle_fornecedor_role irá automaticamente remover a role 'fornecedor'
DELETE FROM public.fornecedores
WHERE user_id = '6ea501cb-dadc-472e-92a7-65c6d12f843a'
  AND eh_fornecedor = true;

-- Comentários para documentação do sistema
COMMENT ON COLUMN public.fornecedores.eh_fornecedor IS 'Indica se o fornecedor está cadastrado no marketplace (true) ou é apenas um fornecedor de estoque (false)';
COMMENT ON TABLE public.fornecedores IS 'Tabela que armazena fornecedores do marketplace E fornecedores de estoque. Use eh_fornecedor=true para fornecedores do marketplace.';