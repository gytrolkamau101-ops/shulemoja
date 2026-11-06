-- Boarding depth (MoE-aligned fields)
alter table public.boarding_houses add column if not exists bed_count int;
alter table public.boarding_houses add column if not exists drying_lines int default 0;
alter table public.boarding_houses add column if not exists sex text;
alter table public.boarding_houses add column if not exists matron_user_id uuid;
alter table public.boarding_houses add column if not exists notes text;
update public.boarding_houses set bed_count = capacity where bed_count is null and capacity is not null;

-- Optional school identity for anti-duplicate referrals
alter table public.schools add column if not exists nemis_code text;
alter table public.schools add column if not exists registration_cert_no text;
create unique index if not exists schools_nemis_code_uq on public.schools (nemis_code) where nemis_code is not null and length(trim(nemis_code)) > 0;
