// @vitest-environment node
/**
 * MongoDB data layer: queries, embeds, filters, writes, access rules, auth, RPCs and storage.
 * Runs against a throwaway database on the local MongoDB server (MONGODB_URI).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';

process.env.MONGODB_DB = `clubdee_test_${randomUUID().slice(0, 8)}`;
// bcrypt hashing is slow when the whole suite runs in parallel.
vi.setConfig({ hookTimeout: 60_000, testTimeout: 30_000 });

const { getDb, getMongoClient } = await import('@/lib/db/mongo');
const { createDbClient } = await import('@/lib/db/server-client');
const { createUser } = await import('@/lib/db/auth/users');
const { SESSION_COOKIE } = await import('@/lib/db/auth/tokens');
const { ensureIndexes } = await import('@/lib/db/indexes');

type Client = ReturnType<typeof createDbClient>;

const service = () => createDbClient({ service: true });

/** Client that keeps its session cookie in memory, like a browser would. */
function browserLike(jar = new Map<string, string>()) {
  const client = createDbClient({
    cookies: {
      get: (name) => jar.get(name),
      set: (name, value, options) => (options.maxAge === 0 ? jar.delete(name) : jar.set(name, value)),
    },
  });
  return { client, jar };
}

async function signedInAs(email: string, password = 'Secret123!') {
  const { client, jar } = browserLike();
  const { error } = await client.auth.signInWithPassword({ email, password });
  expect(error).toBeNull();
  return browserLike(jar).client;
}

let db: Awaited<ReturnType<typeof getDb>>;
const ids = {
  club: randomUUID(),
  otherClub: randomUUID(),
  admin: randomUUID(),
  coach: randomUUID(),
  athlete: randomUUID(),
  otherAthlete: randomUUID(),
};

async function seed(admin: Client) {
  for (const [key, email, role] of [
    ['admin', 'admin@test.dev', 'admin'],
    ['coach', 'coach@test.dev', 'coach'],
    ['athlete', 'athlete@test.dev', 'athlete'],
    ['otherAthlete', 'other@test.dev', 'athlete'],
  ] as const) {
    await createUser(db, { id: ids[key], email, password: 'Secret123!' });
    await admin.from('profiles').insert({ id: ids[key], email, full_name: key, membership_status: 'active' });
    await admin.from('user_roles').insert({ user_id: ids[key], role });
  }
  await admin.from('clubs').insert([
    { id: ids.club, name: 'Swim Stars', sport_type: 'Swimming' },
    { id: ids.otherClub, name: 'Hoops', sport_type: 'Basketball' },
  ]);
  await admin.from('coaches').insert({
    user_id: ids.coach,
    club_id: ids.club,
    first_name: 'Cora',
    last_name: 'Coach',
    email: 'coach@test.dev',
  });
  await admin.from('athletes').insert([
    { user_id: ids.athlete, club_id: ids.club, first_name: 'Ada', last_name: 'Athlete', email: 'athlete@test.dev' },
    { user_id: ids.otherAthlete, club_id: ids.otherClub, first_name: 'Ola', last_name: 'Other', email: 'other@test.dev' },
  ]);
}

beforeAll(async () => {
  db = await getDb();
  await db.dropDatabase();
  await ensureIndexes(db);
  await seed(service());
});

afterAll(async () => {
  await db.dropDatabase();
  await (await getMongoClient()).close();
});

