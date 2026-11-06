-- Soft desk colour theme (no photo background)
alter table public.schools add column if not exists shell_theme text default 'sky';
