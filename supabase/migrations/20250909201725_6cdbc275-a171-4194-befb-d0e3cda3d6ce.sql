-- Clean up duplicate RLS policies and ensure maximum security

-- Drop duplicate policies on profiles table
DROP POLICY IF EXISTS "users_can_select_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile_only" ON public.profiles;

-- Keep only the most restrictive policies that ensure auth is required
-- The remaining policies already have (auth.uid() IS NOT NULL) which is more secure

-- Ensure RLS is enabled on all sensitive tables (double-check)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folha_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marcas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encargos_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_despesas_fixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_configurations ENABLE ROW LEVEL SECURITY;

-- Force all tables to deny access by default (only explicit policies allow access)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores FORCE ROW LEVEL SECURITY;
ALTER TABLE public.folha_pagamento FORCE ROW LEVEL SECURITY;
ALTER TABLE public.produtos FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categorias FORCE ROW LEVEL SECURITY;
ALTER TABLE public.marcas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.despesas_fixas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.encargos_venda FORCE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_despesas_fixas FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_configurations FORCE ROW LEVEL SECURITY;