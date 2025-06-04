import { Router, Request, Response } from 'express';
import Joi from 'joi';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/prisma/index.js';
import { validateRequest, asyncHandler, rateLimiter } from '../middleware/index.js';
import { appConfig } from '../config/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';
import { WechatService } from '../services/wechat.service.js';
import { SmsService } from '../services/sms.service.js';
import { SessionService } from '../services/session.service.js';

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
  registerType: Joi.string().valid('email', 'phone', 'wechat').required().messages({
    'any.only': '注册类型必须是email、phone或wechat之一',
    'any.required': '注册类型是必需的'
  }),
  email: Joi.string().email().when('registerType', {
    is: 'email',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.email': '请提供有效的邮箱地址',
    'any.required': '邮箱是必需的'
  }),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).when('registerType', {
    is: 'phone',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.pattern.base': '请提供有效的手机号码',
    'any.required': '手机号是必需的'
  }),
  password: Joi.string().min(6).max(128).when('registerType', {
    is: Joi.valid('email', 'phone'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.min': '密码至少需要6个字符',
    'string.max': '密码不能超过128个字符',
    'any.required': '密码是必需的'
  }),
  wechatCode: Joi.string().when('registerType', {
    is: 'wechat',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': '微信授权码是必需的'
  }),
  verificationCode: Joi.string().when('registerType', {
    is: 'phone',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': '验证码是必需的'
  }),
  nickname: Joi.string().max(50).optional(),
  avatar: Joi.string().uri().optional()
});

const loginSchema = Joi.object({
  loginType: Joi.string().valid('email', 'phone', 'wechat').required().messages({
    'any.only': '登录类型必须是email、phone或wechat之一',
    'any.required': '登录类型是必需的'
  }),
  email: Joi.string().email().when('loginType', {
    is: 'email',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.email': '请提供有效的邮箱地址',
    'any.required': '邮箱是必需的'
  }),
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).when('loginType', {
    is: 'phone',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'string.pattern.base': '请提供有效的手机号码',
    'any.required': '手机号是必需的'
  }),
  password: Joi.string().when('loginType', {
    is: Joi.valid('email', 'phone'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': '密码是必需的'
  }),
  wechatCode: Joi.string().when('loginType', {
    is: 'wechat',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': '微信授权码是必需的'
  })
});

