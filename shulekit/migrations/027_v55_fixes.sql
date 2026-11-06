-- v55: parent link limits + revoke on student inactive + parent school pay (idempotent)

-- Max 3 approved parent links per student
create or replace function public.enforce_parent_link_limit()
returns trigger language plpgsql as $$
declare n int;
begin
  if NEW.status = 'approved' then
    select count(*) into n from public.parent_children
      where student_id = NEW.student_id and status = 'approved' and id is distinct from NEW.id;
    if n >= 3 then
      raise exception 'Maximum 3 parent accounts per learner (admission number).';
    end if;
  end if;
  return NEW;
end $$;

drop trigger if exists trg_parent_link_limit on public.parent_children;
create trigger trg_parent_link_limit
  before insert or update on public.parent_children
  for each row execute function public.enforce_parent_link_limit();

-- Parent can read school payment info
drop policy if exists "parent reads school payment info" on public.schools;
create policy "parent reads school payment info" on public.schools
  for select using (
    id = public.my_school_id() or id = public.my_parent_school_id()
  );

-- Optional: staff delete admissions
drop policy if exists "staff manage admissions" on public.admissions;
create policy "staff manage admissions" on public.admissions for all
  using (school_id = public.my_school_id() and public.my_role() in ('Principal','Deputy Principal','Senior Teacher','Secretary'))
  with check (school_id = public.my_school_id());
