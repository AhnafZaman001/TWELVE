-- TWELVE: initial schema.
-- Every table carries school_id so more schools can be added later.
-- RLS is on everywhere with no public policies: the app talks to the database
-- only from the server, with the service-role key. Member policies come with login.

create table schools (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  timezone        text not null default 'Asia/Karachi',
  start_time      text not null default '07:50',   -- HH:MM, school-local
  round2_time     text not null default '08:15',
  end_time        text not null default '08:40',
  buffer_minutes  int  not null default 20 check (buffer_minutes between 0 and 120),
  created_at      timestamptz not null default now()
);

create table rooms (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  code          text not null,                     -- 'K-4'
  section       text,                              -- 'F-1A', null = no test here
  is_test_room  boolean not null default false,
  qr_token      text not null unique default replace(gen_random_uuid()::text, '-', ''),
  sort          int not null default 0,
  active        boolean not null default true,
  unique (school_id, code)
);

create table checks (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  slug         text not null,
  round        smallint not null check (round in (1, 2)),
  audience     text not null check (audience in ('invigilator', 'floor_incharge', 'both')),
  instruction  text not null,
  question     text not null,
  min_seconds  int not null default 8 check (min_seconds between 0 and 120),
  sort         int not null default 0,
  active       boolean not null default true,
  unique (school_id, slug)
);

create table staff (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('teacher', 'floor_incharge')),
  active     boolean not null default true
);

create table reports (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid not null references schools(id) on delete cascade,
  room_id               uuid not null references rooms(id),
  staff_id              uuid not null references staff(id),
  role                  text not null check (role in ('invigilator', 'floor_incharge')),
  round                 smallint not null check (round in (1, 2)),
  local_date            date not null,             -- school-local test day
  arrived_at            timestamptz not null,
  received_at           timestamptz not null default now(),
  problems              text[] not null default '{}',
  total                 int,
  present               int,
  absent                int,
  late                  int,
  non_attempting        int,
  non_attempting_names  text
);
create index reports_school_day on reports (school_id, local_date);

create table answers (
  id              uuid primary key default gen_random_uuid(),
  report_id       uuid not null references reports(id) on delete cascade,
  check_id        uuid not null references checks(id),
  result          text not null check (result in ('done', 'skipped')),
  seconds_on_card int not null default 0
);
create index answers_report on answers (report_id);

-- Admin logins (principal, coordinators), used once Supabase Auth is added.
create table members (
  user_id    uuid not null references auth.users(id) on delete cascade,
  school_id  uuid not null references schools(id) on delete cascade,
  role       text not null check (role in ('owner', 'admin', 'coordinator')),
  primary key (user_id, school_id)
);

alter table schools enable row level security;
alter table rooms   enable row level security;
alter table checks  enable row level security;
alter table staff   enable row level security;
alter table reports enable row level security;
alter table answers enable row level security;
alter table members enable row level security;
