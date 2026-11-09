# TWELVE

A live reminder system for test invigilation, by **Keystone Labs**.
Teachers scan the QR code in their room and are walked through each check, one card at a time.
Problems and rooms with no report reach the principal instantly.

Planned address: `twelve.keystonelabs.site`

## Stack

TypeScript · Next.js 16 (App Router) · Tailwind CSS · Supabase · Vercel · Resend

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Pages

- `/r/<qr-token>` · what a teacher sees after scanning a room QR
- `/board` · principal's live board
- `/login` · sign in
- `/admin` · edit school, groups, rooms, sections, rounds, checks, staff, admins; print QR codes
- `/demo` · links to every room for testing

Sign-in: only emails listed in Admin → Staff (teachers) or Admin → Admins (principal,
coordinators) can sign in, with Google or an emailed code. Without Supabase keys the app
runs on sample data with no sign-in, for local demos.

## Docs

- [Product & technical spec](docs/SPEC.md)
- [Supabase setup](docs/SUPABASE_SETUP.md)
