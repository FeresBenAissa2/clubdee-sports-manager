# Canonical RLS Helper Functions

**Status:** ✅ CANONICAL SOURCE OF TRUTH  
**Location:** `scripts/02-auth-functions-and-rls.sql`  
**Last Updated:** 2025-11-27

## Overview

This document defines the **canonical RLS helper functions** for the Sports Club Management System. These functions are the **ONLY** definitions that should exist in the system. All RLS policies, application code, and documentation should reference these functions.

## Design Principles

1. **Parameterless Signatures** - Use `auth.uid()` internally for security and simplicity
2. **Public Schema** - Explicit `public.` qualification for clarity
3. **SQL Functions** - Simple and performant for basic queries (not PL/pgSQL)
4. **STABLE** - Results don't change within a transaction
5. **SECURITY DEFINER** - Run with function owner's privileges

## Canonical Functions

### Core Role Functions

#### `public.get_user_role()`

**Purpose:** Returns the role of the currently authenticated user

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role
```

**Returns:** `user_role` enum (`'admin'`, `'coach'`, `'athlete'`, `'parent'`)

**Usage:**
```sql
-- In RLS policies
USING (get_user_role() = 'admin')

-- In queries
SELECT get_user_role();
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

#### `public.is_admin()`

**Purpose:** Checks if the currently authenticated user has admin role

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
```

**Returns:** `boolean` (true if admin, false otherwise)

**Usage:**
```sql
-- In RLS policies
USING (is_admin())

-- In queries
SELECT is_admin();
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

#### `public.is_coach()`

**Purpose:** Checks if the currently authenticated user has coach role

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN
```

**Returns:** `boolean` (true if coach, false otherwise)

**Usage:**
```sql
-- In RLS policies
USING (is_coach())

-- In queries
SELECT is_coach();
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS BOOLEAN AS $
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'coach'
  );
$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

#### `public.is_athlete()`

**Purpose:** Checks if the currently authenticated user has athlete role

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.is_athlete()
RETURNS BOOLEAN
```

**Returns:** `boolean` (true if athlete, false otherwise)

**Usage:**
```sql
-- In RLS policies
USING (is_athlete())

-- In queries
SELECT is_athlete();
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.is_athlete()
RETURNS BOOLEAN AS $
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'athlete'
  );
$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

### Club Functions

#### `public.get_user_club_id()`

**Purpose:** Returns the club ID associated with the currently authenticated user

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS UUID
```

**Returns:** `UUID` of the user's club, or `NULL` if not assigned to a club

**Usage:**
```sql
-- In RLS policies
USING (club_id = get_user_club_id())

-- In queries
SELECT get_user_club_id();
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.get_user_club_id()
RETURNS UUID AS $
  SELECT club_id FROM profiles WHERE id = auth.uid();
$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Important Notes:**
- Uses the `profiles` table which is the **single source of truth** for user-club relationships
- The `club_id` is set during membership approval
- Returns `NULL` for users not yet assigned to a club (pending membership)

---

### Team Functions

#### `public.is_coach_of_team(team_uuid UUID)`

**Purpose:** Checks if the currently authenticated user is the coach of a specific team

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.is_coach_of_team(team_uuid UUID)
RETURNS BOOLEAN
```

**Parameters:**
- `team_uuid` - UUID of the team to check

**Returns:** `boolean` (true if user is coach of the team, false otherwise)

**Usage:**
```sql
-- In RLS policies
USING (is_coach_of_team(team_id))

-- In queries
SELECT is_coach_of_team('550e8400-e29b-41d4-a716-446655440000');
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.is_coach_of_team(team_uuid UUID)
RETURNS BOOLEAN AS $
  SELECT EXISTS (
    SELECT 1 FROM teams 
    WHERE id = team_uuid AND coach_id = auth.uid()
  );
$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

#### `public.is_team_member(team_uuid UUID)`

**Purpose:** Checks if the currently authenticated user is a member of a specific team

**Signature:**
```sql
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN
```

**Parameters:**
- `team_uuid` - UUID of the team to check

**Returns:** `boolean` (true if user is member of the team, false otherwise)

