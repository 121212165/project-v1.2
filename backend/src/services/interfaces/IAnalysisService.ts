/**
 * AI分析服务统一接口
 * 支持多种AI服务提供商的统一抽象
 */

export interface AnalysisOptions {
  sessionId?: string;
  useCache?: boolean;
  retryConfig?: RetryConfig;
  scenario?: string;
  userProfile?: any;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export interface TextAnalysisRequest {
  content: string;
  options?: AnalysisOptions;
}

export interface ImageAnalysisRequest {
  imageUrl: string;
  text?: string;
  options?: AnalysisOptions;
}

export interface AnalysisResult {
  id: string;
  status: 'compliant' | 'warning' | 'violation';
  score: number;
  processingTime: number;
  provider: string;
  model: string;
  cached: boolean;
}

export interface TextAnalysisResult extends AnalysisResult {
  errors: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestions: string[];
  }>;
  compliance: {
    score: number;
    issues: string[];
  };
  sentiment?: {
    polarity: number;
    subjectivity: number;
  };
}

export interface ImageAnalysisResult extends AnalysisResult {
  imageAnalysis: {
    objects: string[];
    inappropriate: boolean;
    confidence: number;
  };
  textAnalysis?: TextAnalysisResult;
  overallAssessment: {
    status: 'compliant' | 'warning' | 'violation';
    recommendations: string[];
  };
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  cacheHitRate: number;
  costEstimate: {
    daily: number;
    monthly: number;
    total: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: Date;
  errors: string[];
}

/**
 * AI分析服务统一接口
 */
export interface IAnalysisService {
  /**
   * 服务提供商名称
   */
  readonly provider: string;
  
  /**
   * 支持的模型列表
   */
  readonly supportedModels: string[];
  
  /**
   * 文本分析
   */
  analyzeText(request: TextAnalysisRequest): Promise<TextAnalysisResult>;
  
  /**
   * 图文分析
   */
  analyzeImageAndText(request: ImageAnalysisRequest): Promise<ImageAnalysisResult>;
  
  /**
   * 批量文本分析
   */
  batchAnalyzeText(requests: TextAnalysisRequest[]): Promise<TextAnalysisResult[]>;
  
  /**
   * 获取使用统计
   */
  getUsageStats(): Promise<UsageStats>;
  
  /**
   * 健康检查
   */
  healthCheck(): Promise<HealthStatus>;
  
  /**
   * 成本控制检查
   */
  checkCostLimits(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    usage: {
      daily: number;
      monthly: number;
      total: number;
    };
  }>;
  
  /**
   * 清理资源
   */
  cleanup(): Promise<void>;
}

/**
 * AI服务工厂接口
 */
export interface IAIServiceFactory {
  /**
   * 创建AI服务实例
   */
  createService(provider: string, config?: any): IAnalysisService;
  
  /**
   * 获取可用的服务提供商列表
   */
  getAvailableProviders(): string[];
  
  /**
   * 获取默认服务提供商
   */
  getDefaultProvider(): string;
}