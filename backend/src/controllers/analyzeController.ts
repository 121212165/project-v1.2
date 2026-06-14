import { Request, Response } from 'express';
import OpenAI from 'openai';
import multer from 'multer';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/index.js';
import { PromptService } from '../services/promptService.js';
import { CacheService } from '../services/cacheService.js';
import { ConversationService } from '../services/conversationService.js';
import { logInfo, logError } from '../utils/logger.js';
import { ApiResponse, TextAnalysisResponse, ImageAnalysisResponse } from '../types/index.js';

const openai = new OpenAI({
  apiKey: config.AI_API_KEY,
  baseURL: config.AI_BASE_URL,
  defaultHeaders: {
    'HTTP-Referer': 'https://beauty-ai-assistant.com',
    'X-Title': '美妆AI助手',
  },
});

const RETRY_CONFIG = { maxAttempts: 3, baseDelay: 1000, maxDelay: 10000, backoffFactor: 2 };

async function executeWithRetry<T>(op: () => Promise<T>, cfg = RETRY_CONFIG): Promise<T> {
  let lastErr: Error;
  for (let i = 1; i <= cfg.maxAttempts; i++) {
    try { return await op(); } catch (e) {
      lastErr = e as Error;
      if (i === cfg.maxAttempts) break;
      const delay = Math.min(cfg.baseDelay * Math.pow(cfg.backoffFactor, i - 1), cfg.maxDelay);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr!;
}

function determineStatus(score: number): 'compliant' | 'warning' | 'violation' {
  if (score >= 80) return 'compliant';
  if (score >= 60) return 'warning';
  return 'violation';
}

export const analyzeText = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { text, sessionId, scenario, useCache = true } = req.body;
    if (!text?.trim()) { res.status(400).json({ success: false, error: '请提供有效的文本内容' }); return; }

    const cacheKey = CacheService.generateKey('text_analysis', text);
    if (useCache) {
      const cached = CacheService.get<TextAnalysisResponse>(cacheKey);
      if (cached) { res.json({ success: true, data: cached }); return; }
    }

    const systemPrompt = sessionId
      ? ConversationService.generateContextAwarePrompt(sessionId, text)
      : scenario ? PromptService.getScenarioPrompt(scenario) : PromptService.getTextAnalysisPrompt();

    const result = await executeWithRetry(async () => {
      const resp = await openai.chat.completions.create({
        model: config.AI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `请分析这段美妆文案：\n\n${text}` }],
        temperature: 0.7, max_tokens: 2000,
      });
      return resp.choices[0].message.content || '';
    });

    const cleaned = PromptService.validateAndCleanResponse(result);
    const analysisResult = JSON.parse(cleaned);
    const response: TextAnalysisResponse = {
      status: determineStatus(analysisResult.compliance?.score || 0),
      score: analysisResult.compliance?.score || 0,
      errors: analysisResult.errors || [],
      suggestions: analysisResult.suggestions || [],
      compliance: analysisResult.compliance || { score: 0, issues: [] },
      resources: analysisResult.resources || []
    };

    if (useCache) CacheService.set(cacheKey, response, 30 * 60 * 1000);
    if (sessionId) {
      ConversationService.addMessage(sessionId, 'user', text);
      ConversationService.addMessage(sessionId, 'assistant', `分析完成，合规评分：${response.score}分`);
    }

    logInfo('文本分析完成', { score: response.score, status: response.status });
    res.json({ success: true, data: response });
  } catch (error) {
    logError('文本分析失败', error);
    res.status(500).json({ success: false, error: 'AI分析服务暂时不可用，请稍后重试' });
  }
};

export const analyzeImageText = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const { text, sessionId, scenario, useCache = true } = req.body;
    const imageFile = req.file;
    if (!imageFile) { res.status(400).json({ success: false, error: '请上传图片' }); return; }

    const base64 = imageFile.buffer.toString('base64');
    const imageUrl = `data:${imageFile.mimetype};base64,${base64}`;
    const cacheKey = CacheService.generateKey('image_analysis', imageUrl + (text || ''));

    if (useCache) {
      const cached = CacheService.get<ImageAnalysisResponse>(cacheKey);
      if (cached) { res.json({ success: true, data: cached }); return; }
    }

    const systemPrompt = sessionId
      ? ConversationService.generateContextAwarePrompt(sessionId, `图片分析${text ? `：${text}` : ''}`)
      : scenario ? PromptService.getScenarioPrompt(scenario) : PromptService.getImageAnalysisPrompt();

    const result = await executeWithRetry(async () => {
      const userContent: any[] = [{ type: "image_url", image_url: { url: imageUrl } }];
      userContent.push({ type: "text", text: text ? `请分析这张美妆图片和以下文案：\n\n${text}` : "请分析这张美妆图片的质量和内容" });
      const resp = await openai.chat.completions.create({
        model: config.AI_MODEL,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
        temperature: 0.7, max_tokens: 2000,
      });
      return resp.choices[0].message.content || '';
    });

    const cleaned = PromptService.validateAndCleanResponse(result);
    const analysisResult = JSON.parse(cleaned);
    const response: ImageAnalysisResponse = {
      imageAnalysis: analysisResult.imageAnalysis || { objects: [], inappropriate: false, confidence: 0 },
      overallAssessment: analysisResult.overallAssessment || { status: 'compliant', recommendations: [] }
    };

    if (useCache) CacheService.set(cacheKey, response, 60 * 60 * 1000);
    logInfo('图文分析完成', { status: response.overallAssessment.status });
    res.json({ success: true, data: response });
  } catch (error) {
    logError('图文分析失败', error);
    res.status(500).json({ success: false, error: 'AI图文分析服务暂时不可用，请稍后重试' });
  }
};

export const createSession = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const userId = req.body.userId || req.user?.id;
    const sessionId = ConversationService.createSession(userId);
    res.json({ success: true, data: { sessionId } });
  } catch (error) {
    res.status(500).json({ success: false, error: '创建会话失败' });
  }
};

export const getConversationHistory = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const messages = ConversationService.getConversationHistory(req.params.sessionId, 50);
    res.json({ success: true, data: { messages } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取对话历史失败' });
  }
};

export const getUserSessions = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.json({ success: true, data: { sessions: [] } }); return; }
    const sessions = ConversationService.getUserSessions(userId);
    res.json({ success: true, data: { sessions } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户会话失败' });
  }
};

export const getServiceStats = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  res.json({ success: true, data: { cacheStats: CacheService.getStats() } });
};

export const healthCheck = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } });
};

export const cleanupService = async (req: Request, res: Response<ApiResponse>): Promise<void> => {
  CacheService.clear();
  res.json({ success: true, message: '服务清理完成' });
};
