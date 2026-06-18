ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS unique_codigo_interno_per_user;
DROP INDEX IF EXISTS public.unique_codigo_interno_per_user;

CREATE UNIQUE INDEX IF NOT EXISTS produtos_user_codigo_ativo_unique
  ON public.produtos (user_id, codigo_interno)
  WHERE ativo = true;