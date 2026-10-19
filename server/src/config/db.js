import mongoose from 'mongoose';
import { env } from './env.js';

let mongodInstance = null;

export async function connectDB() {
  const maskedUri = env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@');
  const maxAttempts = env.NODE_ENV === 'production' ? 5 : 2;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        family: 4,
        maxPoolSize: 20,
        minPoolSize: 1,
        serverApi: { version: '1', strict: true, deprecationErrors: true },
      });
      console.log(`[DB] Successfully connected to MongoDB at ${maskedUri}`);
      break;
    } catch (err) {
      lastError = err;
      console.error(`[DB] MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${err.message}`);
      if (attempt < maxAttempts) await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  if (mongoose.connection.readyState !== 1) {
    // An empty in-memory database is never a valid production fallback: it hides
    // a broken Atlas connection and makes the deployed app look like it has no data.
    if (process.env.USE_MEMORY_DB !== 'true') {
      throw new Error(`MongoDB is unavailable after ${maxAttempts} attempts. Check MONGODB_URI, Atlas network access, and database credentials. Set USE_MEMORY_DB=true only for local development. Last error: ${lastError?.message || 'unknown error'}`);
    }

    console.warn('[DB] External MongoDB unavailable in non-production; using MongoMemoryServer for local development.');
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    await mongoose.connect(mongodInstance.getUri());
    console.log('[DB] Connected to development in-memory MongoDB.');
  }

  // Ensure 2dsphere indexes are created
  mongoose.connection.on('error', (err) => {
    console.error('[DB] MongoDB runtime error:', err);
  });
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongodInstance) {
    await mongodInstance.stop();
  }
}
