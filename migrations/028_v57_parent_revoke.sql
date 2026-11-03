-- Staff can fully manage parent_children (revoke/delete when student removed)
drop policy if exists "staff manage parent links" on public.parent_children;
create policy "staff manage parent links" on public.parent_children for all
  using (school_id = public.my_school_id() and public.my_role() in ('Principal','Deputy Principal','Senior Teacher','Secretary'))
  with check (school_id = public.my_school_id());

-- Parents only see approved links (existing); inactive students filtered in app
