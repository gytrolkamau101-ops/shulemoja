-- Public can read platform_settings (login theme). Super Admin can write.
alter table if exists public.platform_settings enable row level security;

drop policy if exists platform_settings_public_read on public.platform_settings;
create policy platform_settings_public_read on public.platform_settings
  for select using (true);

drop policy if exists platform_settings_super_write on public.platform_settings;
create policy platform_settings_super_write on public.platform_settings
  for all
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (u.is_super_admin = true or u.role = 'Super Admin')
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and (u.is_super_admin = true or u.role = 'Super Admin')
    )
  );
