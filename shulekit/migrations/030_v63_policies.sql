-- v63: write access for Principal/Deputy/Secretary + parent notices

-- Ensure Deputy Principal can write core tables (original schema often omitted Deputy)
do $$
declare t text;
begin
  foreach t in array array[
    'students','student_enrollments','fee_payments','fee_structures','fee_opening_balances',
    'expenses','school_resources','admissions','parent_children','circulars'
  ]
  loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('drop policy if exists "write" on public.%I', t);
      execute format(
        'create policy "write" on public.%I for all using (
           school_id = public.my_school_id()
           and public.my_role() in (''Principal'',''Deputy Principal'',''Senior Teacher'',''Secretary'')
         ) with check (
           school_id = public.my_school_id()
           and public.my_role() in (''Principal'',''Deputy Principal'',''Senior Teacher'',''Secretary'')
         )', t);
    end if;
  end loop;
end $$;

-- Parent notices (letters to parents)
create table if not exists public.parent_notices (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  notice_type text not null default 'general',
  title text not null,
  body text not null,
  created_by uuid,
  created_at timestamptz default now()
);
create index if not exists parent_notices_student on public.parent_notices(student_id);
alter table public.parent_notices enable row level security;
drop policy if exists "staff parent notices" on public.parent_notices;
create policy "staff parent notices" on public.parent_notices for all
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
drop policy if exists "parent reads notices" on public.parent_notices;
create policy "parent reads notices" on public.parent_notices for select
  using (
    student_id in (select student_id from public.parent_children where parent_id = auth.uid() and status = 'approved')
  );
