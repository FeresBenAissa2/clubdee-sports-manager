import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/db/mongo';
import { createClient } from '@/lib/db/server';
import { PUBLIC_BUCKETS, readFile, writeFile } from '@/lib/db/storage';
import { dbError } from '@/lib/db/types';

type Params = { params: Promise<{ bucket: string; path: string[] }> };

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const fail = (message: string, status: number) =>
  NextResponse.json({ data: null, error: { ...dbError(message, String(status)), status } }, { status });

async function signedIn() {
  const { data } = await (await createClient()).auth.getUser();
  return data.user;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { bucket, path } = await params;
  if (!PUBLIC_BUCKETS.has(bucket) && !(await signedIn())) return fail('Not authorized', 401);

  const file = await readFile(await getDb(), bucket, path.join('/'));
  if (!file) return fail('Object not found', 404);
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.contentType,
      'Cache-Control': PUBLIC_BUCKETS.has(bucket) ? 'public, max-age=3600' : 'private, max-age=0',
    },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { bucket, path } = await params;
  if (!(await signedIn())) return fail('Not authorized', 401);

  const data = Buffer.from(await request.arrayBuffer());
  if (data.byteLength > MAX_UPLOAD_BYTES) return fail('File is too large', 413);

  const filePath = path.join('/');
  const { error } = await writeFile(await getDb(), bucket, filePath, data, {
    contentType: request.headers.get('content-type') ?? undefined,
    upsert: request.headers.get('x-upsert') === 'true',
  });
  if (error) return NextResponse.json({ data: null, error }, { status: error.status ?? 400 });
  return NextResponse.json({ data: { path: filePath, id: filePath, fullPath: `${bucket}/${filePath}` }, error: null });
}
