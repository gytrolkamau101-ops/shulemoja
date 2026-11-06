-- Site-wide blurred background image (school-level)
alter table public.schools add column if not exists app_bg_url text;
alter table public.schools add column if not exists app_bg_blur int default 14;
alter table public.schools add column if not exists app_bg_overlay numeric default 0.55;
