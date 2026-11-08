-- TWELVE schema. Nothing school-specific lives here: groups, rooms, sections,
-- rounds, checks and staff are ordinary rows edited from the admin screen.
-- Rows added by SQL are identical to rows added in the app.
--
-- Anything can be deleted: reports keep a copy of the names they refer to
-- (room code, section, staff, round, question), and their links become null.
--
-- RLS is on with no public policies: only the TWELVE server (service-role key)
-- reads and writes. Member policies come with admin login.

create table schools (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  timezone        text not null default 'Asia/Karachi',
  end_time        text not null default '08:40',          -- HH:MM, school-local
  buffer_minutes  int  not null default 20 check (buffer_minutes between 0 and 240),
  test_weekdays   int[] not null default '{1,3,5}',       -- 1 = Monday … 7 = Sunday
  created_at      timestamptz not null default now()
);

create table groups (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  name       text not null,
  sort       int not null default 0
);

create table rooms (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  code       text not null,
  qr_token   text not null unique default replace(gen_random_uuid()::text, '-', ''),
  active     boolean not null default true,
  sort       int not null default 0
);

create table sections (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  name       text not null,
  group_id   uuid references groups(id) on delete set null,
  room_id    uuid references rooms(id) on delete set null,
  active     boolean not null default true,
  sort       int not null default 0
);

create table rounds (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  name         text not null,
  start_time   text not null,                               -- HH:MM
  counts_kind  text not null default 'none' check (counts_kind in ('none', 'attendance', 'non_attempting')),
  sort         int not null default 0
);

create table checks (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  round_id     uuid references rounds(id) on delete cascade,
  audience     text not null default 'both' check (audience in ('invigilator', 'floor_incharge', 'both')),
  instruction  text not null default '',
  question     text not null,
  min_seconds  int not null default 8 check (min_seconds between 0 and 300),
  active       boolean not null default true,
  sort         int not null default 0
);

create table staff (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  full_name  text not null,
  role       text not null default 'teacher' check (role in ('teacher', 'floor_incharge')),
  active     boolean not null default true
);

create table reports (
  id                    uuid primary key default gen_random_uuid(),
  school_id             uuid not null references schools(id) on delete cascade,
  room_id               uuid references rooms(id) on delete set null,
  section_id            uuid references sections(id) on delete set null,
  staff_id              uuid references staff(id) on delete set null,
  round_id              uuid references rounds(id) on delete set null,
  room_code             text not null,                      -- copies, kept for history
  section_name          text,
  staff_name            text not null,
  round_name            text not null,
  role                  text not null check (role in ('invigilator', 'floor_incharge')),
  local_date            date not null,                      -- school-local test day
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
  check_id        uuid references checks(id) on delete set null,
  question        text not null,                            -- copy, kept for history
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

alter table schools  enable row level security;
alter table groups   enable row level security;
alter table rooms    enable row level security;
alter table sections enable row level security;
alter table rounds   enable row level security;
alter table checks   enable row level security;
alter table staff    enable row level security;
alter table reports  enable row level security;
alter table answers  enable row level security;
alter table members  enable row level security;
