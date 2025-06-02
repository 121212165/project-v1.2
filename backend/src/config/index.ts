import dotenv from 'dotenv';
import { EnvConfig } from '../types/index.js';

// 加载环境变量
dotenv.config();

// 验证必需的环境变量
function validateEnv(): EnvConfig {
  const requiredEnvVars = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    DASHSCOPE_TOKEN: process.env.DASHSCOPE_TOKEN || 'demo-token',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
  };

  // 在开发环境中，如果没有配置DASHSCOPE_TOKEN，给出警告
  if (!process.env.DASHSCOPE_TOKEN && requiredEnvVars.NODE_ENV === 'development') {
    console.warn('⚠️  DASHSCOPE_TOKEN 未配置，使用默认值。请在生产环境中配置真实的token。');
  }

  // 在生产环境中，JWT_SECRET必须配置
  if (requiredEnvVars.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    console.warn('⚠️  生产环境中应该配置自定义的JWT_SECRET。');
  }

  return requiredEnvVars as EnvConfig;
}

export const config = validateEnv();

// 应用配置
export const appConfig = {
  // 服务器配置
  server: {
    port: config.PORT,
    env: config.NODE_ENV,
    isDevelopment: config.NODE_ENV === 'development',
    isProduction: config.NODE_ENV === 'production'
  },

  // AI服务配置
  ai: {
    dashscopeToken: config.DASHSCOPE_TOKEN,
    models: {
      textAnalysis: 'qwen-turbo',
      imageAnalysis: 'qwen-vl-plus'
    },
    timeout: 30000, // 30秒超时
    retryAttempts: 3
  },

  // 文件上传配置
  upload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  },

  // 日志配置
  logging: {
    level: config.LOG_LEVEL,
    format: config.NODE_ENV === 'production' ? 'json' : 'simple'
  },

  // CORS配置
  cors: {
    origin: config.NODE_ENV === 'production' 
      ? ['https://your-domain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
  },

  // 速率限制配置
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP最多100个请求
    message: '请求过于频繁，请稍后再试'
  },

  // JWT配置
  jwt: {
    secret: config.JWT_SECRET,
    expiresIn: config.JWT_EXPIRES_IN
  },

  // 密码加密配置
  bcrypt: {
    saltRounds: 12
  }
};