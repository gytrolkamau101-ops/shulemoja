create table if not exists public.library_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  author text,
  category text,
  accession_no text,
  isbn text,
  copies int not null default 1,
  status text not null default 'Available',
  shelf text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists library_items_school_idx on public.library_items (school_id, category);
alter table public.library_items enable row level security;
drop policy if exists library_school_staff on public.library_items;
create policy library_school_staff on public.library_items
  for all using (school_id in (select school_id from public.users where id = auth.uid()))
  with check (school_id in (select school_id from public.users where id = auth.uid()));
