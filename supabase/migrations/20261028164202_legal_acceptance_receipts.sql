-- New records only. Legacy user_consents are not evidence of this release.
create schema if not exists private;

create table public.legal_document_releases (
  version text primary key,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  content jsonb not null check ((content->>'status' = 'published' and content->>'version' = version) is true),
  active boolean not null default false,
  published_at timestamptz not null default now()
);
create unique index legal_document_one_active on public.legal_document_releases ((true)) where active;
alter table public.legal_document_releases enable row level security;
revoke all on public.legal_document_releases from public, anon, authenticated;
grant select on public.legal_document_releases to anon, authenticated;
grant all on public.legal_document_releases to service_role;
create policy "Published legal releases are readable" on public.legal_document_releases for select to anon, authenticated using (true);

create table public.legal_acceptance_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  version text not null references public.legal_document_releases(version),
  accepted_at timestamptz not null default now(),
  terms_accepted boolean not null check (terms_accepted),
  privacy_acknowledged boolean not null check (privacy_acknowledged),
  primary key (user_id, version)
);
alter table public.legal_acceptance_receipts enable row level security;
revoke all on public.legal_acceptance_receipts from public, anon, authenticated;
grant select on public.legal_acceptance_receipts to authenticated;
grant all on public.legal_acceptance_receipts to service_role;
create policy "Users read their legal receipts" on public.legal_acceptance_receipts for select to authenticated using ((select auth.uid()) = user_id);

create function private.protect_legal_release() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.version is distinct from old.version or new.content_sha256 is distinct from old.content_sha256
    or new.content is distinct from old.content or new.published_at is distinct from old.published_at then
    raise exception 'Published legal documents are immutable; publish a new version';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_legal_release() from public, anon, authenticated;
create trigger legal_release_immutable before update on public.legal_document_releases for each row execute function private.protect_legal_release();

create function public.legal_acceptance_status()
returns table (version text, content_sha256 text, accepted boolean)
language sql stable security invoker set search_path = '' as $$
  select d.version, d.content_sha256,
    exists (select 1 from public.legal_acceptance_receipts r where r.user_id = auth.uid() and r.version = d.version)
  from public.legal_document_releases d where d.active and auth.uid() is not null;
$$;
revoke all on function public.legal_acceptance_status() from public, anon;
grant execute on function public.legal_acceptance_status() to authenticated;

create function private.accept_legal_documents(p_version text, p_content_sha256 text, p_accept_terms boolean, p_acknowledge_privacy boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  release public.legal_document_releases%rowtype;
begin
  if caller is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_accept_terms is not true or p_acknowledge_privacy is not true then
    raise exception 'Both acknowledgements are required' using errcode = '22023';
  end if;
  select * into release from public.legal_document_releases where active for share;
  if release.version is null or p_version is distinct from release.version or p_content_sha256 is distinct from release.content_sha256 then
    raise exception 'Legal documents changed; reload before accepting' using errcode = '22023';
  end if;
  insert into public.legal_acceptance_receipts(user_id, version, terms_accepted, privacy_acknowledged)
  values(caller, release.version, true, true) on conflict (user_id, version) do nothing;
end;
$$;
revoke all on function private.accept_legal_documents(text,text,boolean,boolean) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.accept_legal_documents(text,text,boolean,boolean) to authenticated;

create function public.accept_legal_documents(p_version text, p_content_sha256 text, p_accept_terms boolean, p_acknowledge_privacy boolean)
returns void language sql security invoker set search_path = '' as $$
  select private.accept_legal_documents(p_version, p_content_sha256, p_accept_terms, p_acknowledge_privacy);
$$;
revoke all on function public.accept_legal_documents(text,text,boolean,boolean) from public, anon;
grant execute on function public.accept_legal_documents(text,text,boolean,boolean) to authenticated;

-- Cookie preferences remain independent. Old legal entries remain readable.
alter policy "Usuarios podem registrar seus proprios consentimentos" on public.user_consents
with check (auth.uid() = user_id and consent_type in ('cookies_necessary','cookies_analytics','cookies_marketing','marketing_emails'));

-- Deliberately no seed: release.json is a draft until operator details and
-- the documented release checks are complete. scripts/legal-release.mjs
-- produces the immutable content/hash publication SQL after validation.
