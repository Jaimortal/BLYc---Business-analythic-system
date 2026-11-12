import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root or current working directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

export const envConfig = {
  PORT: process.env.PORT || '5000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || 'blyc_development_super_secure_random_jwt_secret_64_bytes_minimum',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'blyc_development_cookie_secret_key_123',
  MONGODB_URI: process.env.MONGODB_URI || '',
  PYTHON_ENGINE_URL: process.env.PYTHON_ENGINE_URL || 'http://127.0.0.1:8001',
  GROQ_API_KEY: process.env.GROQ_API_KEY || ''
};
