# Supabase setup (one time)

Without these steps the app runs on in-memory sample data. After them, every
report is saved in Supabase.

## 1. Create the project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Name: `twelve` · Region: **South Asia (Mumbai)** (closest to Pakistan).
3. Set a strong database password and keep it in your password manager.
4. Wait about 2 minutes for the project to start.

## 2. Create the tables

1. In the project, open **SQL Editor** → **New query**.
2. Paste all of `supabase/migrations/0001_init.sql` → **Run**. Expect "Success. No rows returned".
3. New query again, paste all of `supabase/seed.sql` → **Run**.
4. Open **Table Editor**: you should see `rooms` (51 rows), `checks` (7), `staff` (33), `schools` (1).

## 3. Add the keys to the app (on your laptop only)

1. In Supabase open **Project Settings → API Keys** (or **Data API**).
2. In the TWELVE folder, copy `.env.example` to a new file named `.env.local`.
3. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` = the **Project URL**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the **anon / publishable** key
   - `SUPABASE_SERVICE_ROLE_KEY` = the **service_role / secret** key
   - `SCHOOL_SLUG=main`
4. Save. `.env.local` is ignored by git and never leaves your laptop.
   **Never paste the service_role key into chat, GitHub or anywhere public.**
5. Stop the dev server (Ctrl + C) and start it again: `npm run dev`.

## 4. Check it works

- Open http://localhost:3000/board — loading the sample day should now say
  it was saved to Supabase, and rows appear in the `reports` table.
- QR links change: each room now has a random `qr_token` (see the `rooms` table),
  so the `/demo` page lists the new links.

## Later

- Replace placeholder staff with real names in **Table Editor → staff**.
- Rename the school in **Table Editor → schools**.
