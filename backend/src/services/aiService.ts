import { createSDK } from '@dashscope/core';
import { appConfig } from '../config/index.js';
import { TextAnalysisResponse, ImageAnalysisResponse } from '../types/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { PromptService } from './promptService.js';
import { ConversationService } from './conversationService.js';
import { CacheService } from './cacheService.js';

// 初始化 DashScope SDK
const DashScopeAPI = createSDK({
  accessToken: appConfig.ai.dashscopeToken,
});

// 重试配置
interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
  backoffFactor: 2
};

export class AIService {
  /**
   * 文本分析服务（支持缓存和重试）
   */
  static async analyzeText(
    text: string, 
    options: {
      sessionId?: string;
      useCache?: boolean;
      retryConfig?: Partial<RetryConfig>;
      scenario?: string;
      userProfile?: any;
    } = {}
  ): Promise<TextAnalysisResponse> {
    const { sessionId, useCache = true, retryConfig, scenario, userProfile } = options;
    
    // 检查缓存
    if (useCache) {
      const cached = CacheService.get<TextAnalysisResponse>(
        CacheService.generateKey('text_analysis', text)
      );
      if (cached) {
        logInfo('使用缓存的文本分析结果', { textLength: text.length });
        return cached;
      }
    }

    const startTime = Date.now();
    
    try {
      logInfo('开始文本分析', { 
        textLength: text.length, 
        hasSession: !!sessionId,
        scenario 
      });
      
      // 生成上下文感知的提示词
      let systemPrompt: string;
      if (sessionId) {
        systemPrompt = ConversationService.generateContextAwarePrompt(sessionId, text);
      } else if (scenario) {
        systemPrompt = PromptService.getScenarioPrompt(scenario);
      } else if (userProfile) {
        systemPrompt = PromptService.generatePersonalizedPrompt(userProfile);
      } else {
        systemPrompt = PromptService.getTextAnalysisPrompt();
      }

      // 执行AI分析（带重试机制）
      const result = await this.executeWithRetry(async () => {
        const response = await DashScopeAPI.chat.completion.request({
          model: appConfig.ai.models.textAnalysis,
          input: {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `请分析这段美妆文案：\n\n${text}` }
            ]
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 2000
          }
        });
        
        return response.output.text;
      }, { ...DEFAULT_RETRY_CONFIG, ...retryConfig });

      // 验证和解析响应
      const cleanedResponse = PromptService.validateAndCleanResponse(result);
      const analysisResult = JSON.parse(cleanedResponse) as any;
      
      // 转换为标准格式
      const response: TextAnalysisResponse = {
        status: this.determineStatus(analysisResult.compliance?.score || 0),
        score: analysisResult.compliance?.score || 0,
        errors: analysisResult.errors || [],
        suggestions: analysisResult.suggestions || [],
        compliance: analysisResult.compliance || { score: 0, issues: [] },
        resources: analysisResult.resources || []
      };

      const processingTime = Date.now() - startTime;
      
      // 缓存结果
      if (useCache) {
        CacheService.set(
          CacheService.generateKey('text_analysis', text),
          response,
          30 * 60 * 1000 // 30分钟
        );
      }
      
      // 添加到对话历史
      if (sessionId) {
        ConversationService.addMessage(sessionId, 'user', text);
        ConversationService.addMessage(
          sessionId, 
          'assistant', 
          `分析完成，合规评分：${response.score}分，状态：${response.status}`,
          { analysisType: 'text', contentLength: text.length, processingTime }
        );
      }

      logInfo('文本分析完成', { 
        score: response.score, 
        status: response.status,
        processingTime,
        cached: false
      });
      
      return response;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError('AI文本分析失败', { error, processingTime, textLength: text.length });
      
      // 记录失败到对话历史
      if (sessionId) {
        ConversationService.addMessage(
          sessionId, 
          'assistant', 
          '分析失败，请稍后重试',
          { analysisType: 'text', contentLength: text.length, processingTime }
        );
      }
      
