// 环境配置类型
export interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  OPENROUTER_API_KEY: string;
  OPENROUTER_SITE_URL: string;
  OPENROUTER_SITE_NAME: string;
  LOG_LEVEL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

// 认证相关类型
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: UserProfile;
    token: string;
  };
}

// 分析相关类型
export interface TextAnalysisRequest {
  text: string;
  sessionId?: string;
  scenario?: string;
  useCache?: boolean;
}

export interface ImageAnalysisRequest {
  text?: string;
  sessionId?: string;
  scenario?: string;
  useCache?: boolean;
  // 图片文件通过 multer 处理，不在这里定义
}

export interface AnalysisResponse {
  success: boolean;
  message: string;
  data?: {
    analysis: string;
    taskId: string;
    sessionId?: string;
    timestamp: Date;
    cached?: boolean;
  };
}

// 对话相关类型
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
  metadata?: {
    scenario?: string;
    cached?: boolean;
    tokens?: number;
  };
}

export interface ConversationSession {
  id: string;
  userId: string;
  title?: string;
  messages: ConversationMessage[];
  context: {
    userProfile?: any;
    preferences?: any;
    summary?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date;
}

export interface SessionCreateRequest {
  userId?: string;
}

export interface SessionResponse {
  success: boolean;
  message: string;
  data?: {
    sessionId: string;
    createdAt: Date;
  };
}

// 缓存相关类型
export interface CacheItem<T = any> {
  key: string;
  value: T;
  expiresAt: Date;
  accessCount: number;
  lastAccessed: Date;
}

export interface CacheStats {
  totalItems: number;
  hitRate: number;
  memoryUsage: number;
  oldestItem?: Date;
  newestItem?: Date;
}

// AI服务相关类型
export interface AIServiceConfig {
  apiKey: string;
  baseUrl?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface AIUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  lastRequestAt?: Date;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

// 任务相关类型
export interface AnalysisTask {
  id: string;
  userId: string;
  sessionId?: string;
  type: 'text' | 'image-text';
  content: string;
  imageUrl?: string;
  result?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: {
    scenario?: string;
    cached?: boolean;
    retryCount?: number;
    tokens?: number;
    cost?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// API 响应基础类型
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

// 健康检查类型
export interface HealthCheckResponse {
  success: boolean;
  message: string;
  data: {
    status: 'healthy' | 'unhealthy';
    timestamp: Date;
    services: {
      database: 'connected' | 'disconnected';
      ai: 'available' | 'unavailable';
      cache: 'active' | 'inactive';
      conversation: 'active' | 'inactive';
    };
    stats?: {
      cache: CacheStats;
      ai: AIUsageStats;
      activeSessions: number;
    };
  };
}

// 服务统计类型
export interface ServiceStatsResponse {
  success: boolean;
  message: string;
  data: {
    ai: AIUsageStats;
    cache: CacheStats;
    sessions: {
      total: number;
      active: number;
      averageMessagesPerSession: number;
    };
    timestamp: Date;
  };
}

// 用户角色枚举
export enum UserRole {
  USER = 'USER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
  CREATOR = 'CREATOR'
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Express 扩展类型
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username: string;
        role: string;
        isActive: boolean;
      };
    }
  }
}

// 认证请求类型
export interface AuthenticatedRequest<P = {}, ResBody = any, ReqBody = any, ReqQuery = any> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: number;
    username: string;
    email: string;
    role: UserRole;
  };
}

export {};