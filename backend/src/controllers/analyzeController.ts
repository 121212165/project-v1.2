import { Request, Response } from 'express';
import { AIService } from '../services/aiService.js';
import { AnalysisTaskService } from '../services/analysisTaskService.js';
import { ConversationService } from '../services/conversationService.js';
import { logInfo, logError } from '../utils/logger.js';
import { TextAnalysisResponse, ImageAnalysisResponse } from '../types/index.js';
import path from 'path';
import fs from 'fs/promises';

const analysisTaskService = new AnalysisTaskService();
const MAX_TEXT_LENGTH = 10000;
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * 文本分析控制器（支持多轮对话）
 */
export const analyzeText = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, sessionId, scenario, useCache = true } = req.body;
    const userId = req.user?.id || 'anonymous';

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        message: '请提供有效的文本内容'
      });
      return;
    }

    // 成本控制检查
    const costCheck = await AIService.checkCostLimits(userId);
    if (!costCheck.allowed) {
      res.status(429).json({
        success: false,
        message: costCheck.reason || '已达到使用限制',
        usage: costCheck.usage
      });
      return;
    }

    logInfo('开始文本分析', { 
      userId, 
      textLength: text.length, 
      sessionId,
      scenario,
      useCache 
    });

    // 创建分析任务
    const task = await AnalysisTaskService.createTask({
      userId,
      type: 'text',
      content: text,
      status: 'processing',
      metadata: { sessionId, scenario }
    });

    try {
      let result: TextAnalysisResponse;
      
      if (sessionId) {
        // 多轮对话分析
        result = await AIService.analyzeConversation(
          sessionId,
          text,
          'text',
          undefined,
          { useCache }
        ) as TextAnalysisResponse;
      } else {
        // 单次分析
        result = await AIService.analyzeText(text, {
          useCache,
          scenario
        });
      }

      // 更新任务状态
      await AnalysisTaskService.updateTaskStatus(task.id, 'completed', result);

      res.json({
        success: true,
        data: {
          taskId: task.id,
          result,
          sessionId: sessionId || undefined
        }
      });

      logInfo('文本分析完成', { 
        userId, 
        taskId: task.id, 
        score: result.score,
        sessionId 
      });
    } catch (error) {
      // 更新任务状态为失败
      await AnalysisTaskService.updateTaskStatus(task.id, 'failed', {
        error: error instanceof Error ? error.message : '分析失败'
      });
      throw error;
    }
  } catch (error) {
    logError('文本分析失败', error);
    res.status(500).json({
      success: false,
      message: '文本分析失败，请稍后重试'
    });
  }
};

/**
 * 图文分析控制器（支持多轮对话）
 */
export const analyzeImageText = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, sessionId, scenario, useCache = true } = req.body;
    const imageFile = req.file;
    const userId = req.user?.id || 'anonymous';

    if (!imageFile) {
      res.status(400).json({
        success: false,
        message: '请上传图片文件'
      });
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(imageFile.mimetype)) {
      res.status(400).json({
        success: false,
        message: '不支持的图片格式，请上传 JPEG、PNG、GIF 或 WebP 格式的图片'
      });
      return;
    }

    if (imageFile.size > MAX_IMAGE_SIZE) {
      res.status(400).json({
        success: false,
        message: '图片文件过大，请上传小于10MB的图片'
      });
      return;
    }

    // 成本控制检查
    const costCheck = await AIService.checkCostLimits(userId);
    if (!costCheck.allowed) {
      res.status(429).json({
        success: false,
        message: costCheck.reason || '已达到使用限制',
        usage: costCheck.usage
      });
      return;
    }

    logInfo('开始图文分析', {
      userId,
      hasText: !!text,
      imageInfo: { size: imageFile.size, type: imageFile.mimetype },
      sessionId,
      scenario,
      useCache
    });

    // 保存图片文件（如果需要）
    let savedFilePath: string | undefined;
    if (userId !== 'anonymous') {
      const uploadsDir = path.join(process.cwd(), 'uploads', 'images');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      const fileName = `${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(imageFile.originalname) || '.jpg'}`;
      savedFilePath = path.join(uploadsDir, fileName);
      await fs.writeFile(savedFilePath, imageFile.buffer);
    }

    // 创建分析任务
    const task = await AnalysisTaskService.createTask({
      userId,
      type: 'image',
      content: text || '图片分析',
      status: 'processing',
      metadata: { 
        imagePath: savedFilePath,
        sessionId,
        scenario,
        imageInfo: {
          size: imageFile.size,
          type: imageFile.mimetype,
          originalName: imageFile.originalname
        }
      }
    });

    try {
      // 将图片转换为base64格式
      const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
      
      let result: ImageAnalysisResponse;
      
      if (sessionId) {
        // 多轮对话分析
        result = await AIService.analyzeConversation(
          sessionId,
          text || '请分析这张图片',
          'image',
          imageBase64,
          { useCache }
        ) as ImageAnalysisResponse;
      } else {
        // 单次分析
        result = await AIService.analyzeImageAndText(imageBase64, text, {
          useCache,
          scenario
        });
      }

      // 更新任务状态
      await AnalysisTaskService.updateTaskStatus(task.id, 'completed', result);

      res.json({
        success: true,
        data: {
          taskId: task.id,
          result,
          sessionId: sessionId || undefined
        }
      });

      logInfo('图文分析完成', {
        userId,
        taskId: task.id,
        status: result.status,
        sessionId
      });

    } catch (error) {
      // 更新任务状态为失败
      await AnalysisTaskService.updateTaskStatus(task.id, 'failed', {
        error: error instanceof Error ? error.message : '分析失败'
      });
      
      // 清理已保存的文件
      if (savedFilePath) {
        await fs.unlink(savedFilePath).catch(err => logError('清理文件失败', err));
      }
      
      throw error;
    }
  } catch (error) {
    logError('图文分析失败', error);
    res.status(500).json({
      success: false,
      message: '图文分析失败，请稍后重试'
    });
  }
};

