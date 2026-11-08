# TWELVE — Invigilation Check System: Product & Technical Spec

A Keystone Labs product (alongside Axiom and Northline).
Product name: **TWELVE**.
Planned address: `twelve.keystone-labs.site` (subdomain of keystone-labs.site).

---

## 1. What it is

A QR-based **live reminder system for exam/test invigilation**.
A teacher scans the QR code fixed in the room, and the phone walks them through each
invigilation check **one card at a time** ("Walk to the back row — have students drawn
margin lines?"). Each answer is recorded. Problems and missing rooms reach the principal
instantly.

The main goal is **behaviour** (teachers actually doing the checks during the test),
not data collection. Data and alerts come as a by-product.

### Users

| Role | Login? | What they do |
|---|---|---|
| **Invigilator** (teacher) | No — scans QR, taps own name from staff list | Goes through check cards in the room |
| **Floor incharge** | No — scans QR, chooses "Round check" | Extra checks (e.g. teacher intimation about lagging) |
| **Principal / Admin** | Yes | Live dashboard, alerts, reports, settings |
| **Coordinator** | Yes | Same as admin, read-only or limited |
| **Keystone Labs (super admin)** | Yes | Creates schools (later, when multi-school) |

---

## 2. Technology choices

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript** (everywhere) | One language for frontend, backend and database types |
| Framework | **Next.js 16 (App Router)** | Runs natively on Vercel; pages + API in one project |
| Hosting | **Vercel** | Your choice; preview deployments for every change |
| Database | **Supabase Postgres** | Your choice; SQL, row-level security, realtime |
| Auth (admins) | **Supabase Auth** — email magic link + Google sign-in | No passwords for the principal to forget |
| Live updates | **Supabase Realtime** | Dashboard turns rooms green/red the moment a report lands |
| Scheduled jobs | **Vercel Cron** (calls an API route every 5 min) | Runs the "no report after X minutes" check per school |
| Email alerts | **Resend** | Reliable delivery, sent from `alerts@keystone-labs.site` |
| Phone alerts | **Web Push (PWA)** | Admin installs the dashboard to the home screen → real push notifications, free. (Fixes the "self-sent Gmail doesn't ring" problem.) |
| WhatsApp (later, optional) | Meta WhatsApp Cloud API | Paid per message; phase 3 |
| UI | **Tailwind CSS + shadcn/ui**, Framer Motion for card transitions | Fast to build, looks modern on phones |
| Validation | **Zod** | Same rules on phone and server |
| Data access | **supabase-js** with generated TypeScript types | Simple; no extra ORM |
| QR / PDF | `qrcode` + `@react-pdf/renderer` | Printable QR sheets generated in the app |
| Excel export | `exceljs` | Replaces the "Download latest" desk QR |
| Tests | **Vitest** (logic), **Playwright** (teacher flow on a phone-size screen) | |
| Errors | Sentry (free tier) | Know when something breaks on test day |

Single repository (a monorepo is not needed at this size).

---

## 3. Approach

1. **Multi-school data model from day one** (every table has `school_id`), but launch with
   **one school** (yours). Selling to other schools later then needs no rebuild.
2. **Teachers never log in.** The QR contains an unguessable room token:
   `https://twelve.keystone-labs.site/r/<room_token>`. Rate-limited per room and per device.
3. **Checks are data, not code.** The admin edits checks (text, instruction, order,
   timer, round, who sees it) in settings. No developer needed to change a question.
4. **Server decides alerts.** Every answer is saved on the server, which decides if it is a
   problem — the phone cannot fake "no alert".
5. **Keep the Google system running** until the new one is live and tested; then reprint QR codes once.

---

## 4. Teacher experience (the core of the product)

Scan QR → full-screen phone app (no install, opens in the browser):

1. **Welcome card** — "Room K-4 · F-1A · Test period 7:50–8:40". **Tap your name from the staff list**
   (searchable; remembered on this phone next time). Choose **Invigilator** or **Floor incharge (round check)**.
2. **"Are you in the room now?"** → **[ Yes, I'm here ]** (records arrival time).
3. **Check cards, one per screen**, with progress ("Check 3 of 7"):
   - An **action instruction**, not just a question: *"Walk to the back row. Look at 5 answer sheets."*
   - Question: *"Have students drawn margin lines?"*
   - **[ ✅ Done ]** unlocks after a short timer (default 8 seconds, adjustable per check) so nobody taps through.
   - **[ ⏭ Skip ]** = recorded as **not done** → alert (admin's rule).
   - Some checks ask for **a number** instead ("How many students have NOT drawn margins?").
4. **Counts card** — total, present, absent, late, non-attempting (numbers only);
   names box appears only if non-attempting > 0. Present + absent must equal total (checked live).
5. **Done card** — ✅ summary, time taken. Nothing can be edited afterwards.

### Two rounds per test (decided: ON by default, can be switched off per school)
- **Round 1 — Start (7:50):** in room, seating, A/B papers, whiteboard.
- **Round 2 — Mid-test (8:15):** margin lines, underlining, highlighting, non-attempting.
  Opening the QR again after round 1 automatically continues with round 2.
  The missing-report check covers each round separately.

### Floor incharge round
Same QR. Shows floor-incharge checks (e.g. *"Teacher intimation about lagging"*).
Several floor-incharge visits per room are allowed and shown on the dashboard.

---

## 5. Admin experience

- **Live board (today):** grid of all test rooms — grey (waiting), green (all checks done),
  amber (in progress / round 2 pending), red (problem or missing). Updates in real time.
- **Alerts feed:** each problem with room, teacher, what was skipped, time.
- **Reports:** filter by date, room, teacher, year (1st/2nd); open a single report; **export Excel**.
- **Teacher insights (phase 2):** who skips often, who reports late, average time per check.
- **Settings:**
  - Staff list (add / import teachers and floor incharges once)
  - Rooms (K-0 … K-50), sections, which rooms are test rooms
  - Checks editor (text, instruction, timer, type yes/no or number, round, role)
  - Schedule: test days, start time, buffer minutes, holidays
  - Alert recipients (email, push), members (principal, coordinators)
- **QR center:** download printable PDF — one page per room, school name + room + QR.
- **Install as app** on the phone (PWA) → push notifications.

---

## 6. Database (Supabase Postgres)

```
schools            id, name, timezone, created_at
members            id, school_id, user_id (auth.users), role [owner|admin|coordinator]
staff              id, school_id, full_name, role [teacher|floor_incharge], phone, active
rooms              id, school_id, code ('K-4'), section ('F-1A' | null), year [1|2|null],
                   is_test_room, qr_token (unique, random), active
checks             id, school_id, title, instruction, kind [yes_no|number],
                   round [1|2], audience [invigilator|floor_incharge|both],
                   min_seconds, alert_rule (e.g. 'no_or_skip', 'number_gt_0'), sort, active
schedules          id, school_id, weekdays int[], start_time, round2_time, buffer_minutes
holidays           id, school_id, date
sessions           id, school_id, date           -- one per test day (auto-created)
reports            id, session_id, room_id, staff_id, role, round,
                   device_id, arrived_at, submitted_at, status [in_progress|done]
answers            id, report_id, check_id, value_bool, value_number, skipped,
                   seconds_on_card, answered_at
counts             report_id, total, present, absent, late, non_attempting, non_attempting_names
alerts             id, school_id, report_id | null, room_id, type
                   [check_failed|missing_report|counts_mismatch|non_attempting],
                   message, created_at, sent_email, sent_push
push_subscriptions id, user_id, endpoint, keys, created_at
```

**Security (Row Level Security):** members can only read/write rows of their own school.
Teacher submissions go through server API routes that look up the room by `qr_token`
(service role on the server only), never directly from the phone to the database.

---

## 7. Main API routes (Next.js)

| Route | Who | Purpose |
|---|---|---|
| `GET /r/[token]` | teacher | Loads room + today's checks, starts the card flow |
| `POST /api/report/start` | teacher | Creates report (arrival) |
| `POST /api/report/answer` | teacher | Saves one card answer (+ seconds on card) |
| `POST /api/report/finish` | teacher | Saves counts, closes report, evaluates alerts |
| `GET /api/cron/missing` | Vercel Cron, every 5 min | For each school whose start + buffer just passed: list missing rooms → alert |
| `GET /api/export` | admin | Excel export for date range |
| `GET /api/qr-sheet` | admin | Printable QR PDF |

---

## 8. Build phases

| Phase | Contents | Rough time |
|---|---|---|
| **0. Setup** | Repo, Vercel project, Supabase project, subdomain DNS, Resend domain | 1 day |
| **1. MVP (your school)** | Teacher card flow, rounds, alerts (email + push), missing-room check, live board, reports + Excel, QR PDF, settings for rooms/checks/schedule, data seeded with your 51 rooms and checks | 2–3 weeks |
| **2. Pilot** | Run alongside Google system for 1–2 weeks, fix issues, switch QR codes | 1–2 weeks |
| **3. Product** | Teacher insights, multi-school sign-up, billing (Stripe or local payment), landing page on keystone-labs.site, WhatsApp alerts | later |

---

## 9. Running costs (MVP, one school)

- Vercel Hobby/Pro: free to $20/month (Pro recommended once it is a paid product)
- Supabase: free tier is enough for one school; Pro $25/month when selling
- Resend: free up to 3,000 emails/month
- Web Push: free
- Domain: already owned

---

## 10. Decisions

| Decision | Choice |
|---|---|
| Product name | **TWELVE** — `twelve.keystone-labs.site` |
| Rounds per test | **Two** (start 7:50, mid-test ~8:15) |
| Timer on each card | **8 seconds** before "Done" unlocks |
| Teacher identity | **Pick from staff list** (no typing) |
| Alert recipients | Principal (zamankips@gmail.com) by email + push; more can be added in settings |
