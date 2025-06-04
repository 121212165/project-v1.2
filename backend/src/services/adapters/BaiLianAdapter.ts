/**
 * 阿里云百炼API适配器
 * 实现统一的AI分析服务接口
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
 * 百炼API配置接口
 */
interface BaiLianConfig {
  apiKey: string;
  baseURL: string;
  models: {
    textAnalysis: string;
    imageAnalysis: string;
    fallbackModels: string[];
  };
  siteInfo: {
    url: string;
    name: string;
  };
  routing: {
    enableFallback: boolean;
    requireParameters: boolean;
    dataCollection: string;
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
 * 阿里云百炼API适配器实现
 */
export class BaiLianAdapter implements IAnalysisService {
  public readonly provider = 'bailianai';
  public readonly supportedModels: string[];
  
  private client: OpenAI;
  private config: BaiLianConfig;
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

  constructor(config: BaiLianConfig) {
    this.config = config;
    this.supportedModels = [config.models.textAnalysis, config.models.imageAnalysis, ...config.models.fallbackModels];
    
    // 初始化OpenAI客户端
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
      defaultHeaders: {
        'HTTP-Referer': config.siteInfo.url,
        'X-Title': config.siteInfo.name,
      },
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
    
    logInfo('百炼API适配器初始化完成', { 
      provider: this.provider,
      supportedModels: this.supportedModels.length
    });
  }

  /**
   * 文本分析实现
   */
  async analyzeText(request: TextAnalysisRequest): Promise<TextAnalysisResult> {
    const { content, options = {} } = request;
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      logInfo('开始百炼文本分析', { 
        requestId,
        contentLength: content.length,
        provider: this.provider
      });
      
      // 检查缓存
      if (options.useCache !== false) {
        const cached = await this.getCachedResult('text', content);
        if (cached) {
          this.usageStats.cacheHits++;
          logInfo('使用缓存结果', { requestId, provider: this.provider });
          return { ...cached, id: requestId, cached: true };
        }
        this.usageStats.cacheMisses++;
      }
      
      // 生成提示词
      const systemPrompt = this.generateSystemPrompt('text', options);
      
      // 执行AI分析（带重试机制）
      const result = await this.executeWithRetry(async () => {
        return await this.client.chat.completions.create({
          model: this.config.models.textAnalysis,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `请分析这段美妆文案：\n\n${content}` }
          ],
          temperature: 0.7,
          max_tokens: 2000,
          route: this.config.routing.enableFallback ? 'fallback' : undefined,
          provider: {
            require_parameters: this.config.routing.requireParameters,
            data_collection: this.config.routing.dataCollection
          },
          user: options.sessionId ? `session_${options.sessionId}` : `anonymous_${Date.now()}`
        });
      }, options.retryConfig || this.DEFAULT_RETRY_CONFIG);
      
      // 解析响应
      const rawResponse = result.choices[0].message.content || '';
      const cleanedResponse = PromptService.validateAndCleanResponse(rawResponse);
      const analysisData = JSON.parse(cleanedResponse);
      
      // 构建标准响应
      const response: TextAnalysisResult = {
        id: requestId,
        status: this.determineStatus(analysisData.compliance?.score || 0),
        score: analysisData.compliance?.score || 0,
        processingTime: Date.now() - startTime,
        provider: this.provider,
        model: this.config.models.textAnalysis,
        cached: false,
        errors: analysisData.errors || [],
        compliance: analysisData.compliance || { score: 0, issues: [] },
        sentiment: analysisData.sentiment
      };
      
      // 缓存结果
      if (options.useCache !== false) {
        await this.setCachedResult('text', content, response);
      }
      
      // 更新统计
      this.updateUsageStats(true, Date.now() - startTime);
      
      logInfo('百炼文本分析完成', { 
        requestId,
        score: response.score,
        status: response.status,
        processingTime: response.processingTime
      });
      
      return response;
      
    } catch (error) {
      this.updateUsageStats(false, Date.now() - startTime);
      logError('百炼文本分析失败', { 
        requestId,
        error: error instanceof Error ? error.message : String(error),
        provider: this.provider
      });
      throw new Error(`百炼AI分析服务暂时不可用: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 图文分析实现
   */
  async analyzeImageAndText(request: ImageAnalysisRequest): Promise<ImageAnalysisResult> {
    const { imageUrl, text, options = {} } = request;
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      logInfo('开始百炼图文分析', { 
        requestId,
        imageUrl,
        hasText: !!text,
        provider: this.provider
      });
      
      // 检查缓存
      const cacheKey = imageUrl + (text || '');
      if (options.useCache !== false) {
        const cached = await this.getCachedResult('image', cacheKey);
        if (cached) {
          this.usageStats.cacheHits++;
          return { ...cached, id: requestId, cached: true };
        }
        this.usageStats.cacheMisses++;
      }
      
      // 生成提示词
      const systemPrompt = this.generateSystemPrompt('image', options);
      
      // 构建消息
      const messages: any[] = [
        { role: "system", content: systemPrompt }
      ];
      
      const userContent: any[] = [
        {
          type: "image_url",
          image_url: {
            url: imageUrl,
            detail: "high"
          }
        }
      ];
      
      if (text) {
        userContent.push({
          type: "text",
          text: `请分析这张图片和以下文案：\n\n${text}`
        });
      } else {
        userContent.push({
          type: "text",
          text: "请分析这张美妆相关图片的内容和合规性"
        });
      }
      
      messages.push({
        role: "user",
        content: userContent
      });
      
      // 执行AI分析
      const result = await this.executeWithRetry(async () => {
        return await this.client.chat.completions.create({
          model: this.config.models.imageAnalysis,
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          route: this.config.routing.enableFallback ? 'fallback' : undefined,
          provider: {
            require_parameters: this.config.routing.requireParameters,
            data_collection: this.config.routing.dataCollection
          },
          user: options.sessionId ? `session_${options.sessionId}` : `anonymous_${Date.now()}`
        });
      }, options.retryConfig || this.DEFAULT_RETRY_CONFIG);
      
      // 解析响应
      const rawResponse = result.choices[0].message.content || '';
      const cleanedResponse = PromptService.validateAndCleanResponse(rawResponse);
      const analysisData = JSON.parse(cleanedResponse);
      
      // 构建标准响应
      const response: ImageAnalysisResult = {
        id: requestId,
        status: this.determineStatus(analysisData.overallAssessment?.score || 0),
        score: analysisData.overallAssessment?.score || 0,
        processingTime: Date.now() - startTime,
        provider: this.provider,
        model: this.config.models.imageAnalysis,
        cached: false,
        imageAnalysis: analysisData.imageAnalysis || {
          objects: [],
          inappropriate: false,
          confidence: 0
        },
        textAnalysis: analysisData.textAnalysis,
        overallAssessment: analysisData.overallAssessment || {
          status: 'compliant',
          recommendations: []
        }
      };
      
      // 缓存结果
      if (options.useCache !== false) {
        await this.setCachedResult('image', cacheKey, response);
      }
      
      // 更新统计
      this.updateUsageStats(true, Date.now() - startTime);
      
      logInfo('百炼图文分析完成', { 
        requestId,
        score: response.score,
        status: response.status,
        processingTime: response.processingTime
      });
      
      return response;
      
    } catch (error) {
      this.updateUsageStats(false, Date.now() - startTime);
      logError('百炼图文分析失败', { 
        requestId,
        error: error instanceof Error ? error.message : String(error),
        provider: this.provider
      });
      throw new Error(`百炼AI分析服务暂时不可用: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 批量文本分析
   */
  async batchAnalyzeText(requests: TextAnalysisRequest[]): Promise<TextAnalysisResult[]> {
    logInfo('开始批量文本分析', { 
      count: requests.length,
      provider: this.provider
    });
    
    const results: TextAnalysisResult[] = [];
    const batchSize = 5; // 并发限制
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchPromises = batch.map(request => this.analyzeText(request));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        logError('批量分析部分失败', { 
          batchIndex: Math.floor(i / batchSize),
          error: error instanceof Error ? error.message : String(error)
        });
        // 继续处理其他批次
      }
    }
    
    logInfo('批量文本分析完成', { 
      totalRequests: requests.length,
      successfulResults: results.length,
      provider: this.provider
    });
    
    return results;
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
      costEstimate: this.usageStats.costEstimate
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const errors: string[] = [];
    
    try {
      // 执行简单的API调用测试
      const result = await this.client.chat.completions.create({
        model: this.config.models.textAnalysis,
        messages: [
          { role: "user", content: "健康检查" }
        ],
        temperature: 0.1,
        max_tokens: 10
      });
      
      if (!result.choices[0].message.content) {
        errors.push('API响应内容为空');
      }
      
    } catch (error) {
      errors.push(`API调用失败: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    const latency = Date.now() - startTime;
    this.lastHealthCheck = new Date();
    
    // 确定健康状态
    let status: HealthStatus['status'];
    if (errors.length === 0) {
      status = 'healthy';
    } else if (latency < 10000) { // 10秒内响应认为是降级服务
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }
    
    this.healthStatus = status;
    
    return {
      status,
      latency,
      lastCheck: this.lastHealthCheck,
      errors
    };
  }

  /**
   * 成本控制检查
   */
  async checkCostLimits(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    usage: {
      daily: number;
      monthly: number;
      total: number;
    };
  }> {
    try {
      // 这里可以实现具体的成本控制逻辑
      // 例如查询数据库中的用户使用记录
      
      const usage = {
        daily: this.usageStats.costEstimate.daily,
        monthly: this.usageStats.costEstimate.monthly,
        total: this.usageStats.costEstimate.total
      };
      
      // 简单的成本限制检查
      const dailyLimit = 100; // 每日100元限制
      const monthlyLimit = 2000; // 每月2000元限制
      
      if (usage.daily > dailyLimit) {
        return {
          allowed: false,
          reason: `已超出每日成本限制 ${dailyLimit} 元`,
          usage
        };
      }
      
      if (usage.monthly > monthlyLimit) {
        return {
          allowed: false,
          reason: `已超出每月成本限制 ${monthlyLimit} 元`,
          usage
        };
      }
      
      return {
        allowed: true,
        usage
      };
      
    } catch (error) {
      logError('成本控制检查失败', { 
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
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
   * 清理资源
   */
  async cleanup(): Promise<void> {
    try {
      // 清理缓存
      CacheService.cleanup();
      
      // 重置统计数据（如果需要）
      const now = new Date();
      const daysSinceReset = (now.getTime() - this.usageStats.lastReset.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceReset >= 1) {
        this.usageStats.costEstimate.daily = 0;
        this.usageStats.lastReset = now;
      }
      
      logInfo('百炼适配器清理完成', { provider: this.provider });
    } catch (error) {
      logError('百炼适配器清理失败', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // 私有方法

  /**
   * 带重试机制的执行
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryConfig: RetryConfig
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
        
        // 计算延迟时间（指数退避）
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt - 1),
          retryConfig.maxDelay
        );
        
        logWarn(`百炼API调用失败，${delay}ms后重试`, {
          attempt,
          maxAttempts: retryConfig.maxAttempts,
          error: lastError.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  /**
   * 生成系统提示词
   */
  private generateSystemPrompt(type: 'text' | 'image', options: AnalysisOptions): string {
    if (options.scenario) {
      return PromptService.getScenarioPrompt(options.scenario);
    }
    
    if (options.userProfile) {
      return PromptService.generatePersonalizedPrompt(options.userProfile);
    }
    
    return type === 'text' 
      ? PromptService.getTextAnalysisPrompt()
      : PromptService.getImageAnalysisPrompt();
  }

  /**
   * 确定分析状态
   */
  private determineStatus(score: number): 'compliant' | 'warning' | 'violation' {
    if (score >= 80) return 'compliant';
    if (score >= 60) return 'warning';
    return 'violation';
  }

  /**
   * 生成请求ID
   */
  private generateRequestId(): string {
    return `bailianai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取缓存结果
   */
  private async getCachedResult(type: string, key: string): Promise<any> {
    const cacheKey = CacheService.generateKey(`${this.provider}_${type}`, key);
    return CacheService.get(cacheKey);
  }

  /**
   * 设置缓存结果
   */
  private async setCachedResult(type: string, key: string, result: any): Promise<void> {
    const cacheKey = CacheService.generateKey(`${this.provider}_${type}`, key);
    CacheService.set(cacheKey, result, 30 * 60 * 1000); // 30分钟
  }

  /**
   * 更新使用统计
   */
  private updateUsageStats(success: boolean, responseTime: number): void {
    this.usageStats.totalRequests++;
    this.usageStats.totalResponseTime += responseTime;
    
    if (success) {
      this.usageStats.successfulRequests++;
    } else {
      this.usageStats.failedRequests++;
    }
    
    // 简单的成本估算（实际应该根据具体的计费模式）
    const estimatedCost = 0.01; // 每次请求0.01元
    this.usageStats.costEstimate.daily += estimatedCost;
    this.usageStats.costEstimate.monthly += estimatedCost;
    this.usageStats.costEstimate.total += estimatedCost;
  }
}