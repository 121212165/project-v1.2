/**
 * DeepSeek API适配器
 * 基于openai_test.py的配置实现统一的AI分析服务接口
 */

import OpenAI from 'openai';
import { 
  IAnalysisService, 
  TextAnalysisRequest, 
  ImageAnalysisRequest, 
  TextAnalysisResult, 
  ImageAnalysisResult,
  UsageStats,
  HealthStatus,
  RetryConfig,
  AnalysisOptions
} from '../interfaces/IAnalysisService.js';
import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { CacheService } from '../cacheService.js';
import { PromptService } from '../promptService.js';

/**
 * DeepSeek API配置接口
 */
interface DeepSeekConfig {
  apiKey: string;
  baseURL: string;
  models: {
    textAnalysis: string;
    imageAnalysis: string;
    fallbackModels: string[];
  };
  timeout: number;
  retryAttempts: number;
}

/**
 * 使用统计数据
 */
interface InternalUsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalResponseTime: number;
  cacheHits: number;
  cacheMisses: number;
  costEstimate: {
    daily: number;
    monthly: number;
    total: number;
  };
  lastReset: Date;
}

/**
 * DeepSeek API适配器实现
 */
export class DeepSeekAdapter implements IAnalysisService {
  public readonly provider = 'deepseek';
  public readonly supportedModels: string[];
  
  private client: OpenAI;
  private config: DeepSeekConfig;
  private usageStats: InternalUsageStats;
  private lastHealthCheck: Date = new Date();
  private healthStatus: HealthStatus['status'] = 'healthy';
  
