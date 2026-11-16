import { describe, expect, it } from 'vitest';
import { canInsert, columnViolation, rowAllowed, rowFilter, type Caller } from '@/lib/db/policies';

const athlete: Caller = { service: false, userId: 'user-athlete', role: 'athlete' };
const coach: Caller = { service: false, userId: 'user-coach', role: 'coach' };
const admin: Caller = { service: false, userId: 'user-admin', role: 'admin' };
const visitor: Caller = { service: false, userId: null, role: null };
const service: Caller = { service: true, userId: null, role: null };

describe('collections that are never exposed to the query client', () => {
  const sensitive = ['users', 'parent_users', 'nutrition_hydration', 'nutrition_meals', 'nutrition_checkins'];

  it('cannot be read or written by any signed-in user, even an admin', () => {
    for (const table of sensitive) {
      for (const caller of [athlete, coach, admin, visitor]) {
        expect(rowFilter(table, 'select', caller)).toBe(false);
        expect(rowFilter(table, 'update', caller)).toBe(false);
        expect(rowFilter(table, 'delete', caller)).toBe(false);
        expect(canInsert(table, caller, { user_id: caller.userId })).toBe(false);
      }
    }
  });

  it('stay available to server code using the service client', () => {
    for (const table of sensitive) expect(rowFilter(table, 'select', service)).toBeNull();
  });
});

describe('logs and settings', () => {
  it('only admins read the audit log', () => {
    expect(rowFilter('audit_logs', 'select', athlete)).toBe(false);
    expect(rowFilter('audit_logs', 'select', coach)).toBe(false);
    expect(rowFilter('audit_logs', 'select', admin)).toBeNull();
    expect(canInsert('audit_logs', athlete, { user_id: athlete.userId })).toBe(true);
  });

  it('only admins change system settings and feature flags', () => {
    for (const table of ['system_settings', 'feature_flags']) {
      expect(rowFilter(table, 'select', visitor)).toBeNull();
      expect(rowFilter(table, 'update', coach)).toBe(false);
      expect(canInsert(table, athlete, {})).toBe(false);
      expect(rowFilter(table, 'update', admin)).toBeNull();
    }
  });
});

describe('nobody promotes themselves', () => {
  it('an athlete cannot become a coach or an athlete of a club on their own', () => {
    expect(canInsert('coaches', athlete, { user_id: athlete.userId, club_id: 'club-1' })).toBe(false);
    expect(canInsert('coaches', coach, { user_id: coach.userId, club_id: 'club-2' })).toBe(false);
    expect(canInsert('athletes', athlete, { user_id: athlete.userId, club_id: 'club-1' })).toBe(false);
    expect(canInsert('athletes', coach, { user_id: athlete.userId, club_id: 'club-1' })).toBe(true);
  });

  it('a role can only be set to athlete by a non-admin', () => {
    expect(columnViolation('user_roles', athlete, { user_id: athlete.userId, role: 'admin' })).toBe('role');
    expect(columnViolation('user_roles', athlete, { user_id: athlete.userId, role: 'coach' })).toBe('role');
    expect(columnViolation('user_roles', athlete, { user_id: athlete.userId, role: 'athlete' })).toBeNull();
    expect(columnViolation('user_roles', admin, { user_id: 'someone', role: 'admin' })).toBeNull();
  });

  it('an athlete cannot activate their own membership or pick their club', () => {
    const profile = { id: athlete.userId, role: null, membership_status: 'pending', club_id: null };
    expect(columnViolation('profiles', athlete, { membership_status: 'active' }, profile)).toBe('membership_status');
    expect(columnViolation('profiles', athlete, { club_id: 'club-1' }, profile)).toBe('club_id');
    expect(columnViolation('profiles', athlete, { role: 'admin' }, profile)).toBe('role');
    // What the app legitimately does as the athlete:
    expect(columnViolation('profiles', athlete, { full_name: 'New Name' }, profile)).toBeNull();
    expect(columnViolation('profiles', athlete, { membership_status: 'pending' }, { ...profile, membership_status: 'rejected' })).toBeNull();
    expect(columnViolation('profiles', athlete, { membership_status: null, email: 'a@b.tn' })).toBeNull();
  });

  it('sending back an unchanged protected value is not a violation', () => {
    const profile = { id: athlete.userId, role: 'athlete', membership_status: 'active', club_id: 'club-1' };
    expect(columnViolation('profiles', athlete, { membership_status: 'active', club_id: 'club-1' }, profile)).toBeNull();
    expect(columnViolation('athletes', athlete, { club_id: 'club-1', nickname: 'Sam' }, { club_id: 'club-1' })).toBeNull();
    expect(columnViolation('athletes', athlete, { club_id: 'club-2' }, { club_id: 'club-1' })).toBe('club_id');
  });

  it('a coach approves memberships but cannot hand out the admin role', () => {
    const profile = { id: 'someone', role: null, membership_status: 'pending', club_id: null };
    expect(columnViolation('profiles', coach, { membership_status: 'active', club_id: 'club-1' }, profile)).toBeNull();
    expect(columnViolation('profiles', coach, { role: 'admin' }, profile)).toBe('role');
    expect(columnViolation('coaches', coach, { club_id: 'club-9' }, { club_id: 'club-1' })).toBe('club_id');
  });

  it('an athlete cannot approve their own application', () => {
    const application = { user_id: athlete.userId, status: 'pending', review_info: null };
    expect(columnViolation('membership_applications', athlete, { status: 'approved' }, application)).toBe('status');
    expect(columnViolation('membership_applications', athlete, { status: 'approved' })).toBe('status');
    expect(columnViolation('membership_applications', athlete, { status: 'pending', personal_info: {} })).toBeNull();
    expect(columnViolation('membership_applications', coach, { status: 'approved' }, application)).toBeNull();
  });
});

describe('announcements belong to their author', () => {
  it('another coach cannot change them', () => {
    const filter = rowFilter('announcements', 'update', coach);
    expect(rowAllowed(filter, { created_by: coach.userId })).toBe(true);
    expect(rowAllowed(filter, { created_by: 'another-coach' })).toBe(false);
    expect(rowFilter('announcements', 'delete', athlete)).toEqual({ created_by: athlete.userId });
    expect(rowFilter('announcements', 'update', admin)).toBeNull();
  });

  it('only staff post them', () => {
    expect(canInsert('announcements', athlete, { created_by: athlete.userId })).toBe(false);
    expect(canInsert('announcements', coach, { created_by: coach.userId })).toBe(true);
  });
});
