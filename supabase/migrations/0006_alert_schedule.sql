-- Every 5 minutes, ask TWELVE to e-mail "no report" alerts for rounds whose
-- deadline has passed. TWELVE sends each round's alert at most once a day.
-- If you use another address, change it below. Run once in the SQL Editor.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('twelve-alerts') where exists (select 1 from cron.job where jobname = 'twelve-alerts');
select cron.schedule(
  'twelve-alerts',
  '*/5 * * * *',
  $$ select net.http_get(url := 'https://twelve.keystonelabs.site/api/cron/alerts') $$
);
