import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] || fallback;
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  AI_API_KEY: requireEnv('OPENROUTER_API_KEY'),
  AI_BASE_URL: process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1',
  AI_MODEL: process.env.AI_MODEL || 'deepseek/deepseek-r1',

  JWT_SECRET: requireEnv('JWT_SECRET', 'dev-secret-change-in-production'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  DATABASE_URL: requireEnv('DATABASE_URL'),

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
