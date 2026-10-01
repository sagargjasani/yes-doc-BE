import { MongoMemoryServer } from 'mongodb-memory-server';

declare global {
  var __MONGOD__: MongoMemoryServer | undefined;
}

export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();
  globalThis.__MONGOD__ = mongod;
  // Workers are spawned after this runs, so they inherit it
  process.env.MONGO_BASE_URI = mongod.getUri();
}
