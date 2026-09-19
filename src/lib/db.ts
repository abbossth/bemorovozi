import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var _mongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB() {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set — add it to .env.local");
  }

  if (!cache.promise) {
    // Fail in ~10s instead of the 30s default, so a network blip doesn't hang the page.
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false, serverSelectionTimeoutMS: 10000 });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Don't cache the rejection: otherwise one transient network failure poisons this
    // server instance and every later request fails until it is restarted.
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}
