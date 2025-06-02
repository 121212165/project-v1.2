import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import { appConfig } from '../config/index.js';
import { logError, logWarn } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';

// 导出认证中间件
export {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireModerator,
  requireOwnerOrAdmin
} from './auth.js';

/**
 * 错误处理中间件
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): void => {
  logError('请求处理错误', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // 默认错误响应
  let statusCode = 500;
  let message = '服务器内部错误';

  // 根据错误类型设置状态码和消息
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '请求参数验证失败';
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '未授权访问';
  } else if (error.message.includes('AI分析服务')) {
    statusCode = 503;
    message = error.message;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(appConfig.server.isDevelopment && { stack: error.stack })
  });
};

/**
 * 404 处理中间件
 */
export const notFoundHandler = (
  req: Request,
  res: Response<ApiResponse>
): void => {
  logWarn('404 - 路由未找到', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: '请求的资源不存在'
  });
};

/**
 * 请求日志中间件
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    };

    if (res.statusCode >= 400) {
      logWarn('HTTP请求完成', logData);
    } else {
      // 只在开发环境记录成功请求
      if (appConfig.server.isDevelopment) {
        console.log(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
      }
    }
  });

  next();
};

/**
 * 速率限制中间件
 */
export const rateLimiter = rateLimit({
  windowMs: appConfig.rateLimit.windowMs,
  max: appConfig.rateLimit.max,
  message: {
    success: false,
    error: appConfig.rateLimit.message
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logWarn('速率限制触发', {
      ip: req.ip,
      url: req.url,
      method: req.method
    });
    
    res.status(429).json({
      success: false,
      error: appConfig.rateLimit.message
    });
  }
});

/**
 * 安全中间件配置
 */
export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
});

/**
 * 压缩中间件
 */
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  threshold: 1024 // 只压缩大于1KB的响应
});

/**
 * 请求验证中间件
 */
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      logWarn('请求验证失败', {
        error: error.details[0].message,
        path: error.details[0].path,
        url: req.url
      });
      
      res.status(400).json({
        success: false,
        error: `参数验证失败: ${error.details[0].message}`
      });
      return;
    }
    
    next();
  };
};

/**
 * 异步错误捕获包装器
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};