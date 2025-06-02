import { Router, Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma/index.js';
import { validateRequest, asyncHandler, rateLimiter } from '../middleware/index.js';
import { appConfig } from '../config/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';

const router = Router();
const prisma = new PrismaClient();

// 验证模式
const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.alphanum': '用户名只能包含字母和数字',
    'string.min': '用户名至少需要3个字符',
    'string.max': '用户名不能超过30个字符',
    'any.required': '用户名是必需的'
  }),
  email: Joi.string().email().required().messages({
    'string.email': '请提供有效的邮箱地址',
    'any.required': '邮箱是必需的'
  }),
  password: Joi.string().min(6).max(128).required().messages({
    'string.min': '密码至少需要6个字符',
    'string.max': '密码不能超过128个字符',
    'any.required': '密码是必需的'
  })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': '请提供有效的邮箱地址',
    'any.required': '邮箱是必需的'
  }),
  password: Joi.string().required().messages({
    'any.required': '密码是必需的'
  })
});

// JWT工具函数
const generateToken = (userId: number, email: string, role: string): string => {
  return jwt.sign(
    { userId, email, role },
    appConfig.jwt.secret,
    { expiresIn: appConfig.jwt.expiresIn }
  );
};

const verifyToken = (token: string): any => {
  return jwt.verify(token, appConfig.jwt.secret);
};

/**
 * @route POST /api/auth/register
 * @desc 用户注册
 * @access Public
 */
router.post(
  '/register',
  rateLimiter,
  validateRequest(registerSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    const { username, email, password } = req.body;

    try {
      // 检查用户是否已存在
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email },
            { username }
          ]
        }
      });

      if (existingUser) {
        if (existingUser.email === email) {
          res.status(400).json({
            success: false,
            error: '该邮箱已被注册'
          });
          return;
        }
        if (existingUser.username === username) {
          res.status(400).json({
            success: false,
            error: '该用户名已被使用'
          });
          return;
        }
      }

      // 加密密码
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 创建用户
      const user = await prisma.user.create({
        data: {
          username,
          email,
          password: hashedPassword,
          role: 'USER'
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true
        }
      });

      // 生成JWT token
      const token = generateToken(user.id, user.email, user.role);

      logInfo('用户注册成功', {
        userId: user.id,
        username: user.username,
        email: user.email,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token
        },
        message: '注册成功'
      });

    } catch (error) {
      logError('用户注册失败', error);
      res.status(500).json({
        success: false,
        error: '注册失败，请稍后重试'
      });
    }
  })
);

/**
 * @route POST /api/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post(
  '/login',
  rateLimiter,
  validateRequest(loginSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    const { email, password } = req.body;

    try {
      // 查找用户
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: '邮箱或密码错误'
        });
        return;
      }

      // 检查用户是否激活
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          error: '账户已被禁用，请联系管理员'
        });
        return;
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: '邮箱或密码错误'
        });
        return;
      }

      // 生成JWT token
      const token = generateToken(user.id, user.email, user.role);

      // 返回用户信息（不包含密码）
      const userInfo = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      };

      logInfo('用户登录成功', {
        userId: user.id,
        username: user.username,
        email: user.email,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          user: userInfo,
          token
        },
        message: '登录成功'
      });

    } catch (error) {
      logError('用户登录失败', error);
      res.status(500).json({
        success: false,
        error: '登录失败，请稍后重试'
      });
    }
  })
);

/**
 * @route GET /api/auth/profile
 * @desc 获取用户信息
 * @access Private
 */
router.get(
  '/profile',
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({
        success: false,
        error: '未提供认证令牌'
      });
      return;
    }

    try {
      // 验证token
      const decoded = verifyToken(token) as any;
      
      // 获取用户信息
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
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

      res.json({
        success: true,
        data: { user },
        message: '获取用户信息成功'
      });

    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          error: '无效的认证令牌'
        });
        return;
      }

      logError('获取用户信息失败', error);
      res.status(500).json({
        success: false,
        error: '获取用户信息失败'
      });
    }
  })
);

/**
 * @route POST /api/auth/logout
 * @desc 用户登出（客户端处理）
 * @access Private
 */
router.post(
  '/logout',
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    // JWT是无状态的，登出主要由客户端处理（删除token）
    // 这里可以记录登出日志
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = verifyToken(token) as any;
        logInfo('用户登出', {
          userId: decoded.userId,
          email: decoded.email,
          ip: req.ip
        });
      } catch (error) {
        // Token无效，忽略错误
      }
    }

    res.json({
      success: true,
      message: '登出成功'
    });
  })
);

export { router as authRouter, verifyToken };