      throw new Error('AI分析服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 图文分析服务（支持缓存和重试）
   */
  static async analyzeImageAndText(
    imageUrl: string, 
    text?: string,
    options: {
      sessionId?: string;
      useCache?: boolean;
      retryConfig?: Partial<RetryConfig>;
      scenario?: string;
      userProfile?: any;
    } = {}
  ): Promise<ImageAnalysisResponse> {
    const { sessionId, useCache = true, retryConfig, scenario, userProfile } = options;
    
    // 生成缓存键
    const cacheKey = CacheService.generateKey('image_analysis', imageUrl + (text || ''));
    
    // 检查缓存
    if (useCache) {
      const cached = CacheService.get<ImageAnalysisResponse>(cacheKey);
      if (cached) {
        logInfo('使用缓存的图文分析结果', { imageUrl, hasText: !!text });
        return cached;
      }
    }

    const startTime = Date.now();
    
    try {
      logInfo('开始图文分析', { 
        imageUrl, 
        hasText: !!text,
        hasSession: !!sessionId,
        scenario 
      });
      
      // 生成上下文感知的提示词
      let systemPrompt: string;
      if (sessionId) {
        systemPrompt = ConversationService.generateContextAwarePrompt(
          sessionId, 
          `图片分析：${imageUrl}${text ? ` 配文：${text}` : ''}`
        );
      } else if (scenario) {
        systemPrompt = PromptService.getScenarioPrompt(scenario);
      } else if (userProfile) {
        systemPrompt = PromptService.generatePersonalizedPrompt(userProfile);
      } else {
        systemPrompt = PromptService.getImageAnalysisPrompt();
      }
      
      // 执行AI分析（带重试机制）
      const result = await this.executeWithRetry(async () => {
        const messages: any[] = [
          {
            role: "system",
            content: systemPrompt
          }
        ];

        // 构建用户消息
        const userMessage: any = {
          role: "user",
          content: []
        };

        // 添加图片
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: imageUrl
          }
        });

        // 添加文字（如果有）
        if (text) {
          userMessage.content.push({
            type: "text",
            text: `请分析这张美妆图片和以下文案：\n\n${text}`
          });
        } else {
          userMessage.content.push({
            type: "text",
            text: "请分析这张美妆图片的质量和内容"
          });
        }

        messages.push(userMessage);

        const response = await DashScopeAPI.chat.completion.request({
          model: appConfig.ai.models.imageAnalysis,
          input: {
            messages
          },
          parameters: {
            temperature: 0.7,
            max_tokens: 2000
          }
        });
        
        return response.output.text;
      }, { ...DEFAULT_RETRY_CONFIG, ...retryConfig });

      // 验证和解析响应
      const cleanedResponse = PromptService.validateAndCleanResponse(result);
      const analysisResult = JSON.parse(cleanedResponse) as any;
      
      // 如果有文字，也进行文字分析
      let textAnalysis: TextAnalysisResponse | undefined;
      if (text && text.trim()) {
        textAnalysis = await this.analyzeText(text, { sessionId, useCache, retryConfig, scenario, userProfile });
      }

      const response: ImageAnalysisResponse = {
        imageAnalysis: analysisResult.imageAnalysis || {
          objects: [],
          inappropriate: false,
          confidence: 0
        },
        textAnalysis,
        overallAssessment: analysisResult.overallAssessment || {
          status: 'compliant',
          recommendations: []
        }
      };

      const processingTime = Date.now() - startTime;
      
      // 缓存结果
      if (useCache) {
        CacheService.set(
          cacheKey,
          response,
          60 * 60 * 1000 // 1小时（图片分析更耗时，缓存更久）
        );
      }
      
      // 添加到对话历史
      if (sessionId) {
        ConversationService.addMessage(
          sessionId, 
          'user', 
          `图片分析请求：${imageUrl}${text ? ` 配文：${text}` : ''}`
        );
        ConversationService.addMessage(
          sessionId, 
          'assistant', 
          `图文分析完成，状态：${response.overallAssessment.status}`,
          { 
            analysisType: 'image', 
            imageUrl, 
            hasText: !!text, 
            processingTime 
          }
        );
      }

      logInfo('图文分析完成', { 
        status: response.overallAssessment.status,
        processingTime,
        cached: false
      });
      
      return response;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logError('AI图文分析失败', { error, processingTime, imageUrl, hasText: !!text });
      
      // 记录失败到对话历史
      if (sessionId) {
        ConversationService.addMessage(
          sessionId, 
          'assistant', 
          '图文分析失败，请稍后重试',
          { analysisType: 'image', imageUrl, hasText: !!text, processingTime }
        );
      }
      
      throw new Error('AI图文分析服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 根据分数确定状态
   */
  private static determineStatus(score: number): 'compliant' | 'warning' | 'violation' {
    if (score >= 80) return 'compliant';
    if (score >= 60) return 'warning';
    return 'violation';
  }

  /**
   * 重试执行机制
   */
  private static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxAttempts) {
          break;
        }
        
