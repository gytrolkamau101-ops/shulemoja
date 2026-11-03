-- ShuleMoja v69 — Individual "Partner" cash referral program
-- Separate from the school-to-school referral program in 019_v30_referral_trial.sql
-- (public.referrals / public.referral_signups / public.schools.referral_code etc.) —
-- that system is untouched by this file.
--
-- A "partner" is an individual (secretary, freelance agent, etc.) who refers NEW
-- schools and earns real cash (KSh), paid manually by the platform admin via M-Pesa
-- outside the app. This file only builds the tracking / approval / ledger system —
-- no automatic M-Pesa B2C payout.

-- ============================================================
-- 1. partners
-- ============================================================
create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  referral_code text not null,
  status text not null default 'active' check (status in ('active', 'suspended')),
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists partners_phone_unique on public.partners (phone);
create unique index if not exists partners_referral_code_unique on public.partners (upper(referral_code));

create or replace function public.ensure_partner_referral_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if new.referral_code is null or trim(new.referral_code) = '' then
    loop
      c := 'PTR-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
      exit when not exists (select 1 from public.partners where upper(referral_code) = c);
    end loop;
    new.referral_code := c;
  else
    new.referral_code := upper(trim(new.referral_code));
  end if;
  return new;
end $$;

drop trigger if exists trg_partner_referral_code on public.partners;
create trigger trg_partner_referral_code
  before insert on public.partners
  for each row execute function public.ensure_partner_referral_code();

-- ============================================================
-- 2. partner_referrals — links a partner to a school they referred.
--    One partner per school, ever (first-referrer-wins): unique on school_id.
-- ============================================================
create table if not exists public.partner_referrals (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  referred_at timestamptz not null default now(),
  first_payment_confirmed_at timestamptz
);

create unique index if not exists partner_referrals_school_unique on public.partner_referrals (school_id);
create index if not exists partner_referrals_partner on public.partner_referrals (partner_id);

-- ============================================================
-- 3. partner_payout_config — single editable row. Admin-tunable, no deploy needed.
-- ============================================================
create table if not exists public.partner_payout_config (
  id int primary key default 1,
  bonus_basic numeric not null default 200,
  bonus_premium numeric not null default 350,
  bonus_pro numeric not null default 500,
  commission_pct numeric not null default 2.5,
  updated_at timestamptz not null default now(),
  constraint partner_payout_config_singleton check (id = 1)
);

insert into public.partner_payout_config (id, bonus_basic, bonus_premium, bonus_pro, commission_pct)
values (1, 200, 350, 500, 2.5)
on conflict (id) do nothing;

-- ============================================================
-- 4. partner_payout_events — the ledger. One row per bonus/commission owed.
--    source_payment_id references the confirmed payment event (subscription_events,
--    the table the IntaSend webhook writes to — see netlify/functions/intasend-webhook.js
--    and 016_payment_log.sql / 17_payment_log.sql; this codebase has no separate
--    "payment_log" table, subscription_events is the payment audit log).
-- ============================================================
create table if not exists public.partner_payout_events (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  type text not null check (type in ('signup_bonus', 'commission')),
  amount numeric not null check (amount >= 0),
  source_payment_id uuid references public.subscription_events(id) on delete set null,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'paid', 'rejected')),
  created_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz,
  paid_at timestamptz,
  paid_reference text
);

-- Dedupe guard: the trigger below can fire more than once for the same
-- subscription_events row (insert, then update to APPLIED) — this constraint plus
-- `on conflict do nothing` in the trigger keeps it a no-op the second time.
create unique index if not exists partner_payout_events_source_unique
  on public.partner_payout_events (source_payment_id, type)
  where source_payment_id is not null;

create index if not exists partner_payout_events_partner on public.partner_payout_events (partner_id);
create index if not exists partner_payout_events_status on public.partner_payout_events (status);

