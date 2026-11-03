# School go-live checklist (ShuleMoja)

Complete **before** handing credentials to staff. Same security model as production web.

## 1. Database

- [ ] Supabase project created; API URL + anon key in app `.env`
- [ ] Ran `migrations/000_schema_migrations.sql`
- [ ] Ran `migrations/001` → `030` in order **or** confirmed baseline already applied
- [ ] `sql/verify_rls.sql` — core tables show `rls_enabled = true` and policy_count > 0
- [ ] Functions `my_school_id` and `my_role` exist

## 2. Auth & roles

- [ ] First Principal account can sign in
- [ ] Principal creates Staff with correct roles (Secretary, Teacher, …)
- [ ] Teacher **cannot** open School Finance / Setup Staff / Audit
- [ ] Secretary **cannot** open Setup → Staff, Payments, Promotion, Audit
- [ ] Soft-delete student works without raw RLS errors (v63 policies)

## 3. School setup

- [ ] School identity (name, logo optional)
- [ ] At least one **Term** marked current
- [ ] Grades seeded or created
- [ ] Fee structure for current term (per grade)
- [ ] Paybill / Till recorded under Payments (Principal)

## 4. Finance smoke test

- [ ] Record a test fee payment online
- [ ] Balance = term fee + arrears − paid
- [ ] Offline: toggle airplane mode, record payment, reconnect, **Sync now**

## 5. Parent & messaging

- [ ] Parent link / notice flow smoke-tested if used
- [ ] No national ID required on free tier unless school policy demands it

## 6. App install (PWA)

- [ ] HTTPS production URL opens
- [ ] **Install app** appears (Chrome/Android) or Add to Home Screen (iOS)
- [ ] Offline banner appears when network cut; queue persists

## 7. Sign-off

| Item | Name | Date |
|------|------|------|
| Technical apply | | |
| Principal acceptance | | |

**Do not** go live if RLS is off on `students`, `fee_payments`, or `users`.
