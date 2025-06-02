import express from 'express';
import multer from 'multer';
import Joi from 'joi';
import { 
  analyzeText, 
  analyzeImageText, 
  healthCheck,
  createSession,
  getConversationHistory,
  getUserSessions,
  getServiceStats,
  cleanupService
} from '../controllers/analyzeController';
import { validateRequest } from '../middleware/validation';
import { authenticateToken } from '../middleware/auth';
import { logInfo } from '../utils/logger';

const router = express.Router();

// 配置 multer 用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// Joi 验证模式
const textAnalysisSchema = Joi.object({
  text: Joi.string().min(1).max(10000).required().messages({
    'string.empty': '文本内容不能为空',
    'string.min': '文本内容不能为空',
    'string.max': '文本内容不能超过10000字符',
    'any.required': '请提供文本内容'
  }),
  sessionId: Joi.string().optional(),
  scenario: Joi.string().optional(),
  useCache: Joi.boolean().optional().default(true)
});

const imageAnalysisSchema = Joi.object({
  text: Joi.string().max(1000).optional().messages({
    'string.max': '图片描述不能超过1000字符'
  }),
  sessionId: Joi.string().optional(),
  scenario: Joi.string().optional(),
  useCache: Joi.boolean().optional().default(true)
});

const sessionSchema = Joi.object({
  userId: Joi.string().optional()
});

// 错误处理中间件
const handleMulterError = (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: '文件大小超过限制（最大10MB）'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: '只能上传一个文件'
      });
    }
  }
  
  if (error.message === '不支持的文件类型') {
    return res.status(400).json({
      success: false,
      message: '不支持的文件类型，请上传 JPEG、PNG、GIF 或 WebP 格式的图片'
    });
  }
  
  next(error);
};

// 请求日志中间件
router.use((req, res, next) => {
  logInfo('分析API请求', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// 路由定义

/**
 * @route POST /api/analyze/text
 * @desc 文本分析接口（支持多轮对话）
 * @access Private
 */
router.post('/text', 
  authenticateToken,
  validateRequest(textAnalysisSchema),
  analyzeText
);

/**
 * @route POST /api/analyze/image-text
 * @desc 图文分析接口（支持多轮对话）
 * @access Private
 */
router.post('/image-text',
  authenticateToken,
  upload.single('image'),
  handleMulterError,
  validateRequest(imageAnalysisSchema),
  analyzeImageText
);

/**
 * @route POST /api/analyze/session
 * @desc 创建对话会话
 * @access Private
 */
router.post('/session',
  authenticateToken,
  validateRequest(sessionSchema),
  createSession
);

/**
 * @route GET /api/analyze/session/:sessionId/history
 * @desc 获取对话历史
 * @access Private
 */
router.get('/session/:sessionId/history',
  authenticateToken,
  getConversationHistory
);

/**
 * @route GET /api/analyze/sessions
 * @desc 获取用户会话列表
 * @access Private
 */
router.get('/sessions',
  authenticateToken,
  getUserSessions
);

/**
 * @route GET /api/analyze/stats
 * @desc 获取AI服务统计信息
 * @access Private
 */
router.get('/stats',
  authenticateToken,
  getServiceStats
);

/**
 * @route POST /api/analyze/cleanup
 * @desc 清理服务数据
 * @access Private
 */
router.post('/cleanup',
  authenticateToken,
  cleanupService
);

/**
 * @route GET /api/analyze/health
 * @desc 健康检查接口
 * @access Public
 */
router.get('/health', healthCheck);

// 错误处理中间件（针对文件上传）
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: '文件大小超出限制，请上传小于10MB的文件'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: '一次只能上传一个文件'
      });
    }
  }
  
  if (error.message === '不支持的文件类型') {
    return res.status(400).json({
      success: false,
      error: '不支持的文件类型，请上传 JPEG、PNG、GIF 或 WebP 格式的图片'
    });
  }
  
  next(error);
});

export default router;