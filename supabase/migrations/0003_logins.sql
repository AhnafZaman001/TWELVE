-- Logins. Only people listed here can sign in (Google or email code):
--   staff.email   -> teachers and floor incharges, who report from the room QR
--   admins.email  -> principal / coordinators, who use the board and admin screen
-- Emails are stored lower-case. Safe to run more than once.

alter table staff add column if not exists email text;
create unique index if not exists staff_school_email on staff (school_id, lower(email)) where email is not null;

create table if not exists admins (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  name       text not null default '',
  email      text not null,
  role       text not null default 'admin' check (role in ('owner', 'admin', 'coordinator')),
  unique (school_id, email)
);
alter table admins enable row level security;

-- replaced by admins (it was never used)
drop table if exists members;

-- first owners; add, change or remove admins later in the app (Admin → Admins)
insert into admins (school_id, name, email, role)
select id, a.name, a.email, 'owner'
from schools, (values ('Principal', 'zamankips@gmail.com'), ('Ahnaf', 'ahnaf7624@gmail.com')) as a(name, email)
where slug = 'main'
on conflict (school_id, email) do nothing;
