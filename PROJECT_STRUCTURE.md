# Project Structure

## Overview

```
sports-club-management/
├── app/                          # Next.js App Router
│   ├── dashboard/
│   │   ├── admin/               # Admin pages
│   │   ├── coach/               # Coach pages
│   │   └── athlete/             # Athlete pages
│   ├── parent/                  # Parent portal
│   ├── login/                   # Authentication
│   ├── register/                # Registration
│   └── pending-approval/        # Pending status page
│
├── components/                   # React components
│   ├── ui/                      # shadcn/ui components
│   ├── auth/                    # Authentication
│   ├── admin/                   # Admin components
│   ├── coach/                   # Coach components
│   ├── athlete/                 # Athlete components
│   ├── parent/                  # Parent components
│   └── membership/              # Membership system
│
├── lib/                         # Business logic
│   ├── supabase/               # Supabase clients
│   ├── auth/                   # Authentication
│   ├── admin/                  # Admin actions
│   ├── coach/                  # Coach actions
│   ├── athlete/                # Athlete actions
│   ├── membership/             # Membership logic
│   ├── notifications/          # Notifications
│   ├── activity/               # Activity check-in
│   ├── progress/               # Progress reports
│   ├── parent/                 # Parent features
│   ├── parent-auth/            # Parent authentication
│   ├── monitoring/             # Error logging
│   ├── audit/                  # Audit logging
│   └── utils/                  # Utilities
│
├── types/                       # TypeScript types
│   └── database.types.ts       # Supabase generated types
│
├── hooks/                       # Custom React hooks
│   ├── useAuth.ts              # Authentication hook
│   └── useToast.ts             # Toast notifications
│
├── tests/                       # Test files
│   ├── registration-form/      # Registration tests
│   └── *.test.ts               # Unit & property tests
│
├── scripts/                     # Database scripts
│   ├── 01-schema-only.sql      # Core schema
│   ├── 02-auth-functions-and-rls.sql  # Auth & RLS
│   ├── 03-setup-test-data.sql  # Test data
│   ├── 10-22                   # Training & attendance
│   ├── 27-34                   # Membership system
│   ├── 40-42                   # Storage
│   ├── 50-63                   # Features
│   ├── 70-93                   # Advanced features
│   ├── 100-101                 # Home training
│   ├── auto-migrate.sh         # Run all migrations
│   ├── run-sql-via-api.sh      # Run single migration
│   └── archive/                # Old scripts
│
├── docs/                        # Documentation
│   ├── README.md               # Documentation index
│   ├── DATABASE.md             # Database guide
│   ├── TESTING.md              # Testing guide
│   ├── DEPLOYMENT.md           # Deployment guide
│   ├── MEMBERSHIP_APPROVAL_SYSTEM.md  # Membership guide
│   ├── MEMBERSHIP_TROUBLESHOOTING.md  # Troubleshooting
│   └── archive/                # Historical docs
│
├── supabase/                    # Supabase config
│   ├── config.toml             # Supabase configuration
│   └── migrations/             # Supabase migrations
│
├── public/                      # Static assets
├── .kiro/                       # Kiro specs
├── middleware.ts                # Next.js middleware
├── .env.local                   # Environment variables
└── README.md                    # Main documentation
```

## Key Directories

### `/app` - Application Pages
- **dashboard/** - Role-based dashboards (admin, coach, athlete)
- **parent/** - Parent portal
- **login/** - Authentication pages
- **register/** - Registration flow
- **pending-approval/** - Membership pending page

### `/components` - React Components
- **ui/** - Reusable UI components (shadcn/ui)
- **auth/** - Login, registration, OTP
- **admin/** - User management, clubs, reports
- **coach/** - Sessions, attendance, announcements
- **athlete/** - Schedule, check-in, performance
- **membership/** - Application forms and lists

### `/lib` - Business Logic
- **supabase/** - Database clients (browser, server, middleware)
- **auth/** - Authentication, access control, device tracking
- **membership/** - Application workflow, validation, storage
- **notifications/** - Notification system
- **monitoring/** - Error logging and monitoring

### `/scripts` - Database Management
- **01-03** - Core setup (schema, auth, test data)
- **10-22** - Training and attendance features
- **27-34** - Membership application system
- **40-63** - Storage, activities, features
- **70-93** - Notifications, tournaments, parent features
- **100-101** - Home training system
- **archive/** - Historical scripts

### `/docs` - Documentation
- **README.md** - Documentation index
- **DATABASE.md** - Database setup and migrations
- **TESTING.md** - Testing guide with test accounts
- **DEPLOYMENT.md** - Production deployment
- **MEMBERSHIP_*.md** - Membership system docs
- **archive/** - Old implementation summaries

### `/tests` - Testing
- **registration-form/** - Registration test suite
- ***.test.ts** - Unit tests
- ***.property.test.ts** - Property-based tests

## Configuration Files

### Environment
- `.env.local` - Environment variables (Supabase keys)
- `.env.local.example` - Template for environment variables

### Next.js
- `next.config.ts` - Next.js configuration
- `middleware.ts` - Authentication middleware
- `app/layout.tsx` - Root layout

### TypeScript
- `tsconfig.json` - TypeScript configuration
- `types/database.types.ts` - Supabase generated types

### Testing
- `vitest.config.ts` - Vitest configuration
- `tests/` - Test files

### Code Quality
- `eslint.config.mjs` - ESLint rules
- `.prettierrc` - Prettier formatting

### UI
- `tailwind.config.ts` - TailwindCSS configuration
- `components.json` - shadcn/ui configuration

## Development Workflow

### 1. Setup
```bash
npm install
cp .env.local.example .env.local
# Add Supabase credentials
./scripts/auto-migrate.sh
```

### 2. Development
```bash
npm run dev
```

### 3. Testing
```bash
npm test
npm run test:ui
npm run test:coverage
```

### 4. Deployment
```bash
git push origin main
vercel --prod
./scripts/auto-migrate.sh  # On production
```

## Database Management

### Run All Migrations
```bash
./scripts/auto-migrate.sh
```

### Run Single Migration
```bash
./scripts/run-sql-via-api.sh scripts/01-schema-only.sql
```

### Create New Migration
1. Create file: `scripts/XX-your-feature.sql`
2. Add SQL commands
3. Run: `./scripts/run-sql-via-api.sh scripts/XX-your-feature.sql`

## Important Notes

### Production-Only Development
- **No local development server** - All testing on production
- **Direct database changes** - Via API scripts only
- **No manual SQL execution** - Always use automation scripts

### Security
- All tables have Row Level Security (RLS)
- Role-based access control enforced at database level
- Middleware checks authentication and authorization

### Testing
- Test accounts available in `docs/TESTING.md`
- Property-based tests for critical paths
- Integration tests for workflows

## Quick Reference

### Add New Feature
1. Create migration script in `/scripts`
2. Run migration via API
3. Add components in `/components`
4. Add business logic in `/lib`
5. Create pages in `/app`
6. Add tests in `/tests`
7. Update documentation in `/docs`

### Troubleshooting
1. Check `/docs/MEMBERSHIP_TROUBLESHOOTING.md`
2. Review error logs in Supabase
3. Check RLS policies
4. Verify environment variables
5. Test with different roles

### Documentation
- Main guide: `README.md`
- Database: `docs/DATABASE.md`
- Testing: `docs/TESTING.md`
- Deployment: `docs/DEPLOYMENT.md`
- Full index: `docs/README.md`
