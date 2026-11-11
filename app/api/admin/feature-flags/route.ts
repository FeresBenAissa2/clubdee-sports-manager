/**
 * Admin Feature Flags API
 * 
 * Endpoints for managing feature flags:
 * - PATCH: Update feature flag
 * 
 * Requirements: 20.8, 20.9
 */

import { createClient } from '@/lib/db/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const db = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await db.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: userRole, error: roleError } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single<{ role: string }>();

    if (roleError || !userRole || userRole.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, enabled, rollout_percentage } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Feature flag name is required' },
        { status: 400 }
      );
    }

    // Validate rollout_percentage if provided
    if (rollout_percentage !== undefined) {
      if (
        typeof rollout_percentage !== 'number' ||
        rollout_percentage < 0 ||
        rollout_percentage > 100
      ) {
        return NextResponse.json(
          { error: 'Rollout percentage must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    // Update feature flag using RPC to avoid type issues
    const { data, error } = await (db as any)
      .rpc('update_feature_flag', {
        flag_name: name,
        flag_enabled: enabled,
        flag_rollout: rollout_percentage
      });

    if (error) {
      console.error('Error updating feature flag:', error);
      return NextResponse.json(
        { error: 'Failed to update feature flag' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Error in feature flags API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