        // 计算延迟时间（指数退避）
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );
        
        logInfo(`AI服务调用失败，${delay}ms后进行第${attempt + 1}次重试`, {
          attempt,
          maxAttempts: config.maxAttempts,
          error: error instanceof Error ? error.message : String(error)
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * 多轮对话分析
   */
  static async analyzeConversation(
    sessionId: string,
    newMessage: string,
    messageType: 'text' | 'image' = 'text',
    imageUrl?: string,
    options: {
      useCache?: boolean;
      retryConfig?: Partial<RetryConfig>;
      userProfile?: any;
    } = {}
  ): Promise<TextAnalysisResponse | ImageAnalysisResponse> {
    const { useCache = true, retryConfig, userProfile } = options;
    
    try {
      // 更新会话上下文
      ConversationService.updateSessionContext(sessionId, {
        lastActivity: new Date(),
        messageCount: ConversationService.getSessionStats(sessionId).messageCount + 1
      });
      
      // 分析用户意图
      const intent = ConversationService.analyzeUserIntent(newMessage);
      
      if (messageType === 'image' && imageUrl) {
        return await this.analyzeImageAndText(imageUrl, newMessage, {
          sessionId,
          useCache,
          retryConfig,
          userProfile
        });
      } else {
        return await this.analyzeText(newMessage, {
          sessionId,
          useCache,
          retryConfig,
          userProfile
        });
      }
    } catch (error) {
      logError('多轮对话分析失败', { error, sessionId, messageType });
      throw error;
    }
  }
  
  /**
   * 获取AI服务使用统计
   */
  static getUsageStats(): {
    cacheStats: any;
    conversationStats: any;
  } {
    return {
      cacheStats: CacheService.getStats(),
      conversationStats: ConversationService.getGlobalStats()
    };
  }
  
  /**
   * 成本控制检查
   */
  static async checkCostLimits(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    usage: {
      daily: number;
      monthly: number;
      total: number;
    };
  }> {
    try {
      // 这里可以集成实际的用量统计逻辑
      // 暂时返回允许状态
      return {
        allowed: true,
        usage: {
          daily: 0,
          monthly: 0,
          total: 0
        }
      };
    } catch (error) {
      logError('成本控制检查失败', { error, userId });
      return {
        allowed: false,
        reason: '成本控制检查失败',
        usage: {
          daily: 0,
          monthly: 0,
          total: 0
        }
      };
    }
  }
  
  /**
   * 清理过期缓存和会话
   */
  static async cleanup(): Promise<void> {
    try {
      // 清理过期缓存
      CacheService.cleanup();
      
      // 清理过期会话
      ConversationService.cleanupExpiredSessions();
      
      logInfo('AI服务清理完成');
    } catch (error) {
      logError('AI服务清理失败', error);
    }
  }

  /**
   * 健康检查
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      ai: boolean;
      cache: boolean;
      conversation: boolean;
    };
    latency?: number;
  }> {
    const startTime = Date.now();
    const services = {
      ai: false,
      cache: false,
      conversation: false
    };
    
    try {
      // 检查AI服务
      const result = await DashScopeAPI.chat.completion.request({
        model: appConfig.ai.models.textAnalysis,
        input: {
          messages: [
            { role: "user", content: "健康检查" }
          ]
        },
        parameters: {
          temperature: 0.1,
          max_tokens: 10
        }
      });
      
      services.ai = !!result.output.text;
    } catch (error) {
      logError('AI服务健康检查失败', error);
    }
    
    // 检查缓存服务
    try {
      const testKey = 'health_check_' + Date.now();
      CacheService.set(testKey, 'test', 1000);
      const retrieved = CacheService.get(testKey);
      services.cache = retrieved === 'test';
      CacheService.delete(testKey);
    } catch (error) {
      logError('缓存服务健康检查失败', error);
    }
    
    // 检查对话服务
    try {
      const testSessionId = 'health_check_' + Date.now();
      ConversationService.createSession(testSessionId, 'health_check');
      const session = ConversationService.getSession(testSessionId);
      services.conversation = !!session;
      ConversationService.deleteSession(testSessionId);
    } catch (error) {
      logError('对话服务健康检查失败', error);
    }
    
    const latency = Date.now() - startTime;
    const healthyCount = Object.values(services).filter(Boolean).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === 3) {
      status = 'healthy';
    } else if (healthyCount >= 1) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    return {
      status,
      services,
      latency
    };
  }
}