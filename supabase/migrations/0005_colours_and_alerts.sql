-- QR card colour per group, alert e-mail opt-in per admin, and a log so each
-- "no report" alert is e-mailed once per round per day. Safe to run more than once.

alter table groups add column if not exists qr_theme text not null default 'midnight'
  check (qr_theme in ('midnight', 'ember', 'ice', 'rose'));

alter table admins add column if not exists email_alerts boolean not null default true;

create table if not exists alert_log (
  school_id   uuid not null references schools(id) on delete cascade,
  local_date  date not null,
  kind        text not null,               -- e.g. 'missing:<round id>'
  sent_at     timestamptz not null default now(),
  primary key (school_id, local_date, kind)
);
alter table alert_log enable row level security;

-- starting colours for the first school: 1st Year Midnight, 2nd Year Rose
update groups g set qr_theme = 'rose'
from schools s
where g.school_id = s.id and s.slug = 'main' and g.name = '2nd Year';
