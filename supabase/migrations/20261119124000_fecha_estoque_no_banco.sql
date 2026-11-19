-- O pg_cron executa o fechamento no próprio banco, no fuso de cada mercado.
-- Configure o job sem executar um fechamento na data da migração.
do $migration$
declare
  fechamento_id bigint;
  comando constant text := $fechamento$
  with mercados(pais, fuso) as (
    values ('BR', 'America/Sao_Paulo'), ('PT', 'Europe/Lisbon')
  ), horarios as (
    select pais, fuso, statement_timestamp() at time zone fuso as hora_local
    from mercados
  ), viradas as (
    select pais, date_trunc('month', hora_local) at time zone fuso as corte,
           to_char(hora_local - interval '1 month', 'YYYY-MM') as competencia
    from horarios
    where date_trunc('minute', hora_local) = date_trunc('month', hora_local)
  )
  insert into public.estoque_fechamentos_mensais
    (user_id, competencia, valor_estoque_fechamento, qtd_produtos_ativos)
  select perfil.user_id, virada.competencia,
         coalesce(sum(produto.estoque_atual * produto.custo_unitario), 0),
         count(produto.id)::integer
  from viradas virada
  join public.profiles perfil on perfil.business_country = virada.pais
    and perfil.region_confirmed and perfil.created_at < virada.corte
  left join public.produtos produto on produto.user_id = perfil.user_id and produto.ativo
  group by perfil.user_id, virada.competencia
  on conflict (user_id, competencia) do nothing;
$fechamento$;
begin
  select jobid into fechamento_id from cron.job
  where jobname = 'auto-fechamento-mensal' and database = current_database() and username = 'postgres';
  if fechamento_id is null then
    perform cron.schedule('auto-fechamento-mensal', '0 * * * *', comando);
  else
    perform cron.alter_job(fechamento_id, schedule := '0 * * * *', command := comando, active := true);
  end if;
end;
$migration$;
