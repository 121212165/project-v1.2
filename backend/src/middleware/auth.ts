import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma/index.js';
import { appConfig } from '../config/index.js';
import { logError } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';

const prisma = new PrismaClient();

// 扩展Request接口以包含用户信息
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

/**
 * JWT认证中间件
 * 验证请求头中的JWT token并将用户信息添加到request对象
 */
export const authenticateToken = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      res.status(401).json({
        success: false,
        error: '访问被拒绝，未提供认证令牌'
      });
      return;
    }

    // 验证JWT token
    const decoded = jwt.verify(token, appConfig.jwt.secret) as any;
    
    // 从数据库获取最新的用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: '用户不存在'
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        error: '账户已被禁用'
      });
      return;
    }

    // 将用户信息添加到request对象
    req.user = user;
    next();

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: '无效的认证令牌'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: '认证令牌已过期'
      });
      return;
    }

    logError('认证中间件错误', error);
    res.status(500).json({
      success: false,
      error: '认证验证失败'
    });
  }
};

/**
 * 可选认证中间件
 * 如果提供了token则验证，否则继续执行（用户信息为undefined）
 */
export const optionalAuth = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : null;

    if (!token) {
      // 没有token，继续执行
      next();
      return;
    }

    // 有token，尝试验证
    const decoded = jwt.verify(token, appConfig.jwt.secret) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        isActive: true
      }
    });

    if (user && user.isActive) {
      req.user = user;
    }

    next();

  } catch (error) {
    // token无效，但不阻止请求继续
    next();
  }
};

/**
 * 角色权限中间件工厂
 * 检查用户是否具有指定角色
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '需要认证'
      });
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: '权限不足'
      });
      return;
    }

    next();
  };
};

/**
 * 管理员权限中间件
 */
export const requireAdmin = requireRole(['ADMIN']);

/**
 * 管理员或版主权限中间件
 */
export const requireModerator = requireRole(['ADMIN', 'MODERATOR']);

/**
 * 用户自己或管理员权限中间件
 * 用于用户只能访问自己的资源，或管理员可以访问所有资源的场景
 */
export const requireOwnerOrAdmin = (getUserId: (req: Request) => number) => {
  return (req: Request, res: Response<ApiResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: '需要认证'
      });
      return;
    }

    const resourceUserId = getUserId(req);
    const isOwner = req.user.id === resourceUserId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: '只能访问自己的资源'
      });
      return;
    }

    next();
  };
};