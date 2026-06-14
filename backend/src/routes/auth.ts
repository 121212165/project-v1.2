import { Router, Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma/index.js';
import { validateRequest, asyncHandler, rateLimiter } from '../middleware/index.js';
import { config } from '../config/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';
import { SessionService } from '../services/session.service.js';

const router = Router();
const prisma = new PrismaClient();

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  nickname: Joi.string().max(50).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post('/register', rateLimiter, validateRequest(registerSchema), asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const { username, email, password, nickname } = req.body;
  try {
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
    if (existingUser) { res.status(400).json({ success: false, error: '用户名或邮箱已被使用' }); return; }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { username, email, password: hashedPassword, nickname, role: 'USER' },
      select: { id: true, username: true, email: true, nickname: true, role: true, createdAt: true }
    });

    const { token, sessionId } = await SessionService.createSession(user.id, req.headers['user-agent'], req.ip);
    logInfo('用户注册成功', { userId: user.id, username: user.username });
    res.status(201).json({ success: true, data: { user, token, sessionId }, message: '注册成功' });
  } catch (error: any) {
    logError('用户注册失败', error);
    res.status(500).json({ success: false, error: error.message || '注册失败' });
  }
}));

router.post('/login', rateLimiter, validateRequest(loginSchema), asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) { res.status(401).json({ success: false, error: '邮箱或密码错误' }); return; }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) { res.status(401).json({ success: false, error: '邮箱或密码错误' }); return; }
    if (!user.isActive) { res.status(401).json({ success: false, error: '账户已被禁用' }); return; }

    const { token, sessionId } = await SessionService.createSession(user.id, req.headers['user-agent'], req.ip);
    const { password: _, ...userWithoutPassword } = user;
    logInfo('用户登录成功', { userId: user.id });
    res.json({ success: true, data: { user: userWithoutPassword, token, sessionId }, message: '登录成功' });
  } catch (error: any) {
    logError('用户登录失败', error);
    res.status(500).json({ success: false, error: error.message || '登录失败' });
  }
}));

router.get('/profile', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  if (!token) { res.status(401).json({ success: false, error: '未提供认证令牌' }); return; }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, username: true, email: true, nickname: true, avatar: true, role: true, isActive: true, createdAt: true }
    });
    if (!user) { res.status(404).json({ success: false, error: '用户不存在' }); return; }
    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(401).json({ success: false, error: '无效的认证令牌' });
  }
}));

router.post('/logout', asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
  res.json({ success: true, message: '登出成功' });
}));

export { router as authRouter };