describe('select', () => {
  it('fills column defaults and returns ISO timestamps', async () => {
    const { data, error } = await service().from('clubs').select('*').eq('id', ids.club).single();
    expect(error).toBeNull();
    expect(data.name).toBe('Swim Stars');
    expect(typeof data.created_at).toBe('string');
    expect(new Date(data.created_at).toISOString()).toBe(data.created_at);
    expect(data).not.toHaveProperty('_id');
  });

  it('embeds a many-to-one relation, with an alias', async () => {
    const { data } = await service()
      .from('athletes')
      .select('first_name, club:clubs(name)')
      .eq('user_id', ids.athlete)
      .single();
    expect(data).toEqual({ first_name: 'Ada', club: { name: 'Swim Stars' } });
  });

  it('embeds a one-to-many relation and counts', async () => {
    const { data } = await service()
      .from('clubs')
      .select('name, athletes(first_name), coaches(count)')
      .eq('id', ids.club)
      .single();
    expect(data.athletes).toEqual([{ first_name: 'Ada' }]);
    expect(data.coaches).toEqual([{ count: 1 }]);
  });

  it('filters parents through an !inner embed', async () => {
    const { data } = await service()
      .from('athletes')
      .select('first_name, clubs!inner(name)')
      .eq('clubs.name', 'Hoops');
    expect(data.map((a: { first_name: string }) => a.first_name)).toEqual(['Ola']);
  });

  it('supports in, or, not, ilike and ordering', async () => {
    const client = service();
    const inList = await client.from('athletes').select('first_name').in('club_id', [ids.club, ids.otherClub]);
    expect(inList.data).toHaveLength(2);

    const either = await client
      .from('athletes')
      .select('first_name')
      .or(`first_name.eq.Ada,last_name.ilike.%oth%`)
      .order('first_name', { ascending: false });
    expect(either.data.map((a: { first_name: string }) => a.first_name)).toEqual(['Ola', 'Ada']);

    const notNull = await client.from('athletes').select('first_name').not('email', 'is', null);
    expect(notNull.data).toHaveLength(2);

    const like = await client.from('clubs').select('name').ilike('name', 'swim%');
    expect(like.data).toEqual([{ name: 'Swim Stars' }]);
  });

  it('puts NULLs last when ascending, first when descending', async () => {
    const client = service();
    const asc = await client.from('profiles').select('full_name, phone').order('phone');
    await client.from('profiles').update({ phone: '0101' }).eq('id', ids.coach);
    const sorted = await client.from('profiles').select('full_name').order('phone', { ascending: true });
    expect(sorted.data[0].full_name).toBe('coach');
    const desc = await client.from('profiles').select('full_name').order('phone', { ascending: false });
    expect(desc.data[desc.data.length - 1].full_name).toBe('coach');
    expect(asc.error).toBeNull();
  });

  it('counts with head: true and pages with range', async () => {
    const { count, data } = await service().from('profiles').select('*', { count: 'exact', head: true });
    expect(count).toBe(4);
    expect(data).toBeNull();
    const page = await service().from('profiles').select('email').order('email').range(1, 2);
    expect(page.data).toHaveLength(2);
  });

  it('single() fails with PGRST116 when no row matches; maybeSingle() returns null', async () => {
    const single = await service().from('clubs').select('*').eq('name', 'Nope').single();
    expect(single.error?.code).toBe('PGRST116');
    const maybe = await service().from('clubs').select('*').eq('name', 'Nope').maybeSingle();
    expect(maybe.error).toBeNull();
    expect(maybe.data).toBeNull();
  });
});

describe('writes', () => {
  it('reports unique violations as 23505', async () => {
    const { error } = await service()
      .from('profiles')
      .insert({ id: randomUUID(), email: 'athlete@test.dev', full_name: 'dup' });
    expect(error?.code).toBe('23505');
  });

  it('update returns the changed rows and bumps updated_at', async () => {
    const before = await service().from('clubs').select('updated_at').eq('id', ids.otherClub).single();
    await new Promise((r) => setTimeout(r, 5));
    const { data } = await service()
      .from('clubs')
      .update({ description: 'Court time' })
      .eq('id', ids.otherClub)
      .select();
    expect(data[0].description).toBe('Court time');
    expect(data[0].updated_at > before.data.updated_at).toBe(true);
  });

  it('upsert updates on conflict instead of duplicating', async () => {
    const client = service();
    await client.from('user_roles').upsert({ user_id: ids.otherAthlete, role: 'coach' }, { onConflict: 'user_id' });
    const { data } = await client.from('user_roles').select('role').eq('user_id', ids.otherAthlete);
    expect(data).toEqual([{ role: 'coach' }]);
    await client.from('user_roles').upsert({ user_id: ids.otherAthlete, role: 'athlete' }, { onConflict: 'user_id' });
  });

  it('cascades deletes along foreign keys', async () => {
    const client = service();
    const club = randomUUID();
    await client.from('clubs').insert({ id: club, name: 'Temp', sport_type: 'Tennis' });
    await client.from('athletes').insert({ user_id: ids.coach, club_id: club, first_name: 'T', last_name: 'T', email: 't@test.dev' });
    await client.from('clubs').delete().eq('id', club);
    const { count } = await client.from('athletes').select('*', { count: 'exact', head: true }).eq('club_id', club);
    expect(count).toBe(0);
  });
});

describe('access rules', () => {
  it('anonymous visitors can read clubs but not profiles', async () => {
    const anon = browserLike().client;
    expect((await anon.from('clubs').select('name')).data.length).toBeGreaterThan(0);
    expect((await anon.from('profiles').select('*')).data).toEqual([]);
  });

  it('athletes only see their own role and cannot create clubs', async () => {
    const athlete = await signedInAs('athlete@test.dev');
    const roles = await athlete.from('user_roles').select('user_id');
    expect(roles.data).toEqual([{ user_id: ids.athlete }]);
    const { error } = await athlete.from('clubs').insert({ name: 'Mine', sport_type: 'Chess' });
    expect(error?.code).toBe('42501');
  });

  it('athletes cannot update someone else’s athlete row', async () => {
    const athlete = await signedInAs('athlete@test.dev');
    const { data } = await athlete
      .from('athletes')
      .update({ nickname: 'hacked' })
      .eq('user_id', ids.otherAthlete)
      .select();
    expect(data).toEqual([]);
  });

  it('admins see everything', async () => {
    const admin = await signedInAs('admin@test.dev');
    expect((await admin.from('user_roles').select('user_id')).data).toHaveLength(4);
  });
});

