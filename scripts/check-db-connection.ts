/**
 * Checks that MongoDB is reachable and prints the row count of each collection.
 *
 *   npm run db:check
 */
import { config } from 'dotenv';
import { getMongoClient, mongoConfig } from '../lib/db/mongo';

config({ path: '.env.local', quiet: true });

async function main() {
  const { uri, dbName } = mongoConfig();
  console.log(`Connecting to ${uri}/${dbName} ...`);
  const client = await getMongoClient();
  const db = client.db(dbName);
  const { version } = await db.admin().serverInfo();
  console.log(`Connected (MongoDB ${version}).`);

  const collections = (await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name).sort();
  if (!collections.length) console.log('The database is empty. Run `npm run db:seed` to load the data.');
  for (const name of collections) console.log(`  ${name}: ${await db.collection(name).countDocuments()}`);
  await client.close();
}

main().catch((error) => {
  console.error('Connection failed:', (error as Error).message);
  process.exit(1);
});
