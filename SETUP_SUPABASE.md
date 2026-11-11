# Supabase setup (school project)

Use **one script** for everything the trimmed app needs (auth roles, clubs, coaches, athletes, membership, training, attendance, performance, announcements, tournaments).

---

## Fresh or incomplete database

### 1. Create demo Auth users

**Authentication → Users → Add user** (Auto Confirm ON):

| Email | Password | Then run |
|---|---|---|
| `demo.admin@clubdee.com` | `Demo123456!` | `scripts/seed-demo-admin.sql` (or covered by FULL_SETUP) |
| `demo.coach@clubdee.com` | `Demo123456!` | linked by FULL_SETUP / `seed-demo-coach.sql` |

Athletes self-register in the app.

**Admin-only (if auth user already exists):** SQL Editor → `scripts/seed-demo-admin.sql`

### 2. Run the full SQL

**SQL Editor** → paste and run:

**`scripts/FULL_SETUP.sql`**

Safe to re-run. Creates tables, RLS, helper RPCs, demo clubs, and links admin/coach.

> Note: demo coach is linked to **3 clubs** (3 rows in `coaches`). That is expected. The app must use `.limit(1)` / `getPrimaryCoachProfile` — not `.single()`.

### 3. Auth URL settings

**Authentication → URL Configuration**

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/**`

**Required for local/demo testing:** **Providers → Email** → **Confirm email OFF**.

If Confirm email stays ON, every signup sends a mail and Supabase’s free-tier **email rate limit** kicks in quickly (“Too many sign-up attempts”). Fake/random addresses also cannot receive OTP. Turn it back ON for production later.

### 4. Restart the app

```bash
npm run dev
```

### 5. Smoke test

1. Login as `demo.coach@clubdee.com` / `Demo123456!`
2. Register a new athlete → submit membership
3. Coach → **Applications** → **Approve** (creates `athletes` row)
4. Athlete can use schedule / attendance / performance after coach adds data

---

## What `FULL_SETUP.sql` covers

| Module | Tables / RPCs |
|---|---|
| Auth | `profiles`, `user_roles`, `login_sessions`, `is_admin` / `is_coach` / `is_athlete` |
| Clubs | `clubs` (+ demo IDs `…0001`–`…0003`) |
| Membership | `membership_applications`, `coaches`, `athletes`, `check_duplicate_pending_application`, `update_application_status`, `add_activity_log` |
| Training | `training_sessions`, `attendance` |
| Performance | `performance_records` |
| Announcements | `announcements`, `announcement_reads` |
| Tournaments | `tournaments`, `tournament_participants` |

Older numbered scripts (`01-…`, `school-bootstrap.sql`, etc.) are optional leftovers — prefer **`FULL_SETUP.sql`** only.

---

## Common errors

| Symptom | Cause / fix |
|---|---|
| `Could not find the table 'public.athletes'` | Run `FULL_SETUP.sql` |
| `column clubs.sport_type does not exist` | Run `FULL_SETUP.sql` |
| Coach profile not found / multiple rows | Coach is seeded for 3 clubs; app uses `.limit(1)` |
| No clubs / empty club select | Seed section of `FULL_SETUP.sql` |
| Approve puts wrong email on athlete | Fixed in app: uses applicant `profiles.email` |

---

## Email notes

- Avoid `test@test.com` (Supabase rejects it)
- Confirmation links expire → disable Confirm email for school demos if needed
