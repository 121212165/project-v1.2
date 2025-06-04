import dotenv from 'dotenv';
import { EnvConfig } from '../types/index.js';

// 加载环境变量
dotenv.config();

// 验证必需的环境变量
function validateEnv(): EnvConfig {
  const requiredEnvVars = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '3000', 10),
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '8e28ff44-9e3e-4e88-911c-7e0485cf90d3',
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL || 'https://beauty-ai-assistant.com',
    OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME || '美妆AI助手',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    WECHAT_APP_ID: process.env.WECHAT_APP_ID || '',
    WECHAT_APP_SECRET: process.env.WECHAT_APP_SECRET || '',
    SMS_ACCESS_KEY_ID: process.env.SMS_ACCESS_KEY_ID || '',
    SMS_ACCESS_KEY_SECRET: process.env.SMS_ACCESS_KEY_SECRET || '',
    SMS_SIGN_NAME: process.env.SMS_SIGN_NAME || '美妆AI助手',
    SMS_TEMPLATE_CODE: process.env.SMS_TEMPLATE_CODE || ''
  };

  // 在开发环境中，如果没有配置OPENROUTER_API_KEY，给出警告
  if (!process.env.OPENROUTER_API_KEY && requiredEnvVars.NODE_ENV === 'development') {
    console.warn('⚠️  OPENROUTER_API_KEY 未配置，使用默认值。请在生产环境中配置真实的API密钥。');
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
    apiKey: config.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
    // 站点信息（用于OpenRouter排行榜）
    siteInfo: {
      url: config.OPENROUTER_SITE_URL,
      name: config.OPENROUTER_SITE_NAME
    },
    // 主要模型配置
    models: {
      textAnalysis: 'deepseek/deepseek-r1',
      imageAnalysis: 'deepseek/deepseek-r1',
      // 备用模型列表（用于自动回退）
      fallbackModels: [
        'openai/gpt-4o-mini',
        'anthropic/claude-3-haiku',
        'meta-llama/llama-3.1-8b-instruct:free'
      ]
    },
    // OpenRouter特有配置
    routing: {
      enableFallback: true, // 启用自动回退
      requireParameters: true, // 确保模型支持所需参数
      dataCollection: 'deny' // 拒绝数据收集以保护隐私
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
  },

  // 微信配置
  wechat: {
    appId: config.WECHAT_APP_ID,
    appSecret: config.WECHAT_APP_SECRET,
    enabled: !!(config.WECHAT_APP_ID && config.WECHAT_APP_SECRET)
  },

  // 短信服务配置
  sms: {
    accessKeyId: config.SMS_ACCESS_KEY_ID,
    accessKeySecret: config.SMS_ACCESS_KEY_SECRET,
    signName: config.SMS_SIGN_NAME,
    templateCode: config.SMS_TEMPLATE_CODE,
    enabled: !!(config.SMS_ACCESS_KEY_ID && config.SMS_ACCESS_KEY_SECRET)
  },

  // 会话管理配置
  session: {
    maxActiveSessions: 5, // 每个用户最多5个活跃会话
    cleanupInterval: 60 * 60 * 1000, // 1小时清理一次过期会话
    extendOnActivity: true // 活动时自动延长会话
  }
};

// 环境变量类型定义
export const env = config.NODE_ENV;