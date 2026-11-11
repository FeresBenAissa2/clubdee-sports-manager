import { GridFSBucket, type Db } from 'mongodb';
import { dbError, type DbError } from './types';

/** Buckets anyone may read through /api/storage (profile photos); the rest need a session. */
export const PUBLIC_BUCKETS = new Set(['avatars', 'profile-pictures']);

type Body = Blob | ArrayBuffer | ArrayBufferView | string;

interface UploadOptions {
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
}

export function storageUrl(bucket: string, path: string): string {
  return `/api/storage/${encodeURIComponent(bucket)}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

const fileName = (bucket: string, path: string) => `${bucket}/${path.replace(/^\/+/, '')}`;

async function toBuffer(body: Body): Promise<Buffer> {
  if (typeof body === 'string') return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  if (ArrayBuffer.isView(body)) return Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  return Buffer.from(await body.arrayBuffer());
}

export async function findFile(db: Db, bucket: string, path: string) {
  return new GridFSBucket(db, { bucketName: 'storage' }).find({ filename: fileName(bucket, path) }).next();
}

export async function readFile(db: Db, bucket: string, path: string) {
  const file = await findFile(db, bucket, path);
  if (!file) return null;
  const chunks: Buffer[] = [];
  const stream = new GridFSBucket(db, { bucketName: 'storage' }).openDownloadStream(file._id);
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return { data: Buffer.concat(chunks), contentType: (file.metadata?.contentType as string) ?? 'application/octet-stream' };
}

export async function writeFile(
  db: Db,
  bucket: string,
  path: string,
  body: Body,
  options: UploadOptions = {}
): Promise<{ error: DbError | null }> {
  const gridfs = new GridFSBucket(db, { bucketName: 'storage' });
  const existing = await findFile(db, bucket, path);
  if (existing && !options.upsert) return { error: { ...dbError('The resource already exists', '409'), status: 409 } };
  const contentType = options.contentType ?? (body instanceof Blob && body.type ? body.type : 'application/octet-stream');
  const data = await toBuffer(body);
  await new Promise<void>((resolve, reject) => {
    gridfs
      .openUploadStream(fileName(bucket, path), { metadata: { bucket, path, contentType } })
      .on('finish', () => resolve())
      .on('error', reject)
      .end(data);
  });
  if (existing) await gridfs.delete(existing._id);
  return { error: null };
}

export async function removeFiles(db: Db, bucket: string, paths: string[]): Promise<{ name: string }[]> {
  const gridfs = new GridFSBucket(db, { bucketName: 'storage' });
  const removed: { name: string }[] = [];
  for (const path of paths) {
    const files = await gridfs.find({ filename: fileName(bucket, path) }).toArray();
    for (const file of files) await gridfs.delete(file._id);
    if (files.length) removed.push({ name: path });
  }
  return removed;
}

export async function listFiles(db: Db, bucket: string, prefix = '') {
  const start = fileName(bucket, prefix ? `${prefix.replace(/\/+$/, '')}/` : '');
  const escaped = start.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const files = await new GridFSBucket(db, { bucketName: 'storage' })
    .find({ filename: { $regex: `^${escaped}` } })
    .toArray();
  return files.map((f) => ({
    name: f.filename.slice(start.length),
    id: String(f._id),
    created_at: f.uploadDate.toISOString(),
    updated_at: f.uploadDate.toISOString(),
    metadata: { size: f.length, mimetype: f.metadata?.contentType },
  }));
}

/** `storage.from(bucket)` for server code. */
export function serverBucket(getDb: () => Promise<Db>, bucket: string) {
  return {
    async upload(path: string, body: Body, options: UploadOptions = {}) {
      const { error } = await writeFile(await getDb(), bucket, path, body, options);
      return error ? { data: null, error } : { data: { path, id: path, fullPath: `${bucket}/${path}` }, error: null };
    },
    async update(path: string, body: Body, options: UploadOptions = {}) {
      return this.upload(path, body, { ...options, upsert: true });
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: storageUrl(bucket, path) } };
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- files are served by /api/storage, which checks the session itself
    async createSignedUrl(path: string, _expiresIn?: number) {
      return { data: { signedUrl: storageUrl(bucket, path) }, error: null };
    },
    async download(path: string) {
      const file = await readFile(await getDb(), bucket, path);
      if (!file) return { data: null, error: dbError('Object not found', '404') };
      return { data: new Blob([new Uint8Array(file.data)], { type: file.contentType }), error: null };
    },
    async remove(paths: string[]) {
      return { data: await removeFiles(await getDb(), bucket, paths), error: null };
    },
    async list(prefix = '') {
      return { data: await listFiles(await getDb(), bucket, prefix), error: null };
    },
  };
}
