-- Create a new school or campus in this database.
-- 1. Change the four values in the "settings" block.
-- 2. Run in Supabase → SQL Editor.
-- 3. Point the web address at Vercel (Vercel → Domains, plus a DNS record).
-- The new school starts with a copy of the rounds and checks of the school
-- named in copy_from, and one owner. Everything else (rooms, sections, staff,
-- more admins) is added in the app at <web address>/admin. All rows are
-- ordinary rows and can be edited or deleted there.
do $$
declare
  -- settings ---------------------------------------------------------------
  new_slug    text := 'campus2';                       -- short id, no spaces
  new_name    text := 'Campus 2';                      -- shown in the app
  new_domain  text := 'campus2.twelve.keystonelabs.site';
  owner_email text := 'principal@example.com';         -- first person who can sign in
  copy_from   text := 'main';                          -- copy rounds and checks from
  ---------------------------------------------------------------------------
  sid uuid;
  src uuid;
begin
  insert into schools (slug, name, domains) values (new_slug, new_name, array[new_domain])
  returning id into sid;

  insert into admins (school_id, name, email, role) values (sid, 'Owner', lower(owner_email), 'owner');

  select id into src from schools where slug = copy_from;
  if src is not null then
    insert into rounds (school_id, name, start_time, counts_kind, sort)
    select sid, name, start_time, counts_kind, sort from rounds where school_id = src;

    insert into checks (school_id, round_id, audience, instruction, question, min_seconds, active, sort)
    select sid, nr.id, c.audience, c.instruction, c.question, c.min_seconds, c.active, c.sort
    from checks c
    join rounds r on r.id = c.round_id
    join rounds nr on nr.school_id = sid and nr.name = r.name
    where c.school_id = src and c.active;
  end if;
end $$;