**Usage:**
```sql
-- In RLS policies
USING (is_team_member(team_id))

-- In queries
SELECT is_team_member('550e8400-e29b-41d4-a716-446655440000');
```

**Implementation:**
```sql
CREATE OR REPLACE FUNCTION public.is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $
  SELECT EXISTS (
    SELECT 1 FROM team_members 
    WHERE team_id = team_uuid AND athlete_id = auth.uid()
  );
$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## Common RLS Policy Patterns

### Pattern 1: Admin Full Access
```sql
CREATE POLICY "admins_full_access"
  ON table_name FOR ALL
  USING (is_admin());
```

### Pattern 2: Coach Club Isolation
```sql
CREATE POLICY "coaches_own_club"
  ON table_name FOR ALL
  USING (
    is_coach() AND 
    club_id = get_user_club_id()
  );
```

### Pattern 3: Athlete Self-Access
```sql
CREATE POLICY "athletes_own_data"
  ON table_name FOR ALL
  USING (
    is_athlete() AND 
    user_id = auth.uid()
  );
```

### Pattern 4: Combined Role Access
```sql
CREATE POLICY "admins_and_coaches"
  ON table_name FOR SELECT
  USING (
    is_admin() OR 
    (is_coach() AND club_id = get_user_club_id())
  );
```

---

## Schema Dependencies

These functions depend on the following tables:

### `user_roles` table
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `profiles` table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  club_id UUID REFERENCES clubs(id),
  coach_id UUID REFERENCES profiles(id),
  membership_status TEXT,
  -- ... other fields
);
```

### `teams` table
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubs(id),
  coach_id UUID REFERENCES auth.users(id),
  -- ... other fields
);
```

### `team_members` table
```sql
CREATE TABLE team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  athlete_id UUID NOT NULL REFERENCES auth.users(id),
  -- ... other fields
);
```

---

## Migration History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-01 | Initial creation in `02-auth-functions-and-rls.sql` |
| 1.1 | 2025-11-27 | Documented as canonical source, removed duplicates |

---

## DO NOT Create Duplicate Definitions

❌ **DO NOT** create these functions in:
- Other migration files
- Supabase migration folder
- Spec documentation files
- Application code

✅ **DO** reference these functions from:
- RLS policies in migration files
- Documentation (by reference, not by redefining)
- Database queries (when needed)

---

## Testing

To verify these functions are working correctly:

```sql
-- Test get_user_role()
SELECT get_user_role();
-- Expected: 'admin', 'coach', 'athlete', or 'parent'

-- Test is_admin()
SELECT is_admin();
-- Expected: true or false

-- Test is_coach()
SELECT is_coach();
-- Expected: true or false

-- Test is_athlete()
SELECT is_athlete();
-- Expected: true or false

-- Test get_user_club_id()
SELECT get_user_club_id();
-- Expected: UUID or NULL

-- Test is_coach_of_team() (replace with actual team UUID)
SELECT is_coach_of_team('550e8400-e29b-41d4-a716-446655440000');
-- Expected: true or false

-- Test is_team_member() (replace with actual team UUID)
SELECT is_team_member('550e8400-e29b-41d4-a716-446655440000');
-- Expected: true or false
```

---

## Troubleshooting

### Function Not Found Error

**Error:** `function public.get_user_role() does not exist`

**Solution:** Run the migration:
```bash
./scripts/run-sql-via-api.sh scripts/02-auth-functions-and-rls.sql
```

### Wrong Results

**Error:** Function returns unexpected results

**Solution:** Check that:
1. User has a role in `user_roles` table
2. User has a profile in `profiles` table
3. `auth.uid()` returns the correct user ID

### Permission Denied

**Error:** `permission denied for function get_user_role`

**Solution:** Ensure function is created with `SECURITY DEFINER` and owned by a user with appropriate permissions.

---

## References

- **Canonical Source:** `sports-club-management/scripts/02-auth-functions-and-rls.sql`
- **Audit Report:** `.kiro/specs/system-view-master/RLS_AUDIT_REPORT.md`
- **Design Document:** `.kiro/specs/system-view-master/design.md`
- **Requirements:** `.kiro/specs/system-view-master/requirements.md` (Requirement 2.5, 2.10)

