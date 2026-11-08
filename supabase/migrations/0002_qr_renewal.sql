-- QR renewal: when each room's QR was made, and how often to renew automatically.
-- Safe to run more than once; 0001_init.sql already includes these for fresh setups.
alter table schools add column if not exists qr_rotate_days int not null default 0
  check (qr_rotate_days between 0 and 365);  -- 0 = only when the admin clicks
alter table rooms add column if not exists qr_issued_at timestamptz not null default now();
