-- Track applied migrations (run once per project)
create table if not exists public.schema_migrations (
  id text primary key,
  applied_at timestamptz not null default now(),
  notes text
);

comment on table public.schema_migrations is 'ShuleMoja SQL migration ledger — apply files in migrations/ by numeric order';
