import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import compression from 'compression';
import Joi from 'joi';
import { config } from '../config/index.js';
import { ApiResponse } from '../types/index.js';

export { authenticateToken } from './auth.js';

export const errorHandler = (error: Error, req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
  const statusCode = error.name === 'ValidationError' ? 400 : error.name === 'UnauthorizedError' ? 401 : 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? '服务器内部错误' : error.message,
    ...(config.isDev && { stack: error.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response<ApiResponse>): void => {
  res.status(404).json({ success: false, error: '请求的资源不存在' });
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  if (config.isDev) {
    const start = Date.now();
    res.on('finish', () => console.log(`${req.method} ${req.url} - ${res.statusCode} - ${Date.now() - start}ms`));
  }
  next();
};

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const securityMiddleware = helmet({
  contentSecurityPolicy: {
    directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], imgSrc: ["'self'", "data:", "https:"] },
  },
  crossOriginEmbedderPolicy: false
});

export const compressionMiddleware = compression({ threshold: 1024 });

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    if (error) {
      res.status(400).json({ success: false, error: `参数验证失败: ${error.details[0].message}` });
      return;
    }
    next();
  };
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
