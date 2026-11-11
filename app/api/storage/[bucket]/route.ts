import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/db/mongo';
import { createClient } from '@/lib/db/server';
import { removeFiles } from '@/lib/db/storage';
import { dbError } from '@/lib/db/types';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ bucket: string }> }) {
  const { bucket } = await params;
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) {
    return NextResponse.json({ data: null, error: { ...dbError('Not authorized', '401'), status: 401 } }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { paths?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === 'string') : [];
  return NextResponse.json({ data: await removeFiles(await getDb(), bucket, paths), error: null });
}
