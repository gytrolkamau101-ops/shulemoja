-- Optional: after manually pasting a migration file, record it:
-- insert into public.schema_migrations (id) values ('030_v63_policies.sql') on conflict do nothing;

-- List pending (compare to repo migrations/ filenames)
select id, applied_at from public.schema_migrations order by id;