// 短信验证码发送验证模式
const smsCodeSchema = Joi.object({
  phone: Joi.string().pattern(/^1[3-9]\d{9}$/).required().messages({
    'string.pattern.base': '请提供有效的手机号码',
    'any.required': '手机号是必需的'
  }),
  type: Joi.string().valid('register', 'login', 'reset_password').required().messages({
    'any.only': '验证码类型必须是register、login或reset_password之一',
    'any.required': '验证码类型是必需的'
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
 * @route POST /api/auth/send-sms-code
 * @desc 发送短信验证码
 * @access Public
 */
router.post(
  '/send-sms-code',
  rateLimiter,
  validateRequest(smsCodeSchema),
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    const { phone, type } = req.body;

    try {
      if (!appConfig.sms.enabled) {
        res.status(400).json({
          success: false,
          error: '短信服务未启用'
        });
        return;
      }

      // 如果是注册，检查手机号是否已存在
      if (type === 'register') {
        const existingUser = await prisma.user.findUnique({
          where: { phone }
        });

        if (existingUser) {
          res.status(400).json({
            success: false,
            error: '该手机号已被注册'
          });
          return;
        }
      }

      // 如果是登录，检查手机号是否存在
      if (type === 'login') {
        const user = await prisma.user.findUnique({
          where: { phone }
        });

        if (!user) {
          res.status(400).json({
            success: false,
            error: '该手机号未注册'
          });
          return;
        }
      }

      await SmsService.sendVerificationCode(phone, type);

      res.json({
        success: true,
        message: '验证码发送成功'
      });

    } catch (error: any) {
      logError('发送短信验证码失败', error);
      res.status(400).json({
        success: false,
        error: error.message || '发送验证码失败'
      });
    }
  })
);

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
    const { 
      username, 
      email, 
      phone, 
      password, 
      registerType, 
      wechatCode, 
      verificationCode,
      nickname,
      avatar
    } = req.body;

    try {
      let userData: any = {
        username,
        role: 'USER'
      };

      // 检查用户名是否已存在
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });

      if (existingUsername) {
        res.status(400).json({
          success: false,
          error: '该用户名已被使用'
        });
        return;
      }

      // 根据注册类型处理不同的注册逻辑
      switch (registerType) {
        case 'email':
          // 检查邮箱是否已存在
          const existingEmail = await prisma.user.findUnique({
            where: { email }
          });

          if (existingEmail) {
            res.status(400).json({
              success: false,
              error: '该邮箱已被注册'
            });
            return;
          }

          // 加密密码
          const hashedPassword = await bcrypt.hash(password, appConfig.bcrypt.saltRounds);
          userData.email = email;
          userData.password = hashedPassword;
          break;

        case 'phone':
          // 检查手机号是否已存在
          const existingPhone = await prisma.user.findUnique({
            where: { phone }
          });

          if (existingPhone) {
            res.status(400).json({
              success: false,
              error: '该手机号已被注册'
            });
            return;
          }

          // 验证短信验证码
          await SmsService.verifyCode(phone, verificationCode, 'register');

          // 如果提供了密码，则加密
          if (password) {
            const hashedPassword = await bcrypt.hash(password, appConfig.bcrypt.saltRounds);
            userData.password = hashedPassword;
          }
          userData.phone = phone;
          break;

        case 'wechat':
          if (!appConfig.wechat.enabled) {
            res.status(400).json({
              success: false,
              error: '微信登录未启用'
            });
            return;
          }

          // 获取微信用户信息
          const wechatUserInfo = await WechatService.validateCodeAndGetUserInfo(wechatCode);
          
          // 检查微信用户是否已存在
          const existingWechatUser = await prisma.user.findFirst({
            where: {
              OR: [
                { wechatId: wechatUserInfo.openid },
                wechatUserInfo.unionid ? { wechatUnionId: wechatUserInfo.unionid } : {}
              ]
            }
          });

          if (existingWechatUser) {
            res.status(400).json({
              success: false,
              error: '该微信账号已被注册'
            });
            return;
          }

          userData.wechatId = wechatUserInfo.openid;
          userData.wechatUnionId = wechatUserInfo.unionid;
          userData.nickname = nickname || wechatUserInfo.nickname;
          userData.avatar = avatar || wechatUserInfo.avatar;
          userData.gender = wechatUserInfo.gender;
          break;

        default:
          res.status(400).json({
            success: false,
            error: '不支持的注册类型'
          });
          return;
      }

      // 创建用户
      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          nickname: true,
          avatar: true,
          role: true,
          createdAt: true
        }
      });

      // 创建会话
      const { token, sessionId } = await SessionService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip,
        req.headers['user-agent']
      );

      logInfo('用户注册成功', {
        userId: user.id,
        username: user.username,
        registerType,
        ip: req.ip
      });

      res.status(201).json({
        success: true,
        data: {
          user,
          token,
          sessionId
        },
        message: '注册成功'
      });

    } catch (error: any) {
      logError('用户注册失败', error);
      res.status(500).json({
        success: false,
        error: error.message || '注册失败，请稍后重试'
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
    const { 
      email, 
      phone, 
      password, 
      loginType, 
      wechatCode, 
      verificationCode 
    } = req.body;

    try {
      let user: any = null;

      // 根据登录类型处理不同的登录逻辑
      switch (loginType) {
        case 'email':
          // 查找用户
          user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              nickname: true,
              avatar: true,
              password: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          });

          if (!user) {
            res.status(401).json({
              success: false,
              error: '邮箱或密码错误'
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
          break;

        case 'phone':
          // 查找用户
          user = await prisma.user.findUnique({
            where: { phone },
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              nickname: true,
              avatar: true,
              password: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          });

          if (!user) {
            res.status(401).json({
              success: false,
              error: '手机号未注册'
            });
            return;
          }

          if (password) {
            // 密码登录
            const isPasswordValid = await bcrypt.compare(password, user.password || '');
            if (!isPasswordValid) {
              res.status(401).json({
                success: false,
                error: '手机号或密码错误'
              });
              return;
            }
          } else {
            // 验证码登录
            await SmsService.verifyCode(phone, verificationCode, 'login');
          }
          break;

        case 'wechat':
          if (!appConfig.wechat.enabled) {
            res.status(400).json({
              success: false,
              error: '微信登录未启用'
            });
            return;
          }

          // 获取微信用户信息
          const wechatUserInfo = await WechatService.validateCodeAndGetUserInfo(wechatCode);
          
          // 查找微信用户
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { wechatId: wechatUserInfo.openid },
                wechatUserInfo.unionid ? { wechatUnionId: wechatUserInfo.unionid } : {}
              ]
            },
            select: {
              id: true,
              username: true,
              email: true,
              phone: true,
              nickname: true,
              avatar: true,
              wechatId: true,
              wechatUnionId: true,
              role: true,
              isActive: true,
              createdAt: true
            }
          });

          if (!user) {
            res.status(401).json({
              success: false,
              error: '微信账号未注册，请先注册'
            });
            return;
          }
          break;

        default:
          res.status(400).json({
            success: false,
            error: '不支持的登录类型'
          });
          return;
      }

      // 检查账户是否激活
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          error: '账户已被禁用'
        });
        return;
      }

      // 创建会话
      const { token, sessionId } = await SessionService.createSession(
        user.id,
        req.headers['user-agent'],
        req.ip,
        req.headers['user-agent']
      );

      // 移除密码字段
      const { password: _, ...userWithoutPassword } = user;

      logInfo('用户登录成功', {
        userId: user.id,
        username: user.username,
        loginType,
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          user: userWithoutPassword,
          token,
          sessionId
        },
        message: '登录成功'
      });

    } catch (error: any) {
      logError('用户登录失败', error);
      res.status(500).json({
        success: false,
        error: error.message || '登录失败，请稍后重试'
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
  authenticateToken,
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    try {
      const userId = (req as any).user.id;
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      // 验证会话
      const sessionInfo = await SessionService.validateSession(token!);
      if (!sessionInfo.isValid) {
        res.status(401).json({
          success: false,
          error: '会话已失效，请重新登录'
        });
        return;
      }
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          nickname: true,
          avatar: true,
          gender: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        res.status(404).json({
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
        data: { 
          user,
          session: sessionInfo.session
        },
        message: '获取用户信息成功'
      });

    } catch (error: any) {
      logError('获取用户信息失败', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取用户信息失败'
      });
    }
  })
);

