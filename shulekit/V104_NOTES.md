# ShuleMoja v104

## P0
- Student fees: structure, payments, balances, class fee PDF, WhatsApp receipt (retained/hardened)
- Exams: exam types (CAT, midterm, end-term, project, SBA), CBC level EE/ME/AE/BE, delete exam
- Report cards: CBC band wording on legend

## P1
- School finance hub tabs: Overview · Capitation · Other funds · Projects · In-kind · Expenses
- Capitation: inflow + vote-head spend + balance + CSV
- General receipts: PTA, donor, CDF, other income
- Projects: budget vs raised vs spent
- In-kind: item, qty, unit, estimated value
- Migration: `migrations/036_school_funds_projects.sql`

## P2 (light)
- Overview by-source totals; term summary CSV export
- Project roll-up on overview

## Money rule
Tracking and records only. School Paybill/bank never held by platform.
