import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/db/server';

/**
 * Admin API: Create User (Bypass Rate Limiting)
 * 
 * This endpoint uses the service role key to create users,
 * which bypasses the sign-up rate limiting.
 * 
 * Only accessible by admin users.
 */
export async function POST(request: NextRequest) {
  try {
    const db = await createClient();

    // Check if user is admin
    const { data: { user }, error: authError } = await db.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin role. Only user_roles decides: profiles.role is a display copy
    // and must never grant access on its own.
    const { data: userRole } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = (userRole as any)?.role === 'admin';

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { email, password, full_name, role = 'athlete', club_id } = body;

    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: 'Missing required fields: email, password, full_name' },
        { status: 400 }
      );
    }

    // Validate role
    if (!['admin', 'coach', 'athlete'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, coach, or athlete' },
        { status: 400 }
      );
    }

    // Coaches and athletes always belong to a club: use the chosen one, else the first club.
    let clubId: string | null = null;
    if (role === 'coach' || role === 'athlete') {
      if (club_id) {
        const { data: club } = await db.from('clubs').select('id').eq('id', club_id).maybeSingle();
        if (!club) {
          return NextResponse.json({ error: 'Selected club does not exist' }, { status: 400 });
        }
        clubId = club_id;
      } else {
        const { data: clubs } = await db.from('clubs').select('id').order('name').limit(1);
        clubId = clubs && clubs.length > 0 ? (clubs[0] as any).id : null;
      }
      if (!clubId) {
        return NextResponse.json(
          { error: 'Create a club first: coaches and athletes must belong to a club' },
          { status: 400 }
        );
      }
    }

    // Create user using Admin API (bypasses rate limiting)
    const { data: newUser, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      );
    }

    if (!newUser.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    const userId = (newUser.user as any).id;

    // Create profile
    const { error: profileError } = await db
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name,
        role: role as any,
        club_id: clubId,
        membership_status: 'active',
      } as any);

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail the request, profile can be created later
    }

    // Create user_roles record
    const { error: roleError } = await db
      .from('user_roles')
      .insert({
        user_id: userId,
        role: role as any,
      } as any);

    if (roleError) {
      console.error('Error creating user_roles:', roleError);
    }

    const nameParts = String(full_name).trim().split(/\s+/);
    const firstName = nameParts[0] || full_name;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create athlete record if role is athlete and club exists
    if (role === 'athlete' && clubId) {

      const { error: athleteError } = await db
        .from('athletes')
        .insert({
          user_id: userId,
          club_id: clubId,
          email,
          first_name: firstName,
          last_name: lastName,
          date_of_birth: '2000-01-01',
          phone_number: '0000000000',
        } as any);

      if (athleteError) {
        console.error('Error creating athlete:', athleteError);
        // Don't fail the request
      }
    }

    // Coach pages read the coach's clubs from the coaches table, so a coach
    // without a row there cannot use the dashboard at all.
    if (role === 'coach' && clubId) {
      const { error: coachError } = await db
        .from('coaches')
        .insert({
          user_id: userId,
          club_id: clubId,
          email,
          first_name: firstName,
          last_name: lastName,
        } as any);

      if (coachError) {
        console.error('Error creating coach:', coachError);
        return NextResponse.json(
          { error: 'Account created, but the coach profile could not be saved: ' + coachError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: (newUser.user as any).email,
      },
      message: 'User created successfully',
    });

  } catch (error: any) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