describe('auth', () => {
  beforeEach(async () => {
    await db.collection('users').deleteMany({ email: 'new@test.dev' });
  });

  it('signUp sets a session cookie and the new user can write their own rows', async () => {
    const { client, jar } = browserLike();
    const { data, error } = await client.auth.signUp({ email: 'New@Test.dev', password: 'Secret123!' });
    expect(error).toBeNull();
    expect(data.user?.email).toBe('new@test.dev');
    expect(jar.get(SESSION_COOKIE)).toBeTruthy();

    const insert = await client.from('profiles').insert({ id: data.user!.id, email: 'new@test.dev', full_name: 'New' });
    expect(insert.error).toBeNull();

    const again = browserLike(jar).client;
    expect((await again.auth.getUser()).data.user?.id).toBe(data.user!.id);
  });

  it('rejects wrong passwords and duplicate sign-ups', async () => {
    const { client } = browserLike();
    const wrong = await client.auth.signInWithPassword({ email: 'athlete@test.dev', password: 'nope' });
    expect(wrong.error?.message).toBe('Invalid login credentials');
    const dup = await client.auth.signUp({ email: 'athlete@test.dev', password: 'Secret123!' });
    expect(dup.error?.message).toMatch(/already registered/);
  });

  it('signOut clears the session', async () => {
    const { client, jar } = browserLike();
    await client.auth.signInWithPassword({ email: 'coach@test.dev', password: 'Secret123!' });
    await client.auth.signOut();
    expect(jar.has(SESSION_COOKIE)).toBe(false);
    expect((await browserLike(jar).client.auth.getUser()).data.user).toBeNull();
  });

  it('rejects a tampered session cookie', async () => {
    const jar = new Map([[SESSION_COOKIE, 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.forged']]);
    expect((await browserLike(jar).client.auth.getUser()).data.user).toBeNull();
  });

  it('admin API is limited to admins', async () => {
    const athlete = await signedInAs('athlete@test.dev');
    const denied = await athlete.auth.admin.listUsers();
    expect(denied.error?.status).toBe(403);
    const admin = await signedInAs('admin@test.dev');
    const listed = await admin.auth.admin.listUsers();
    expect(listed.data.users.length).toBeGreaterThanOrEqual(4);
  });
});

describe('rpc', () => {
  it('ports the membership application functions', async () => {
    const client = service();
    const appId = randomUUID();
    await client.from('membership_applications').insert({
      id: appId,
      user_id: ids.otherAthlete,
      club_id: ids.club,
      status: 'pending',
      personal_info: { full_name: 'Ola' },
      documents: [],
      activity_log: [],
    });

    const dup = await client.rpc('check_duplicate_pending_application', { p_user_id: ids.otherAthlete });
    expect(dup.data[0]).toMatchObject({ has_pending: true, pending_application_id: appId });

    await client.rpc('update_application_status', {
      p_application_id: appId,
      p_new_status: 'approved',
      p_reviewed_by: ids.coach,
      p_notes: 'Welcome',
    });
    const { data } = await client.from('membership_applications').select('*').eq('id', appId).single();
    expect(data.status).toBe('approved');
    expect(data.review_info).toMatchObject({ reviewed_by: ids.coach, reviewer_role: 'coach', notes: 'Welcome' });
    expect(data.activity_log.at(-1)).toMatchObject({ action: 'status_changed', from: 'pending', to: 'approved' });
  });

  it('answers role helpers for the signed-in user', async () => {
    const coach = await signedInAs('coach@test.dev');
    expect((await coach.rpc('get_user_role')).data).toBe('coach');
    expect((await coach.rpc('is_admin')).data).toBe(false);
  });

  it('reports unknown functions like PostgREST did', async () => {
    const { error } = await service().rpc('does_not_exist');
    expect(error?.code).toBe('PGRST202');
  });
});

describe('storage', () => {
  it('uploads, downloads, lists and removes files', async () => {
    const bucket = service().storage.from('avatars');
    const upload = await bucket.upload('u1/photo.txt', new Blob(['hello'], { type: 'text/plain' }));
    expect(upload.error).toBeNull();
    expect((await bucket.upload('u1/photo.txt', 'again')).error?.status).toBe(409);
    expect((await bucket.upload('u1/photo.txt', 'again', { upsert: true })).error).toBeNull();

    const download = await bucket.download('u1/photo.txt');
    expect(await download.data!.text()).toBe('again');
    expect(bucket.getPublicUrl('u1/photo.txt').data.publicUrl).toBe('/api/storage/avatars/u1/photo.txt');
    expect((await bucket.list('u1')).data.map((f) => f.name)).toEqual(['photo.txt']);

    await bucket.remove(['u1/photo.txt']);
    expect((await bucket.download('u1/photo.txt')).data).toBeNull();
  });
});
