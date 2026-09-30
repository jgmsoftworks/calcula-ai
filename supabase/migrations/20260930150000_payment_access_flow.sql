-- Internal payment state. Browser clients cannot read or write these tables.
create table public.billing_jobs (
  key text primary key,
  lease_token uuid not null,
  lease_until timestamptz not null,
  completed_at timestamptz
);
create table public.billing_checkouts (
  session_id text primary key,
  subscription_id text,
  customer_id text not null,
  email text not null,
  user_id uuid references auth.users(id),
  plan text,
  status text not null check (status in ('pending','approved','trial','failed')),
  needs_password_setup boolean not null default false,
  updated_at timestamptz not null default now()
);
create index billing_checkouts_subscription_idx on public.billing_checkouts(subscription_id);
create table public.billing_emails (
  key text primary key,
  -- A retry reuses the exact provider payload, including its single-use link.
  -- Clear the payload after provider acceptance; never expose it to browsers.
  payload jsonb,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
alter table public.billing_jobs enable row level security;
alter table public.billing_checkouts enable row level security;
alter table public.billing_emails enable row level security;
revoke all on public.billing_jobs, public.billing_checkouts, public.billing_emails from anon, authenticated;
grant all on public.billing_jobs, public.billing_checkouts, public.billing_emails to service_role;

create function public.claim_billing_job(job_key text, token uuid)
returns text language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.billing_jobs(key, lease_token, lease_until)
  values (job_key, token, now() + interval '5 minutes')
  on conflict (key) do update
    set lease_token = excluded.lease_token, lease_until = excluded.lease_until
    where billing_jobs.completed_at is null and billing_jobs.lease_until <= now();
  if found then return 'claimed'; end if;
  if exists(select 1 from public.billing_jobs where key = job_key and completed_at is not null)
    then return 'done'; end if;
  return 'busy';
end; $$;
create function public.release_billing_job(job_key text, token uuid, completed boolean default false)
returns void language sql security invoker set search_path = '' as $$
  update public.billing_jobs set lease_until = now(),
    completed_at = case when completed then now() else null end
  where key = job_key and lease_token = token;
$$;
revoke all on function public.claim_billing_job(text,uuid), public.release_billing_job(text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.claim_billing_job(text,uuid), public.release_billing_job(text,uuid,boolean) to service_role;
