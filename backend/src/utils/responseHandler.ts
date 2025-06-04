import { Response } from 'express';
import { logError } from './logger.js';

/**
 * 统一响应处理器
 * 提供标准化的API响应格式和错误处理
 */
export class ResponseHandler {
  constructor(private res: Response) {}

  /**
   * 成功响应
   */
  success(data: any, message: string = '操作成功'): void {
    this.res.json({
      success: true,
      message,
      data
    });
  }

  /**
   * 错误响应 - 400 Bad Request
   */
  badRequest(message: string, details?: any): void {
    this.res.status(400).json({
      success: false,
      message,
      details
    });
  }

  /**
   * 错误响应 - 401 Unauthorized
   */
  unauthorized(message: string = '未授权访问'): void {
    this.res.status(401).json({
      success: false,
      message
    });
  }

  /**
   * 错误响应 - 403 Forbidden
   */
  forbidden(message: string = '禁止访问'): void {
    this.res.status(403).json({
      success: false,
      message
    });
  }

  /**
   * 错误响应 - 404 Not Found
   */
  notFound(message: string = '资源未找到'): void {
    this.res.status(404).json({
      success: false,
      message
    });
  }

  /**
   * 错误响应 - 429 Too Many Requests
   */
  tooManyRequests(message: string = '请求过于频繁', usage?: any): void {
    this.res.status(429).json({
      success: false,
      message,
      usage
    });
  }

  /**
   * 错误响应 - 500 Internal Server Error
   */
  internalError(message: string = '服务器内部错误'): void {
    this.res.status(500).json({
      success: false,
      message
    });
  }

  /**
   * 错误响应 - 503 Service Unavailable
   */
  serviceUnavailable(message: string = '服务暂时不可用', data?: any): void {
    this.res.status(503).json({
      success: false,
      message,
      data
    });
  }

  /**
   * 通用错误处理
   */
  handleError(error: any, defaultMessage: string = '操作失败'): void {
    logError(defaultMessage, error);

    if (error.message?.includes('成本限制') || error.message?.includes('使用限制')) {
      this.tooManyRequests(error.message);
      return;
    }

    if (error.message?.includes('未授权') || error.message?.includes('权限')) {
      this.unauthorized(error.message);
      return;
    }

    if (error.message?.includes('不存在') || error.message?.includes('未找到')) {
      this.notFound(error.message);
      return;
    }

    if (error.message?.includes('格式') || error.message?.includes('参数')) {
      this.badRequest(error.message);
      return;
    }

    // 默认为服务器内部错误
    this.internalError(error.message || defaultMessage);
  }

  /**
   * 分页响应
   */
  paginated(data: any[], total: number, page: number, limit: number, message: string = '获取成功'): void {
    this.res.json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  }

  /**
   * 创建资源成功响应 - 201 Created
   */
  created(data: any, message: string = '创建成功'): void {
    this.res.status(201).json({
      success: true,
      message,
      data
    });
  }

  /**
   * 无内容响应 - 204 No Content
   */
  noContent(): void {
    this.res.status(204).send();
  }
}