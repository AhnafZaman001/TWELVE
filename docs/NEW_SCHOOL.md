# Adding another school or campus

Nothing about a school is fixed in code. There are two ways to add one.

## A. Same database, own web address (recommended)

Each school or campus has its own address, e.g. `campus2.twelve.keystonelabs.site`
or the college's own domain. TWELVE recognises the address and shows only that
school's rooms, sections, checks, staff and admins.

Logins are per school: an email listed at one school gets "No access" at another
unless that school lists it too. Every school has its own owner and admins.

1. Open `supabase/new_school.sql`, change the settings (slug, name, address,
   owner email), and run it in Supabase → SQL Editor. The new school starts with
   a copy of the rounds and checks of an existing school.
2. Vercel → twelve → Settings → Domains → Add Existing → the new address.
3. Add the DNS record Vercel shows (at Namecheap for keystonelabs.site).
4. Supabase → Authentication → URL Configuration → add `https://<address>/**`.
5. Google Cloud → Google Auth Platform → Branding → add the domain to
   Authorised domains if it is not under keystonelabs.site.
6. The owner signs in at `https://<address>/admin` and adds rooms, sections,
   staff (Import from Excel) and other admins.

## B. Completely separate database

For a college whose data must be kept fully apart:

1. Create a new Supabase project and run `supabase/migrations/*.sql` in order,
   then `supabase/seed.sql` (or `new_school.sql`).
2. Create a new Vercel project from the same GitHub repo, with that project's
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `SCHOOL_SLUG` and `CRON_SECRET`.
3. Set up its domain, Supabase URL configuration and Google sign-in as in
   `SUPABASE_SETUP.md`.

The same code runs both ways; only settings and data differ.
