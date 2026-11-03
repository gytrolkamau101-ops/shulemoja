-- ShuleMoja RLS go-live verification
-- Run in Supabase SQL editor as a privileged role. Expect rls_enabled = true for core tables.

select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.tablename = c.relname and p.schemaname = 'public') as policy_count
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'schools','users','students','student_enrollments','grades','subjects',
    'fee_payments','fee_structures','fee_opening_balances','attendance',
    'exams','exam_results','terms','parent_links','parent_notices','audit_log'
  )
order by c.relname;

-- Helper functions used by policies
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname in ('my_school_id','my_role')
order by 1;

-- Migrations ledger (may be empty on old projects)
select * from public.schema_migrations order by id
  -- ignore error if table missing
;
