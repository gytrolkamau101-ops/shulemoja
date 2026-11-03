-- Parents need to read their school's Till/Paybill on the parent portal
drop policy if exists "parent reads school payment info" on public.schools;
create policy "parent reads school payment info" on public.schools
  for select
  using (
    id = public.my_school_id()
    or id = public.my_parent_school_id()
  );

-- Ensure own school policy doesn't block (multiple permissive policies OR together)
-- Keep existing "own school" / platform policies as-is.
