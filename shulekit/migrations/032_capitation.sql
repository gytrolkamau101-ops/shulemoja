-- Government capitation ledger (Premium)
create table if not exists public.capitation_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  term_id uuid references public.terms(id) on delete set null,
  kind text not null check (kind in ('inflow', 'spend')),
  amount numeric not null check (amount >= 0),
  source text,
  notes text,
  entry_date date not null default current_date,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists capitation_entries_school_idx on public.capitation_entries (school_id, entry_date desc);

alter table public.capitation_entries enable row level security;

-- Staff of same school (adjust if you use a standard school membership policy)
drop policy if exists capitation_school_staff on public.capitation_entries;
create policy capitation_school_staff on public.capitation_entries
  for all
  using (
    school_id in (select school_id from public.users where id = auth.uid())
  )
  with check (
    school_id in (select school_id from public.users where id = auth.uid())
  );
