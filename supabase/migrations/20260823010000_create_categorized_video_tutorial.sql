create table public.tutorial_categories (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 80),
  description text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tutorial_videos (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.tutorial_categories(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 120),
  description text,
  storage_path text not null unique,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tutorial_categories enable row level security;
alter table public.tutorial_videos enable row level security;

create policy "Authenticated users view published tutorial categories"
on public.tutorial_categories for select to authenticated
using (is_published or public.has_role_or_higher('admin'::public.app_role, auth.uid()));

create policy "Admins manage tutorial categories"
on public.tutorial_categories for all to authenticated
using (public.has_role_or_higher('admin'::public.app_role, auth.uid()))
with check (public.has_role_or_higher('admin'::public.app_role, auth.uid()));

create policy "Authenticated users view published tutorial videos"
on public.tutorial_videos for select to authenticated
using ((is_published and exists (
  select 1 from public.tutorial_categories c
  where c.id = category_id and c.is_published
)) or public.has_role_or_higher('admin'::public.app_role, auth.uid()));

create policy "Admins manage tutorial videos"
on public.tutorial_videos for all to authenticated
using (public.has_role_or_higher('admin'::public.app_role, auth.uid()))
with check (public.has_role_or_higher('admin'::public.app_role, auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutorial-videos', 'tutorial-videos', false, 524288000,
  array['video/mp4','video/webm','video/quicktime','video/x-m4v'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users stream published tutorial videos"
on storage.objects for select to authenticated
using (bucket_id = 'tutorial-videos' and (
  exists (
    select 1 from public.tutorial_videos v
    join public.tutorial_categories c on c.id = v.category_id
    where v.storage_path = name and v.is_published and c.is_published
  ) or public.has_role_or_higher('admin'::public.app_role, auth.uid())
));

create policy "Admins upload tutorial videos"
on storage.objects for insert to authenticated
with check (bucket_id = 'tutorial-videos' and public.has_role_or_higher('admin'::public.app_role, auth.uid()));

create policy "Admins update tutorial videos"
on storage.objects for update to authenticated
using (bucket_id = 'tutorial-videos' and public.has_role_or_higher('admin'::public.app_role, auth.uid()))
with check (bucket_id = 'tutorial-videos' and public.has_role_or_higher('admin'::public.app_role, auth.uid()));

create policy "Admins delete tutorial videos"
on storage.objects for delete to authenticated
using (bucket_id = 'tutorial-videos' and public.has_role_or_higher('admin'::public.app_role, auth.uid()));

create index tutorial_categories_sort_idx on public.tutorial_categories (sort_order, created_at);
create index tutorial_videos_category_sort_idx on public.tutorial_videos (category_id, sort_order, created_at);
