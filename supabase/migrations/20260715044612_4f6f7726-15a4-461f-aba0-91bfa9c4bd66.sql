create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  short_name text not null,
  full_name text not null,
  logo_url text,
  link_url text,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.partners to anon, authenticated;
grant insert, update, delete on public.partners to authenticated;
grant all on public.partners to service_role;

alter table public.partners enable row level security;

create policy "partners readable by everyone"
  on public.partners for select using (true);

create policy "partners admin insert"
  on public.partners for insert to authenticated
  with check (private.has_role(auth.uid(), 'admin'::app_role));

create policy "partners admin update"
  on public.partners for update to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role))
  with check (private.has_role(auth.uid(), 'admin'::app_role));

create policy "partners admin delete"
  on public.partners for delete to authenticated
  using (private.has_role(auth.uid(), 'admin'::app_role));

alter publication supabase_realtime add table public.partners;

insert into public.partners (slug, short_name, full_name, display_order, active) values
  ('cbcp', 'CBCP', 'Christian Bible Church of the Philippines', 1, true),
  ('igsl', 'IGSL', 'International Graduate School of Leadership', 2, true),
  ('fcl',  'FCL',  'Foundations for Christian Leadership', 3, true)
on conflict (slug) do nothing;