-- ============================================================
-- RLS — platform-admin-only on all four tables (same pattern as
-- platform_settings / schools-platform policies in 011_v12_platform.sql
-- and the public.is_platform_admin() helper from 004_v5_features.sql).
-- No policy at all for anon/authenticated school users -> default deny.
-- ============================================================
alter table public.partners enable row level security;
alter table public.partner_referrals enable row level security;
alter table public.partner_payout_config enable row level security;
alter table public.partner_payout_events enable row level security;

drop policy if exists "platform admin only" on public.partners;
create policy "platform admin only" on public.partners for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "platform admin only" on public.partner_referrals;
create policy "platform admin only" on public.partner_referrals for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "platform admin only" on public.partner_payout_config;
create policy "platform admin only" on public.partner_payout_config for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "platform admin only" on public.partner_payout_events;
create policy "platform admin only" on public.partner_payout_events for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ============================================================
-- 5. Payout trigger — mirrors the pattern of public.credit_referrer_on_payment()
--    in 019_v30_referral_trial.sql, but for the partner program.
--
--    Fires on insert/update of subscription_events. Only acts on rows that look
--    like a confirmed PLAN purchase (plan_id set, amount set) — this naturally
--    excludes parent fee payments (refKind 'fee' rows never carry plan_id) and
--    failed/pending states. See PARTNER_PROGRAM_REPORT.md for the one real
--    assumption here: subscription_events amounts are always the live cash
--    amount IntaSend charged, never a reward/credit-funded amount, because the
--    sibling school-to-school referral program never creates a
--    subscription_events row for its free-Premium grants (credit_referrer_on_payment
--    patches public.schools directly). If a future payment path starts writing
--    reward-funded rows into subscription_events, this function will need a
--    "funded_by_reward" flag to keep excluding them.
-- ============================================================
create or replace function public.partner_process_payment() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cfg public.partner_payout_config%rowtype;
  pr public.partner_referrals%rowtype;
  tier numeric;
  comm numeric;
begin
  if NEW.school_id is null or NEW.plan_id is null or NEW.amount is null or NEW.amount <= 0 then
    return NEW;
  end if;
  if upper(coalesce(NEW.state, '')) not in ('COMPLETE', 'COMPLETED', 'PAID', 'APPLIED') then
    return NEW;
  end if;

  select * into pr from public.partner_referrals where school_id = NEW.school_id limit 1;
  if not found then
    return NEW; -- this school was not referred by a partner
  end if;

  select * into cfg from public.partner_payout_config where id = 1;
  if not found then
    return NEW; -- config missing, nothing to compute against
  end if;

  if pr.first_payment_confirmed_at is null then
    -- First confirmed payment ever for this school -> onboarding bonus, tiered by plan.
    update public.partner_referrals
      set first_payment_confirmed_at = now()
      where id = pr.id;

    tier := case lower(coalesce(NEW.plan_id, ''))
      when 'basic' then cfg.bonus_basic
      when 'premium' then cfg.bonus_premium
      when 'pro' then cfg.bonus_pro
      else cfg.bonus_basic
    end;

    insert into public.partner_payout_events
      (partner_id, school_id, type, amount, source_payment_id, status)
    values
      (pr.partner_id, NEW.school_id, 'signup_bonus', tier, NEW.id, 'pending_approval')
    on conflict (source_payment_id, type) do nothing;
  else
    -- Lifetime override commission on every subsequent confirmed purchase.
    comm := round((NEW.amount * cfg.commission_pct / 100.0)::numeric, 2);
    if comm > 0 then
      insert into public.partner_payout_events
        (partner_id, school_id, type, amount, source_payment_id, status)
      values
        (pr.partner_id, NEW.school_id, 'commission', comm, NEW.id, 'pending_approval')
      on conflict (source_payment_id, type) do nothing;
    end if;
  end if;

  return NEW;
end $$;

drop trigger if exists trg_partner_process_payment on public.subscription_events;
create trigger trg_partner_process_payment
  after insert or update on public.subscription_events
  for each row execute function public.partner_process_payment();

