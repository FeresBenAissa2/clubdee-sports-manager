# ClubDee (school trim) — Sports Club PWA

Next.js sports club app trimmed to **6 business modules** for a team of 6.

See **[MODULES.md](./MODULES.md)** for the module map.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript  
- **Tailwind CSS** + shadcn/ui  
- **Supabase** (Auth + **PostgreSQL** + Storage)  
- **PWA** (`next-pwa`)  
- Deploy-ready for Vercel  

## Modules

1. Auth & User Management  
2. Membership Approval  
3. Training & Attendance  
4. Performance Tracking  
5. Announcements  
6. Tournaments  

## How to run

### Prerequisites

- Node.js **18+** (20+ recommended)  
- npm  
- A free [Supabase](https://supabase.com) project  

### 1. Install

```bash
npm install
```

### 2. Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Keys: Supabase Dashboard → **Project Settings → API**.

### 3. Database

Apply SQL migrations (bash / Git Bash / WSL on Windows):

```bash
# Link CLI once (optional)
npx supabase link

# Or run the bundled migration helper if configured for your project:
./scripts/auto-migrate.sh
```

If shell scripts fail on Windows, open Supabase **SQL Editor** and run the core scripts under `scripts/` in numeric order (start with `01-schema-only.sql`, `02-auth-functions-and-rls.sql`, then membership / sessions / attendance / performance / announcements / tournaments scripts).

### 4. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Useful scripts

```bash
npm run build    # production build
npm run start    # run production build
npm run lint     # eslint
npm test         # vitest (optional)
```

## Project structure (trimmed)

```
app/
  login, register, register-membership, pending-approval, auth/
  dashboard/
    admin/     → Module 1 (users/clubs) + oversight of training
    coach/     → Modules 2–6 for coaches
    athlete/   → Modules 2–5 for athletes
  api/         → server routes for membership, sessions, admin users
components/
  auth, admin, coach, athlete, membership, ui, layout
lib/
  auth, admin, coach, athlete, membership, supabase, integration, utils
public/        → PWA assets / icons
scripts/       → PostgreSQL migrations
MODULES.md     → module ownership map
```

## Roles

| Role | Access |
|------|--------|
| Admin | Clubs, coaches, athletes, sessions overview, settings |
| Coach | Membership review, sessions, attendance, performance, announcements, tournaments |
| Athlete | Apply/membership status, schedule, attendance, performance, announcements, profile |

## Notes for the school project

- Keep **PostgreSQL/Supabase** (no MongoDB migration required).  
- Each member owns one module in `MODULES.md`.  
- Do not re-introduce removed overlapping features unless the whole team agrees.  
