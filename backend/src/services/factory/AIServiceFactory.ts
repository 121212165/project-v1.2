/**
 * AI服务工厂
 * 负责创建和管理不同的AI服务提供商实例
 */

import { IAnalysisService, IAIServiceFactory } from '../interfaces/IAnalysisService.js';
import { DeepSeekAdapter } from '../adapters/DeepSeekAdapter.js';
import { appConfig } from '../../config/index.js';
import { logInfo, logError, logWarn } from '../../utils/logger.js';

/**
 * 服务提供商配置接口
 */
interface ProviderConfig {
  name: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  config: any;
  healthCheckInterval: number; // 健康检查间隔（毫秒）
}

/**
 * AI服务工厂实现
 */
export class AIServiceFactory implements IAIServiceFactory {
  private static instance: AIServiceFactory;
  private services: Map<string, IAnalysisService> = new Map();
  private configs: Map<string, ProviderConfig> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private defaultProvider: string = 'deepseek';
  
  private constructor() {
    this.initializeProviders();
    this.startHealthChecks();
  }

  /**
   * 获取工厂单例实例
   */
  public static getInstance(): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      AIServiceFactory.instance = new AIServiceFactory();
    }
    return AIServiceFactory.instance;
  }

  /**
   * 初始化服务提供商配置
   */
  private initializeProviders(): void {
    // DeepSeek AI配置
    this.configs.set('deepseek', {
      name: 'deepseek',
      displayName: 'DeepSeek AI',
      enabled: true,
      priority: 1,
      config: {
        apiKey: process.env.DEEPSEEK_API_KEY || '8e28ff44-9e3e-4e88-911c-7e0485cf90d3',
        baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
        models: {
          textAnalysis: 'deepseek-r1-250528',
          imageAnalysis: 'deepseek-r1-250528',
          fallbackModels: ['deepseek-r1-250528']
        },
        timeout: appConfig.ai.timeout || 30000,
        retryAttempts: appConfig.ai.retryAttempts || 3
      },
      healthCheckInterval: 5 * 60 * 1000 // 5分钟
    });

    // 可以在这里添加其他AI服务提供商
    // 例如：OpenAI、Claude、本地模型等
    
    logInfo('AI服务提供商配置初始化完成', {
      providers: Array.from(this.configs.keys()),
      defaultProvider: this.defaultProvider
    });
  }

  /**
   * 创建AI服务实例
   */
  public createService(provider: string, customConfig?: any): IAnalysisService {
    // 检查是否已存在实例
    if (this.services.has(provider)) {
      return this.services.get(provider)!;
    }

    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`不支持的AI服务提供商: ${provider}`);
    }

    if (!config.enabled) {
      throw new Error(`AI服务提供商已禁用: ${provider}`);
    }

    let service: IAnalysisService;
    const finalConfig = customConfig || config.config;

    try {
      switch (provider) {
        case 'deepseek':
          service = new DeepSeekAdapter(finalConfig);
          break;
        
        // 可以在这里添加其他服务提供商的实例化逻辑
        // case 'openai':
        //   service = new OpenAIAdapter(finalConfig);
        //   break;
        
        default:
          throw new Error(`未实现的AI服务提供商: ${provider}`);
      }

      this.services.set(provider, service);
      
      logInfo('AI服务实例创建成功', {
        provider,
        supportedModels: service.supportedModels.length
      });

      return service;
      
    } catch (error) {
      logError('AI服务实例创建失败', {
        provider,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * 获取可用的服务提供商列表
   */
  public getAvailableProviders(): string[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => config.enabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([name, _]) => name);
  }

  /**
   * 获取默认服务提供商
   */
  public getDefaultProvider(): string {
    return this.defaultProvider;
  }

  /**
   * 设置默认服务提供商
   */
  public setDefaultProvider(provider: string): void {
    if (!this.configs.has(provider)) {
      throw new Error(`不支持的AI服务提供商: ${provider}`);
    }

    const config = this.configs.get(provider)!;
    if (!config.enabled) {
      throw new Error(`AI服务提供商已禁用: ${provider}`);
    }

    this.defaultProvider = provider;
    logInfo('默认AI服务提供商已更新', { provider });
  }

  /**
   * 获取服务实例（如果不存在则创建）
   */
  public getService(provider?: string): IAnalysisService {
    const targetProvider = provider || this.defaultProvider;
    
    if (this.services.has(targetProvider)) {
      return this.services.get(targetProvider)!;
    }

    return this.createService(targetProvider);
  }

  /**
   * 获取最佳可用服务（基于健康状态和优先级）
   */
  public async getBestAvailableService(): Promise<IAnalysisService> {
    const availableProviders = this.getAvailableProviders();
    
    for (const provider of availableProviders) {
      try {
        const service = this.getService(provider);
        const health = await service.healthCheck();
        
        if (health.status === 'healthy') {
          logInfo('选择最佳可用服务', { provider, status: health.status });
          return service;
        }
        
        if (health.status === 'degraded') {
          logWarn('服务状态降级但仍可用', { provider, status: health.status });
          return service;
        }
        
      } catch (error) {
        logError('服务健康检查失败', {
          provider,
          error: error instanceof Error ? error.message : String(error)
        });
        continue;
      }
    }
    
    // 如果所有服务都不健康，返回默认服务
    logWarn('所有服务都不健康，返回默认服务', { defaultProvider: this.defaultProvider });
    return this.getService(this.defaultProvider);
  }

  /**
   * 启用/禁用服务提供商
   */
  public setProviderEnabled(provider: string, enabled: boolean): void {
    const config = this.configs.get(provider);
    if (!config) {
      throw new Error(`不支持的AI服务提供商: ${provider}`);
    }

    config.enabled = enabled;
    
    if (!enabled && this.services.has(provider)) {
      // 清理已禁用的服务实例
      const service = this.services.get(provider)!;
      service.cleanup();
      this.services.delete(provider);
      
      // 停止健康检查
      const timer = this.healthCheckTimers.get(provider);
      if (timer) {
        clearInterval(timer);
        this.healthCheckTimers.delete(provider);
      }
    }

    logInfo('服务提供商状态已更新', { provider, enabled });
  }

  /**
   * 获取所有服务的统计信息
   */
  public async getAllServicesStats(): Promise<{
    [provider: string]: {
      config: ProviderConfig;
      stats?: any;
      health?: any;
    };
  }> {
    const result: any = {};
    
    for (const [provider, config] of this.configs.entries()) {
      result[provider] = { config };
      
      if (this.services.has(provider)) {
        try {
          const service = this.services.get(provider)!;
          const [stats, health] = await Promise.all([
            service.getUsageStats(),
            service.healthCheck()
          ]);
          
          result[provider].stats = stats;
          result[provider].health = health;
        } catch (error) {
          logError('获取服务统计信息失败', {
            provider,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }
    
    return result;
  }

  /**
   * 启动健康检查
   */
  private startHealthChecks(): void {
    for (const [provider, config] of this.configs.entries()) {
      if (!config.enabled) continue;
      
      const timer = setInterval(async () => {
        if (this.services.has(provider)) {
          try {
            const service = this.services.get(provider)!;
            const health = await service.healthCheck();
            
            if (health.status === 'unhealthy') {
              logWarn('服务健康检查失败', {
                provider,
                status: health.status,
                errors: health.errors
              });
            }
          } catch (error) {
            logError('定期健康检查失败', {
              provider,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }, config.healthCheckInterval);
      
      this.healthCheckTimers.set(provider, timer);
    }
    
    logInfo('AI服务健康检查已启动');
  }

  /**
   * 停止所有健康检查
   */
  public stopHealthChecks(): void {
    for (const [provider, timer] of this.healthCheckTimers.entries()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();
    logInfo('AI服务健康检查已停止');
  }

  /**
   * 清理所有服务实例
   */
  public async cleanup(): Promise<void> {
    this.stopHealthChecks();
    
    const cleanupPromises = Array.from(this.services.values()).map(service => 
      service.cleanup().catch(error => 
        logError('服务清理失败', {
          error: error instanceof Error ? error.message : String(error)
        })
      )
    );
    
    await Promise.all(cleanupPromises);
    this.services.clear();
    
    logInfo('AI服务工厂清理完成');
  }

  /**
   * 重新加载配置
   */
  public reloadConfig(): void {
    // 清理现有服务
    this.cleanup();
    
    // 重新初始化
    this.initializeProviders();
    this.startHealthChecks();
    
    logInfo('AI服务工厂配置已重新加载');
  }
}

// 导出单例实例
export const aiServiceFactory = AIServiceFactory.getInstance();