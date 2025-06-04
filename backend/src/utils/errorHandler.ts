import { Response } from 'express';
import { logError } from './logger.js';
import { ApiResponse } from '../types/index.js';

/**
 * 错误类型枚举
 */
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR'
}

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR,
    statusCode: number = 500,
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 获取错误状态码
 */
const getErrorStatusCode = (error: any): number => {
  if (error instanceof AppError) {
    return error.statusCode;
  }

  // 根据错误类型返回相应状态码
  if (error.name === 'ValidationError') return 400;
  if (error.name === 'UnauthorizedError') return 401;
  if (error.name === 'ForbiddenError') return 403;
  if (error.name === 'NotFoundError') return 404;
  if (error.name === 'ConflictError') return 409;
  if (error.name === 'TooManyRequestsError') return 429;

  return 500;
};

/**
 * 获取错误类型
 */
const getErrorType = (error: any): ErrorType => {
  if (error instanceof AppError) {
    return error.type;
  }

  // 根据错误名称推断类型
  if (error.name === 'ValidationError') return ErrorType.VALIDATION_ERROR;
  if (error.name === 'UnauthorizedError') return ErrorType.AUTHENTICATION_ERROR;
  if (error.name === 'ForbiddenError') return ErrorType.AUTHORIZATION_ERROR;
  if (error.name === 'NotFoundError') return ErrorType.NOT_FOUND_ERROR;
  if (error.name === 'PrismaClientKnownRequestError') return ErrorType.DATABASE_ERROR;

  return ErrorType.INTERNAL_SERVER_ERROR;
};

/**
 * 格式化错误消息
 */
const formatErrorMessage = (error: any, customMessage?: string): string => {
  if (customMessage) {
    return customMessage;
  }

  if (error instanceof AppError) {
    return error.message;
  }

  // 处理常见错误类型
  if (error.name === 'ValidationError') {
    return '请求参数验证失败';
  }

  if (error.name === 'UnauthorizedError') {
    return '身份验证失败';
  }

  if (error.name === 'ForbiddenError') {
    return '权限不足';
  }

  if (error.name === 'NotFoundError') {
    return '请求的资源不存在';
  }

  if (error.name === 'PrismaClientKnownRequestError') {
    return '数据库操作失败';
  }

  return '服务器内部错误';
};

/**
 * 主要错误处理函数
 */
export const errorHandler = (
  error: any,
  res: Response<ApiResponse>,
  customMessage?: string
): void => {
  const statusCode = getErrorStatusCode(error);
  const errorType = getErrorType(error);
  const message = formatErrorMessage(error, customMessage);

  // 记录错误日志
  logError('API错误', {
    message,
    type: errorType,
    statusCode,
    stack: error.stack,
    details: error instanceof AppError ? error.details : undefined
  });

  // 构建错误响应
  const errorResponse: ApiResponse = {
    success: false,
    message,
    error: {
      type: errorType,
      code: statusCode
    }
  };

  // 在开发环境中包含更多错误信息
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error!.stack = error.stack;
    errorResponse.error!.details = error instanceof AppError ? error.details : error.message;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 创建特定类型的错误
 */
export const createValidationError = (message: string, details?: any): AppError => {
  return new AppError(message, ErrorType.VALIDATION_ERROR, 400, true, details);
};

export const createAuthenticationError = (message: string = '身份验证失败'): AppError => {
  return new AppError(message, ErrorType.AUTHENTICATION_ERROR, 401);
};

export const createAuthorizationError = (message: string = '权限不足'): AppError => {
  return new AppError(message, ErrorType.AUTHORIZATION_ERROR, 403);
};

export const createNotFoundError = (message: string = '资源不存在'): AppError => {
  return new AppError(message, ErrorType.NOT_FOUND_ERROR, 404);
};

export const createDatabaseError = (message: string, details?: any): AppError => {
  return new AppError(message, ErrorType.DATABASE_ERROR, 500, true, details);
};

export const createAIServiceError = (message: string, details?: any): AppError => {
  return new AppError(message, ErrorType.AI_SERVICE_ERROR, 502, true, details);
};

export const createFileUploadError = (message: string, details?: any): AppError => {
  return new AppError(message, ErrorType.FILE_UPLOAD_ERROR, 400, true, details);
};

export const createRateLimitError = (message: string = '请求过于频繁'): AppError => {
  return new AppError(message, ErrorType.RATE_LIMIT_ERROR, 429);
};

/**
 * 异步错误包装器
 */
export const asyncErrorHandler = (fn: Function) => {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 全局未捕获异常处理
 */
export const setupGlobalErrorHandlers = (): void => {
  // 处理未捕获的Promise拒绝
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logError('未处理的Promise拒绝', { reason, promise });
    // 在生产环境中可能需要优雅地关闭服务器
  });

  // 处理未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logError('未捕获的异常', { error: error.message, stack: error.stack });
    // 在生产环境中应该退出进程
    process.exit(1);
  });
};