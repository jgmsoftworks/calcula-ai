alter table public.produtos
add column if not exists rotulo_nutricional jsonb;

comment on column public.produtos.rotulo_nutricional is
  'Valores nutricionais opcionais do produto, informados por porção.';
