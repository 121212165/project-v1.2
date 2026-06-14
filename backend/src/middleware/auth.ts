import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma/index.js';
import { config } from '../config/index.js';
import { ApiResponse } from '../types/index.js';

const prisma = new PrismaClient();

export const authenticateToken = async (req: Request, res: Response<ApiResponse>, next: NextFunction): Promise<void> => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7) : null;
    if (!token) { res.status(401).json({ success: false, error: '未提供认证令牌' }); return; }

    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, username: true, role: true, isActive: true }
    });
    if (!user) { res.status(401).json({ success: false, error: '用户不存在' }); return; }
    if (!user.isActive) { res.status(401).json({ success: false, error: '账户已被禁用' }); return; }

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: '无效的认证令牌' }); return;
    }
    res.status(500).json({ success: false, error: '认证验证失败' });
  }
};
