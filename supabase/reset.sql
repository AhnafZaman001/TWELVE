-- DANGER: deletes all TWELVE tables and their data.
-- Only for a fresh start before real use. Then run migrations/0001_init.sql and seed.sql.
drop table if exists answers, reports, members, checks, rounds, sections, staff, rooms, groups, schools cascade;