  // 默认重试配置
  private readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000, // 1秒
    maxDelay: 10000, // 10秒
    backoffFactor: 2
  };

  constructor(config: DeepSeekConfig) {
    this.config = config;
    this.supportedModels = [config.models.textAnalysis, config.models.imageAnalysis, ...config.models.fallbackModels];
    
    // 初始化OpenAI客户端 - 使用openai_test.py中的配置
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });
    
    // 初始化使用统计
    this.usageStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      costEstimate: {
        daily: 0,
        monthly: 0,
        total: 0
      },
      lastReset: new Date()
    };
    
    logInfo('DeepSeek API适配器初始化完成', {
      provider: this.provider,
      baseURL: config.baseURL,
      models: this.supportedModels
    });
  }

  /**
   * 文本分析
   */
  async analyzeText(
    text: string, 
    options: AnalysisOptions = {}
  ): Promise<TextAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logInfo('开始DeepSeek文本分析', {
        textLength: text.length,
        scenario: options.scenario,
        useCache: options.useCache
      });

      // 检查缓存
      if (options.useCache !== false) {
        const cacheKey = this.generateCacheKey('text', text, options);
        const cached = await CacheService.get(cacheKey);
        if (cached) {
          this.usageStats.cacheHits++;
          logInfo('使用缓存结果', { cacheKey });
          return cached as TextAnalysisResult;
        }
        this.usageStats.cacheMisses++;
      }

      // 获取提示词
      const systemPrompt = await PromptService.getPrompt('text_analysis', options.scenario);
      
      // 构建消息
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: text }
      ];

      // 调用API
      const completion = await this.executeWithRetry(async () => {
        return await this.client.chat.completions.create({
          model: this.config.models.textAnalysis,
          messages,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          stream: false
        });
      });

      const responseTime = Date.now() - startTime;
      
      // 解析结果
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('API返回空内容');
      }

      let analysisResult;
      try {
        analysisResult = JSON.parse(content);
      } catch {
        // 如果不是JSON格式，包装成标准格式
        analysisResult = {
          summary: content.substring(0, 200),
          analysis: content,
          recommendations: [],
          confidence: 0.8
        };
      }

      const result: TextAnalysisResult = {
        taskId: this.generateTaskId(),
        analysis: analysisResult,
        metadata: {
          model: this.config.models.textAnalysis,
          provider: this.provider,
          responseTime,
          timestamp: new Date().toISOString(),
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0
          }
        }
      };

      // 缓存结果
      if (options.useCache !== false) {
        const cacheKey = this.generateCacheKey('text', text, options);
        await CacheService.set(cacheKey, result, 3600); // 缓存1小时
      }

      // 更新统计
      this.updateStats(true, responseTime, completion.usage?.total_tokens || 0);
      
      logInfo('DeepSeek文本分析完成', {
        taskId: result.taskId,
        responseTime,
        tokensUsed: completion.usage?.total_tokens
      });

      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, responseTime, 0);
      
      logError('DeepSeek文本分析失败', {
        error: error instanceof Error ? error.message : String(error),
        textLength: text.length,
        responseTime
      });
      
      throw new Error(`DeepSeek AI分析服务暂时不可用: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 图文分析
   */
  async analyzeImageText(
    imageBuffer: Buffer,
    text: string,
    options: AnalysisOptions = {}
  ): Promise<ImageAnalysisResult> {
    const startTime = Date.now();
    
    try {
      logInfo('开始DeepSeek图文分析', {
        imageSize: imageBuffer.length,
        textLength: text.length,
        scenario: options.scenario
      });

      // 将图片转换为base64
      const base64Image = imageBuffer.toString('base64');
      const imageUrl = `data:image/jpeg;base64,${base64Image}`;

      // 获取提示词
      const systemPrompt = await PromptService.getPrompt('image_analysis', options.scenario);
      
      // 构建消息
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text },
            { type: 'image_url' as const, image_url: { url: imageUrl } }
          ]
        }
      ];

      // 调用API
      const completion = await this.executeWithRetry(async () => {
        return await this.client.chat.completions.create({
          model: this.config.models.imageAnalysis,
          messages,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          stream: false
        });
      });

      const responseTime = Date.now() - startTime;
      
      // 解析结果
      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('API返回空内容');
      }

      let analysisResult;
      try {
        analysisResult = JSON.parse(content);
      } catch {
        // 如果不是JSON格式，包装成标准格式
        analysisResult = {
          summary: content.substring(0, 200),
          analysis: content,
          recommendations: [],
          confidence: 0.8
        };
      }

      const result: ImageAnalysisResult = {
        taskId: this.generateTaskId(),
        analysis: analysisResult,
        metadata: {
          model: this.config.models.imageAnalysis,
          provider: this.provider,
          responseTime,
          timestamp: new Date().toISOString(),
          usage: {
            promptTokens: completion.usage?.prompt_tokens || 0,
            completionTokens: completion.usage?.completion_tokens || 0,
            totalTokens: completion.usage?.total_tokens || 0
          }
        }
      };

      // 更新统计
      this.updateStats(true, responseTime, completion.usage?.total_tokens || 0);
      
      logInfo('DeepSeek图文分析完成', {
        taskId: result.taskId,
        responseTime,
        tokensUsed: completion.usage?.total_tokens
      });

      return result;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateStats(false, responseTime, 0);
      
      logError('DeepSeek图文分析失败', {
        error: error instanceof Error ? error.message : String(error),
        imageSize: imageBuffer.length,
        textLength: text.length,
        responseTime
      });
      
      throw new Error(`DeepSeek AI分析服务暂时不可用: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // 执行简单的API调用测试
      const testCompletion = await this.client.chat.completions.create({
        model: this.config.models.textAnalysis,
        messages: [
          { role: 'system', content: '你是一个AI助手' },
          { role: 'user', content: '健康检查测试' }
        ],
        max_tokens: 10,
        temperature: 0.1
      });

      const responseTime = Date.now() - startTime;
      this.lastHealthCheck = new Date();
      this.healthStatus = 'healthy';

      return {
        status: 'healthy',
        responseTime,
        lastCheck: this.lastHealthCheck.toISOString(),
        details: {
          model: this.config.models.textAnalysis,
          provider: this.provider,
          testPassed: !!testCompletion.choices[0]?.message?.content
        }
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.lastHealthCheck = new Date();
      this.healthStatus = 'unhealthy';
      
      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: this.lastHealthCheck.toISOString(),
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取使用统计
   */
  async getUsageStats(): Promise<UsageStats> {
    return {
      totalRequests: this.usageStats.totalRequests,
      successfulRequests: this.usageStats.successfulRequests,
      failedRequests: this.usageStats.failedRequests,
      averageResponseTime: this.usageStats.totalRequests > 0 
        ? this.usageStats.totalResponseTime / this.usageStats.totalRequests 
        : 0,
      cacheHitRate: (this.usageStats.cacheHits + this.usageStats.cacheMisses) > 0
        ? this.usageStats.cacheHits / (this.usageStats.cacheHits + this.usageStats.cacheMisses)
        : 0,
      costEstimate: this.usageStats.costEstimate,
      lastReset: this.usageStats.lastReset.toISOString()
    };
  }

  /**
   * 重置统计数据
   */
  async resetStats(): Promise<void> {
    this.usageStats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      costEstimate: {
        daily: 0,
        monthly: 0,
        total: 0
      },
      lastReset: new Date()
    };
    
    logInfo('DeepSeek适配器统计数据已重置', { provider: this.provider });
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // DeepSeek适配器没有需要特别清理的资源
      logInfo('DeepSeek适配器清理完成', { provider: this.provider });
    } catch (error) {
      logError('DeepSeek适配器清理失败', {
        provider: this.provider,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: RetryConfig = this.DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === retryConfig.maxAttempts) {
          break;
        }
        
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );
        
        logWarn(`DeepSeek API调用失败，${delay}ms后重试`, {
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          error: lastError.message,
          delay
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * 更新统计数据
   */
  private updateStats(success: boolean, responseTime: number, tokensUsed: number): void {
    this.usageStats.totalRequests++;
    this.usageStats.totalResponseTime += responseTime;
    
    if (success) {
      this.usageStats.successfulRequests++;
    } else {
      this.usageStats.failedRequests++;
    }
    
    // 简单的成本估算（基于token使用量）
    const estimatedCost = tokensUsed * 0.00001; // 假设每token 0.00001美元
    this.usageStats.costEstimate.total += estimatedCost;
    this.usageStats.costEstimate.daily += estimatedCost;
    this.usageStats.costEstimate.monthly += estimatedCost;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(type: string, content: string, options: AnalysisOptions): string {
    const optionsStr = JSON.stringify({
      scenario: options.scenario,
      maxTokens: options.maxTokens,
      temperature: options.temperature
    });
    
    return `${this.provider}_${type}_${Buffer.from(content + optionsStr).toString('base64').slice(0, 32)}`;
  }

  /**
   * 生成任务ID
   */
  private generateTaskId(): string {
    return `deepseek_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}