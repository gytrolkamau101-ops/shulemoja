-- v104: school funds (PTA/donor/CDF), projects, in-kind, exam_type for SBA/projects
-- Tracking only — no platform money movement.

create table if not exists public.school_projects (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  budget numeric default 0,
  status text not null default 'planned' check (status in ('planned','ongoing','complete','cancelled')),
  description text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create index if not exists school_projects_school_idx on public.school_projects (school_id);

create table if not exists public.school_fund_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  term_id uuid references public.terms(id) on delete set null,
  project_id uuid references public.school_projects(id) on delete set null,
  direction text not null check (direction in ('in','out')),
  source_type text not null default 'other',
  -- source_type examples: capitation, fees, pta, donor, cdf, other_income, in_kind, expense
  category text, -- vote head or spend label
  amount numeric not null default 0 check (amount >= 0),
  in_kind_item text,
  in_kind_qty numeric,
  in_kind_unit text,
  estimated_value numeric,
  entry_date date not null default current_date,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists school_fund_entries_school_idx on public.school_fund_entries (school_id, entry_date desc);
create index if not exists school_fund_entries_project_idx on public.school_fund_entries (project_id);

-- Capitation vote-head helper column (optional; category also used)
alter table public.capitation_entries
  add column if not exists vote_head text;

-- Exam type for CAT / project / SBA
alter table public.exams
  add column if not exists exam_type text default 'cat';

alter table public.exam_results
  add column if not exists cbc_level text;

alter table public.school_projects enable row level security;
alter table public.school_fund_entries enable row level security;

drop policy if exists school_projects_staff on public.school_projects;
create policy school_projects_staff on public.school_projects
  for all using (
    school_id in (select school_id from public.users where id = auth.uid())
  ) with check (
    school_id in (select school_id from public.users where id = auth.uid())
  );

drop policy if exists school_fund_entries_staff on public.school_fund_entries;
create policy school_fund_entries_staff on public.school_fund_entries
  for all using (
    school_id in (select school_id from public.users where id = auth.uid())
  ) with check (
    school_id in (select school_id from public.users where id = auth.uid())
  );
