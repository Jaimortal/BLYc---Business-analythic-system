import mongoose from 'mongoose';
import { envConfig } from './env.js';

export const connectDB = async (): Promise<boolean> => {
  if (!envConfig.MONGODB_URI) {
    console.warn('[MongoDB] Warning: MONGODB_URI is not set in environment. Running in memory/mock persistence mode for local development.');
    return false;
  }

  try {
    await mongoose.connect(envConfig.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('[MongoDB] Connected successfully to MongoDB Atlas database.');
    return true;
  } catch (err: any) {
    console.error('[MongoDB] Connection error:', err.message);
    console.warn('[MongoDB] Falling back to secure in-memory repository for development.');
    return false;
  }
};
