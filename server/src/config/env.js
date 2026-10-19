import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const env = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pujomap',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  JWT_SECRET: process.env.JWT_SECRET || '',
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '2h',
  REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '90d',
  REFRESH_TOKEN_DAYS: parseInt(process.env.REFRESH_TOKEN_DAYS || '90', 10),
  REQUEST_TIMEOUT_MS: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  SHUTDOWN_TIMEOUT_MS: parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10),
  DB_MAX_POOL_SIZE: parseInt(process.env.DB_MAX_POOL_SIZE || '20', 10),
  DB_MIN_POOL_SIZE: parseInt(process.env.DB_MIN_POOL_SIZE || '1', 10),
  REDIS_URL: process.env.REDIS_URL || '',
  REDIS_CACHE_PREFIX: process.env.REDIS_CACHE_PREFIX || 'pandalgo:cache:',
  REDIS_CONNECT_TIMEOUT_MS: parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '1500', 10),
  
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',

  // Crowd parameters
  CROWD_RADIUS_METERS: parseInt(process.env.CROWD_RADIUS_METERS || '100', 10),
  CROWD_FRESHNESS_MINUTES: parseInt(process.env.CROWD_FRESHNESS_MINUTES || '15', 10),
  CROWD_REPORT_COOLDOWN_MINUTES: parseInt(process.env.CROWD_REPORT_COOLDOWN_MINUTES || '5', 10),
  CROWD_VISION_SERVICE_URL: process.env.CROWD_VISION_SERVICE_URL || '',
  TOMTOM_API_KEY: process.env.TOMTOM_API_KEY || '',

  // Dev Bot AI Assistant
  DEV_BOT_ENABLED: process.env.DEV_BOT_ENABLED !== 'false',
  AI_PROVIDER: process.env.AI_PROVIDER || (process.env.GROQ_API_KEY ? 'groq' : 'gemini'),
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  AI_MODEL: process.env.AI_MODEL || (process.env.GROQ_API_KEY ? 'openai/gpt-oss-120b' : 'gemini-2.5-flash'),
  DEV_BOT_MAX_MESSAGE_LENGTH: parseInt(process.env.DEV_BOT_MAX_MESSAGE_LENGTH || '4000', 10),
  DEV_BOT_IMPORT_MAX_ROWS: parseInt(process.env.DEV_BOT_IMPORT_MAX_ROWS || '200', 10),
  WEB_SEARCH_ENABLED: process.env.WEB_SEARCH_ENABLED !== 'false',
  WEB_SEARCH_MAX_RESULTS: Math.min(parseInt(process.env.WEB_SEARCH_MAX_RESULTS || '4', 10), 6),
  API_RATE_LIMIT_WINDOW_MS: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10),
  API_RATE_LIMIT_MAX: parseInt(process.env.API_RATE_LIMIT_MAX || '300', 10),
  AUTH_RATE_LIMIT_MAX: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '30', 10),
  CROWD_RATE_LIMIT_MAX: parseInt(process.env.CROWD_RATE_LIMIT_MAX || '20', 10),
};

if (env.NODE_ENV !== 'test' && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters. Refusing to start with an insecure secret.');
}
