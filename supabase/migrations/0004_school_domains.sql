-- Several schools or campuses in one database, told apart by web address.
-- A request to one of a school's domains sees only that school's rooms,
-- sections, checks, staff and admins. Unknown addresses (local development,
-- previews) use the school named by the SCHOOL_SLUG setting.
alter table schools add column if not exists domains text[] not null default '{}';
create index if not exists schools_domains on schools using gin (domains);

update schools
set domains = array['twelve.keystonelabs.site', 'twelve-self.vercel.app']
where slug = 'main' and domains = '{}';
