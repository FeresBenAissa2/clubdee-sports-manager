'use server';

import { getParentSession } from '@/lib/parent-auth/actions';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await getParentSession();
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error getting parent session:', error);
    return NextResponse.json({ session: null, error: 'Failed to get session' }, { status: 500 });
  }
}
