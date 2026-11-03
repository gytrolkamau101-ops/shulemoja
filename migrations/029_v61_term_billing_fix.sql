-- ShuleMoja v61 — align "one billing cycle" with one Kenyan school term (~90 days / 13 weeks)
-- Fixes:
--  1) student_enrollments was missing stream_id, even though Admissions.jsx (and the
--     grade/stream model introduced in 22_v37_streams_status.sql) inserts it. This made
--     "Accept"/"Enroll" on an admission fail with a Postgres "column does not exist" error.
--  2) credit_referrer_on_payment() granted a free premium reward for 120 days (~4 months),
--     which doesn't line up with a single ~90-day term. Re-created with 90 days so referral
--     rewards and paid plan cycles (see netlify/functions/intasend-webhook.js, also fixed to
--     90 days) both represent "one term" consistently.

alter table public.student_enrollments
  add column if not exists stream_id uuid references public.streams(id) on delete set null;

create or replace function public.credit_referrer_on_payment(p_school_id uuid, p_plan_id text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  invitee public.schools%rowtype;
  inviter public.schools%rowtype;
  add_pts int := 100;
  new_credits int;
  granted boolean := false;
begin
  select * into invitee from public.schools where id = p_school_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'school not found');
  end if;
  if invitee.referred_by_school_id is null and invitee.referred_by_code is not null then
    select id into invitee.referred_by_school_id
      from public.schools where upper(referral_code) = upper(invitee.referred_by_code) limit 1;
    if invitee.referred_by_school_id is not null then
      update public.schools set referred_by_school_id = invitee.referred_by_school_id where id = p_school_id;
    end if;
  end if;
  if invitee.referred_by_school_id is null then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'no_referrer');
  end if;
  select * into inviter from public.schools where id = invitee.referred_by_school_id;
  if not found then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'inviter_missing');
  end if;
  if lower(coalesce(inviter.plan, '')) not in ('premium', 'trial', 'pro', 'yearly') then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'inviter_not_premium');
  end if;
  if coalesce(inviter.lifetime_invite_count, 0) >= 6 then
    return jsonb_build_object('ok', true, 'credited', false, 'reason', 'invite_cap');
  end if;
  new_credits := coalesce(inviter.referral_credits, 0) + add_pts;
  update public.schools set
    referral_credits = new_credits,
    lifetime_invite_count = coalesce(lifetime_invite_count, 0) + 1
  where id = inviter.id;

  insert into public.referral_signups (referral_code, school_id)
  values (inviter.referral_code, p_school_id)
  on conflict do nothing;

  if new_credits >= 300 and coalesce(inviter.free_premium_grants, 0) < 2 then
    update public.schools set
      referral_credits = new_credits - 300,
      free_premium_grants = coalesce(free_premium_grants, 0) + 1,
      plan = 'premium',
      plan_expires_at = greatest(coalesce(plan_expires_at, now()), now()) + interval '90 days',
      student_cap = greatest(coalesce(student_cap, 250), 500)
    where id = inviter.id;
    granted := true;
  end if;

  return jsonb_build_object(
    'ok', true,
    'credited', true,
    'new_credits', new_credits,
    'free_premium_granted', granted
  );
end;
$$;
