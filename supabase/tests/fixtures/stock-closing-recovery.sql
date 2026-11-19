create role anon;
create role authenticated;
create role service_role;
create schema private;
create schema cron;
create table cron.job(jobid bigint primary key, jobname text, database text default current_database(),
  username text default 'postgres', schedule text, command text, active boolean);
create function cron.alter_job(bigint,schedule text,command text,active boolean) returns void
  language sql as $$ update cron.job set schedule=$2, command=$3, active=$4 where jobid=$1 $$;
insert into cron.job(jobid,jobname) values (41,'auto-fechamento-mensal');
create table public.profiles(user_id uuid primary key, business_country text not null, region_confirmed boolean not null);
create table public.produtos(id integer primary key, user_id uuid not null, ativo boolean not null,
  estoque_atual numeric, custo_unitario numeric);
create table public.estoque_fechamentos_mensais(user_id uuid, competencia text, valor_estoque_fechamento numeric,
  qtd_produtos_ativos int, primary key(user_id, competencia));
insert into public.profiles values
  ('00000000-0000-0000-0000-000000000001','BR',true),
  ('00000000-0000-0000-0000-000000000002','PT',true),
  ('00000000-0000-0000-0000-000000000003','BR',false);
insert into public.produtos values (1,'00000000-0000-0000-0000-000000000001',true,10,2);