/**
 * @route POST /api/auth/logout
 * @desc 用户登出
 * @access Private
 */
router.post(
  '/logout',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      const userId = (req as any).user.id;
      
      if (token) {
        // 使会话失效
        await SessionService.invalidateSession(token);
      }
      
      logInfo('用户登出', {
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: '登出成功'
      });

    } catch (error: any) {
      logError('用户登出失败', error);
      res.status(500).json({
        success: false,
        error: error.message || '登出失败'
      });
    }
  })
);

// 登出所有设备
router.post(
  '/logout-all',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    try {
      const userId = (req as any).user.id;
      
      // 使用户所有会话失效
      await SessionService.invalidateAllUserSessions(userId);
      
      logInfo('用户登出所有设备', {
        userId,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        message: '已登出所有设备'
      });

    } catch (error: any) {
      logError('用户登出所有设备失败', error);
      res.status(500).json({
        success: false,
        error: error.message || '登出失败'
      });
    }
  })
);

// 获取用户活跃会话
router.get(
  '/sessions',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    try {
      const userId = (req as any).user.id;
      
      const sessions = await SessionService.getUserActiveSessions(userId);
      
      res.json({
        success: true,
        data: { sessions },
        message: '获取会话列表成功'
      });

    } catch (error: any) {
      logError('获取用户会话失败', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取会话失败'
      });
    }
  })
);

// 删除指定会话
router.delete(
  '/sessions/:sessionId',
  authenticateToken,
  asyncHandler(async (req: Request, res: Response<ApiResponse>) => {
    try {
      const userId = (req as any).user.id;
      const { sessionId } = req.params;
      
      // 验证会话是否属于当前用户
      const session = await prisma.userSession.findFirst({
        where: {
          id: sessionId,
          userId: userId,
          isActive: true
        }
      });
      
      if (!session) {
        res.status(404).json({
          success: false,
          error: '会话不存在或已失效'
        });
        return;
      }
      
      await SessionService.invalidateSession(session.token);
      
      logInfo('用户删除指定会话', {
        userId,
        sessionId,
        ip: req.ip
      });

      res.json({
        success: true,
        message: '会话已删除'
      });

    } catch (error: any) {
      logError('删除会话失败', error);
      res.status(500).json({
        success: false,
        error: error.message || '删除会话失败'
      });
    }
  })
);

export { router as authRouter, verifyToken };