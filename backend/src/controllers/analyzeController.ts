// 导入必要的模块
import { Request, Response } from 'express';
import { 
  AIService, 
  IAnalysisService, 
  TextAnalysisRequest, 
  ImageAnalysisRequest,
  AnalysisTaskService,
  ConversationService 
} from '../services/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { TextAnalysisResponse, ImageAnalysisResponse } from '../types/index.js';
import path from 'path';
import fs from 'fs/promises';
import { config } from '../config/analysis.config.js';
import { ResponseHandler } from '../utils/responseHandler.js';
import { InputValidator } from '../utils/inputValidator.js';
import { FileHandler } from '../utils/fileHandler.js';
import { AnalysisTaskHandler } from '../utils/analysisTaskHandler.js';
import { SessionManager } from '../utils/sessionManager.js';
import { HealthChecker } from '../utils/healthChecker.js';

// 配置模块
// 响应处理模块
// 输入验证模块
// 文件处理模块
// 分析任务模块
// 会话管理模块
// 健康检查模块
/**
 * 文本分析控制器（支持多轮对话）
 */
export const analyzeText = async (req: Request, res: Response): Promise<void> => {
  const responseHandler = new ResponseHandler(res);
  const taskHandler = new AnalysisTaskHandler();
  
  try {
    const { text, sessionId, scenario, useCache = true } = req.body;
    const userId = req.user?.id || 'anonymous';

    if (!InputValidator.validateText(text)) {
      return responseHandler.badRequest('请提供有效的文本内容');
    }

    await taskHandler.checkCostLimits(userId);
    await taskHandler.handleTextAnalysis(userId, text, sessionId, scenario, useCache);
    
  } catch (error) {
    responseHandler.handleError(error, '文本分析失败');
  }
};

/**
 * 图文分析控制器（支持多轮对话）
 */
export const analyzeImageText = async (req: Request, res: Response): Promise<void> => {
  const responseHandler = new ResponseHandler(res);
  const fileHandler = new FileHandler();
  const taskHandler = new AnalysisTaskHandler();

  try {
    const { text, sessionId, scenario, useCache = true } = req.body;
    const imageFile = req.file;
    const userId = req.user?.id || 'anonymous';

    if (!InputValidator.validateImage(imageFile)) {
      return responseHandler.badRequest('请上传有效的图片文件(JPEG/PNG/GIF/WebP, <10MB)');
    }

    await taskHandler.checkCostLimits(userId);
    const savedFilePath = await fileHandler.saveImage(userId, imageFile);
    await taskHandler.handleImageAnalysis(userId, text, imageFile, savedFilePath, sessionId, scenario, useCache);

  } catch (error) {
    responseHandler.handleError(error, '图文分析失败');
  }
};

/**
 * 会话相关控制器
 */
export const sessionController = {
  createSession: async (req: Request, res: Response): Promise<void> => {
    const sessionManager = new SessionManager();
    const responseHandler = new ResponseHandler(res);

    try {
      const { userId } = req.body;
      const actualUserId = userId || req.user?.id || 'anonymous';
      await sessionManager.createNewSession(actualUserId, responseHandler);
    } catch (error) {
      responseHandler.handleError(error, '创建会话失败');
    }
  },

  getConversationHistory: async (req: Request, res: Response): Promise<void> => {
    const sessionManager = new SessionManager();
    const responseHandler = new ResponseHandler(res);

    try {
      const { sessionId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      await sessionManager.getHistory(sessionId, Number(limit), Number(offset), responseHandler);
    } catch (error) {
      responseHandler.handleError(error, '获取对话历史失败');
    }
  },

  getUserSessions: async (req: Request, res: Response): Promise<void> => {
    const sessionManager = new SessionManager();
    const responseHandler = new ResponseHandler(res);

    try {
      const userId = req.user?.id || 'anonymous';
      await sessionManager.getUserSessionList(userId, responseHandler);
    } catch (error) {
      responseHandler.handleError(error, '获取用户会话失败');
    }
  }
};

/**
 * 系统管理控制器
 */
export const systemController = {
  getServiceStats: async (req: Request, res: Response): Promise<void> => {
    const responseHandler = new ResponseHandler(res);
    try {
      const stats = await AIService.getUsageStats();
      responseHandler.success(stats);
    } catch (error) {
      responseHandler.handleError(error, '获取服务统计失败');
    }
  },

  healthCheck: async (req: Request, res: Response): Promise<void> => {
    const responseHandler = new ResponseHandler(res);
    
    try {
      const healthStatus = await HealthChecker.performHealthCheck();
      responseHandler.success(healthStatus, '健康检查完成');
    } catch (error) {
      responseHandler.handleError(error, '健康检查失败');
    }
  },

  cleanupService: async (req: Request, res: Response): Promise<void> => {
    const responseHandler = new ResponseHandler(res);
    try {
      await AIService.cleanup();
      responseHandler.success(null, '服务清理完成');
      logInfo('手动触发服务清理');
    } catch (error) {
      responseHandler.handleError(error, '服务清理失败');
    }
  }
};

// 导出独立的cleanupService函数
export const cleanupService = systemController.cleanupService;

// 导出独立的createSession函数
export const createSession = sessionController.createSession;

// 导出独立的getConversationHistory函数
export const getConversationHistory = sessionController.getConversationHistory;

// 导出独立的getUserSessions函数
export const getUserSessions = sessionController.getUserSessions;

// 导出独立的getServiceStats函数
export const getServiceStats = systemController.getServiceStats;

// 导出独立的healthCheck函数
export const healthCheck = systemController.healthCheck;