/**
 * 创建对话会话
 */
export const createSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const actualUserId = userId || req.user?.id || 'anonymous';
    
    const sessionId = ConversationService.createSession(actualUserId, 'beauty_analysis');
    
    res.json({
      success: true,
      data: {
        sessionId,
        createdAt: new Date().toISOString()
      }
    });
    
    logInfo('创建对话会话', { sessionId, userId: actualUserId });
  } catch (error) {
    logError('创建会话失败', error);
    res.status(500).json({
      success: false,
      message: '创建会话失败，请稍后重试'
    });
  }
};

/**
 * 获取对话历史
 */
export const getConversationHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    if (!sessionId) {
      res.status(400).json({
        success: false,
        message: '请提供会话ID'
      });
      return;
    }
    
    const history = ConversationService.getConversationHistory(
      sessionId,
      Number(limit),
      Number(offset)
    );
    
    const session = ConversationService.getSession(sessionId);
    
    res.json({
      success: true,
      data: {
        sessionId,
        messages: history,
        session: session ? {
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          messageCount: session.messages.length
        } : null
      }
    });
  } catch (error) {
    logError('获取对话历史失败', error);
    res.status(500).json({
      success: false,
      message: '获取对话历史失败，请稍后重试'
    });
  }
};

/**
 * 获取用户会话列表
 */
export const getUserSessions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id || 'anonymous';
    const sessions = ConversationService.getUserSessions(userId);
    
    res.json({
      success: true,
      data: {
        sessions: sessions.map(session => ({
          sessionId: session.sessionId,
          createdAt: session.createdAt,
          lastActivity: session.lastActivity,
          messageCount: session.messages.length,
          context: session.context
        }))
      }
    });
  } catch (error) {
    logError('获取用户会话失败', error);
    res.status(500).json({
      success: false,
      message: '获取用户会话失败，请稍后重试'
    });
  }
};

/**
 * 获取AI服务统计信息
 */
export const getServiceStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = AIService.getUsageStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logError('获取服务统计失败', error);
    res.status(500).json({
      success: false,
      message: '获取服务统计失败，请稍后重试'
    });
  }
};

/**
 * 健康检查控制器
 */
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    const healthResult = await AIService.healthCheck();
    
    const healthStatus = {
      ...healthResult,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    if (healthResult.status === 'unhealthy') {
      res.status(503).json({
        success: false,
        data: healthStatus,
        message: 'AI服务不可用'
      });
      return;
    }

    res.json({
      success: true,
      data: healthStatus,
      message: '服务运行正常'
    });
  } catch (error) {
    logError('健康检查失败', error);
    res.status(500).json({
      success: false,
      message: '健康检查失败，请稍后重试'
    });
  }
};

/**
 * 清理服务数据
 */
export const cleanupService = async (req: Request, res: Response): Promise<void> => {
  try {
    await AIService.cleanup();
    
    res.json({
      success: true,
      message: '服务清理完成'
    });
    
    logInfo('手动触发服务清理');
  } catch (error) {
    logError('服务清理失败', error);
    res.status(500).json({
      success: false,
      message: '服务清理失败，请稍后重试'
    });
  }
};