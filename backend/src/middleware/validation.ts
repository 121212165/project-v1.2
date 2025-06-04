import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logError } from '../utils/logger.js';

/**
 * 验证请求中间件
 */
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      logError('请求验证失败', { 
        error: error.details[0].message,
        path: req.path,
        body: req.body 
      });
      
      return res.status(400).json({
        success: false,
        error: '请求参数验证失败',
        details: error.details[0].message
      });
    }
    
    next();
  };
};

/**
 * 文本分析请求验证模式
 */
export const textAnalysisSchema = Joi.object({
  content: Joi.string().required().min(1).max(10000).messages({
    'string.empty': '内容不能为空',
    'string.min': '内容不能为空',
    'string.max': '内容长度不能超过10000字符',
    'any.required': '内容是必需的'
  }),
  sessionId: Joi.string().optional(),
  scenario: Joi.string().optional(),
  useCache: Joi.boolean().optional().default(true),
  options: Joi.object({
    checkForbiddenWords: Joi.boolean().optional().default(true),
    sentimentAnalysis: Joi.boolean().optional().default(true),
    brandRiskAssessment: Joi.boolean().optional().default(true)
  }).optional()
});

/**
 * 图文分析请求验证模式
 */
export const imageAnalysisSchema = Joi.object({
  text: Joi.string().optional().max(5000).messages({
    'string.max': '文本长度不能超过5000字符'
  }),
  sessionId: Joi.string().optional(),
  scenario: Joi.string().optional(),
  useCache: Joi.boolean().optional().default(true)
});

/**
 * 会话创建验证模式
 */
export const sessionSchema = Joi.object({
  userId: Joi.string().optional(),
  scenario: Joi.string().optional(),
  metadata: Joi.object().optional()
});

/**
 * 用户注册验证模式
 */
export const userRegistrationSchema = Joi.object({
  username: Joi.string().required().min(3).max(30).alphanum().messages({
    'string.empty': '用户名不能为空',
    'string.min': '用户名至少需要3个字符',
    'string.max': '用户名不能超过30个字符',
    'string.alphanum': '用户名只能包含字母和数字',
    'any.required': '用户名是必需的'
  }),
  email: Joi.string().required().email().messages({
    'string.empty': '邮箱不能为空',
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱是必需的'
  }),
  password: Joi.string().required().min(6).max(128).messages({
    'string.empty': '密码不能为空',
    'string.min': '密码至少需要6个字符',
    'string.max': '密码不能超过128个字符',
    'any.required': '密码是必需的'
  })
});

/**
 * 用户登录验证模式
 */
export const userLoginSchema = Joi.object({
  email: Joi.string().required().email().messages({
    'string.empty': '邮箱不能为空',
    'string.email': '请输入有效的邮箱地址',
    'any.required': '邮箱是必需的'
  }),
  password: Joi.string().required().messages({
    'string.empty': '密码不能为空',
    'any.required': '密码是必需的'
  })
});