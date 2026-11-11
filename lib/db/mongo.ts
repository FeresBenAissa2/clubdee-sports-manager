import { MongoClient, type Db } from 'mongodb';
import { ensureIndexes } from './indexes';

const globalForMongo = globalThis as unknown as {
  __mongoClient?: Promise<MongoClient>;
  __mongoIndexes?: Promise<void>;
};

export function mongoConfig() {
  return {
    uri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
    dbName: process.env.MONGODB_DB || 'clubdee',
  };
}

/** One client per process; Next.js dev reloads modules, so it lives on globalThis. */
export async function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.__mongoClient) {
    const { uri } = mongoConfig();
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    globalForMongo.__mongoClient = client.connect().catch((error) => {
      globalForMongo.__mongoClient = undefined;
      throw error;
    });
  }
  return globalForMongo.__mongoClient;
}

export async function getDb(): Promise<Db> {
  const db = (await getMongoClient()).db(mongoConfig().dbName);
  globalForMongo.__mongoIndexes ??= ensureIndexes(db).catch((error) => {
    globalForMongo.__mongoIndexes = undefined;
    console.error('[mongo] Failed to create indexes:', error);
  });
  await globalForMongo.__mongoIndexes;
  return db;
}
