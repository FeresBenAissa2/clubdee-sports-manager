# School project — 6 modules

Trimmed from ClubDee for a 6-member Next.js / PWA course project.
Database stays on **PostgreSQL (Supabase)**.

## Module map (no overlap)

| # | Module | Owner focus | Main routes |
|---|---|---|---|
| 1 | **Auth & User Management** | Login/register, roles (admin/coach/athlete), clubs, create users, profiles | `/login`, `/register`, `/auth/*`, `/dashboard/admin/{clubs,coaches,athletes,create-user,settings}` |
| 2 | **Membership Approval** | Athlete applies to a club; coach approves/rejects | `/register-membership`, `/pending-approval`, `/*/applications` |
| 3 | **Training & Attendance** | Sessions schedule + mark attendance (incl. QR where present) | `/*/sessions`, `/*/schedule`, `/*/attendance` |
| 4 | **Performance Tracking** | Physical test records & analytics (not goals/assignments) | `/*/performance` |
| 5 | **Announcements** | Club news / pinned / priority posts | `/*/announcements` |
| 6 | **Tournaments** | Competition events (distinct from regular training sessions) | `/dashboard/coach/tournaments` |

## Explicitly removed (overlap or out of scope)

- Parent portal  
- Home training logs  
- Activity check-in (separate from session attendance)  
- Leave requests  
- Goals / feedback / progress reports / training assignments  
- Standalone push-notification module  
- Enterprise admin: feature flags, rate-limit UI, audit UI, devices, monitoring dashboards  
- OpenAPI / event-schema packs / heavy docs archive  

## Why these 6 are distinct

1. Auth = who you are / who can manage users  
2. Membership = join workflow before club access  
3. Training = recurring practice calendar + presence  
4. Performance = measured test results over time  
5. Announcements = one-way club communication  
6. Tournaments = competitive events, not weekly practice  