-- ============================================================
-- 6. Signup-time linking: extend handle_new_staff_inline (re-created here from its
--    latest version in 025_v51_security.sql) to accept an optional
--    meta->>'referred_by_partner_code' and create the partner_referrals row.
--    Mirrors how meta->>'referral_code' (school-to-school) already works —
--    left completely unchanged below.
-- ============================================================
create or replace function public.handle_new_staff_inline(uid uuid, uemail text, meta jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  sid uuid; code text; r text; lvl text; ref text; partner_code text; pid uuid;
begin
  if coalesce(meta->>'school_name', '') <> '' then
    loop
      code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12));
      exit when not exists (select 1 from public.schools where school_code = code);
    end loop;
    lvl := meta->>'school_level';
    if lvl not in ('primary', 'secondary', 'combined') then lvl := 'primary'; end if;
    ref := nullif(trim(coalesce(meta->>'referral_code', '')), '');
    insert into public.schools (school_name, school_code, school_level, referred_by_code)
      values (trim(meta->>'school_name'), code, lvl, ref) returning id into sid;
    if ref is not null then
      insert into public.referral_signups (referral_code, school_id) values (upper(ref), sid);
    end if;

    -- Partner cash-referral program (separate from the school-to-school code above)
    partner_code := nullif(upper(trim(coalesce(meta->>'referred_by_partner_code', ''))), '');
    if partner_code is not null then
      select id into pid from public.partners where upper(referral_code) = partner_code and status = 'active';
      if pid is not null then
        insert into public.partner_referrals (partner_id, school_id, referred_at)
        values (pid, sid, now())
        on conflict (school_id) do nothing;
      end if;
    end if;

    insert into public.users (id, school_id, email, full_name, role, status)
      values (uid, sid, uemail, coalesce(nullif(meta->>'full_name', ''), 'Principal'), 'Principal', 'active');
  else
    select id into sid from public.schools where school_code = upper(trim(coalesce(meta->>'school_code', '')));
    if sid is null then
      raise exception 'Invalid school details';
    end if;
    r := meta->>'role';
    if r not in ('Teacher', 'Secretary') then r := 'Teacher'; end if;
    insert into public.users (id, school_id, email, full_name, role, status)
      values (uid, sid, uemail, coalesce(nullif(meta->>'full_name', ''), 'Staff'), r, 'pending');
  end if;
end $$;

-- ============================================================
-- 7. Public, no-login partner stats — exposes ONLY one partner's own aggregated
--    numbers, looked up by their unguessable referral_code (same trust model as
--    a Stripe-style shareable dashboard link). Never exposes the partners table
--    itself, so the code cannot be used to enumerate or see other partners.
-- ============================================================
create or replace function public.get_partner_stats(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p public.partners%rowtype;
  schools_count int;
  confirmed_count int;
  pending_total numeric;
  paid_total numeric;
begin
  select * into p from public.partners where upper(referral_code) = upper(trim(coalesce(p_code, '')));
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Partner code not found');
  end if;

  select count(*) into schools_count from public.partner_referrals where partner_id = p.id;
  select count(*) into confirmed_count from public.partner_referrals
    where partner_id = p.id and first_payment_confirmed_at is not null;
  select coalesce(sum(amount), 0) into pending_total from public.partner_payout_events
    where partner_id = p.id and status in ('pending_approval', 'approved');
  select coalesce(sum(amount), 0) into paid_total from public.partner_payout_events
    where partner_id = p.id and status = 'paid';

  return jsonb_build_object(
    'ok', true,
    'full_name', p.full_name,
    'referral_code', p.referral_code,
    'status', p.status,
    'schools_referred', schools_count,
    'schools_confirmed', confirmed_count,
    'pending_payout', pending_total,
    'paid_lifetime', paid_total
  );
end $$;

grant execute on function public.get_partner_stats(text) to anon, authenticated;
