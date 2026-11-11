import { createClient } from '@/lib/db/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await db.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    // @ts-ignore
    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all clubs
    const { data: clubs, error: clubsError } = await db
      .from('clubs')
      .select('id, name, sport_type')
      .order('name');

    if (clubsError) {
      console.error('Clubs query error:', clubsError);
      return NextResponse.json({ error: 'Failed to fetch clubs' }, { status: 500 });
    }

    return NextResponse.json({ clubs: clubs || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
