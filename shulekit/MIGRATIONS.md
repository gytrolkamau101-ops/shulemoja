# ShuleMoja SQL migrations

## Layout

| Path | Purpose |
|------|---------|
| `migrations/000_schema_migrations.sql` | Ledger table `schema_migrations` |
| `migrations/001_*.sql` … `030_*.sql` | Ordered schema + policies (canonical) |
| Root `01_schema.sql` … | **Legacy copies** — same content; prefer `migrations/` |

## Apply (new school / empty Supabase project)

In Supabase SQL editor, run **in numeric order**:

1. `migrations/000_schema_migrations.sql`
2. `migrations/001_schema.sql`
3. … through `migrations/030_v63_policies.sql`

After each file succeeds:

```sql
insert into public.schema_migrations (id, notes)
values ('001_schema.sql', 'applied')
on conflict (id) do nothing;
```

Or use the helper at the bottom of `migrations/APPLY_HELPER.sql`.

## Existing school (already running)

Do **not** re-run 001–025 blindly. Check:

```sql
select * from public.schema_migrations order by id;
```

If the table does not exist, run `000` only, then apply **only missing** files from 026+ (or the last policies you know were not applied). When unsure, run `sql/verify_rls.sql` and fix gaps.

## Record that a full baseline was applied

```sql
insert into public.schema_migrations (id, notes)
select f, 'baseline mark'
from unnest(array[
  '000_schema_migrations.sql','001_schema.sql','002_parent_portal.sql','003_security_fixes.sql',
  '004_v5_features.sql','005_v6_features.sql','006_debug_fixes.sql','007_features_pack.sql',
  '008_remaining_features.sql','009_security_patch.sql','010_v10_features.sql','011_v12_platform.sql',
  '012_v13_plans.sql','013_v14_fixes.sql','014_pricing.sql','015_security_payments.sql',
  '016_payment_log.sql','017_media_columns.sql','018_premium_parent.sql','019_v30_referral_trial.sql',
  '020_v34_support.sql','021_v37_streams_status.sql','022_v38_modules.sql','023_v41_status_fix.sql',
  '024_v47_subject_games.sql','025_v51_security.sql','026_v54_parent_school_pay.sql','027_v55_fixes.sql',
  '028_v57_parent_revoke.sql','029_v61_term_billing_fix.sql','030_v63_policies.sql'
]) as f
on conflict (id) do nothing;
```

Only use baseline mark when you are certain those migrations were already applied.
