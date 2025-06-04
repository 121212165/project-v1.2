import { logInfo, logError } from './logger.js';
import { DatabaseService } from '../services/database.service.js';
import { AIService } from '../services/aiService.js';
import { AIServiceFactory } from '../services/factory/AIServiceFactory.js';
import { CacheService } from '../services/cacheService.js';
import { CostMonitoringService } from '../services/monitoring/CostMonitoringService.js';
import { PerformanceMonitoringService } from '../services/monitoring/PerformanceMonitoringService.js';
import * as os from 'os';

/**
 * 健康状态接口
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  services: {
    database: ServiceHealth;
    aiService: ServiceHealth;
    cache: ServiceHealth;
    costMonitoring: ServiceHealth;
    performanceMonitoring: ServiceHealth;
  };
  metrics: {
    memory: MemoryMetrics;
    cpu: CpuMetrics;
    requests: RequestMetrics;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  lastCheck: string;
  error?: string;
  details?: any;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  percentage: number;
  heap: {
    used: number;
    total: number;
  };
}

export interface CpuMetrics {
  usage: number;
  loadAverage: number[];
}

export interface RequestMetrics {
  total: number;
  successful: number;
  failed: number;
  averageResponseTime: number;
}

/**
 * 健康检查器
 * 提供系统健康状态监控功能
 */
export class HealthChecker {
  private static startTime = Date.now();
  private static requestMetrics = {
    total: 0,
    successful: 0,
    failed: 0,
    responseTimes: [] as number[]
  };

  /**
   * 执行完整的健康检查
   */
  static async performHealthCheck(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;
    
    try {
      const [database, aiService, cache, costMonitoring, performanceMonitoring] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkAIService(),
        this.checkCache(),
        this.checkCostMonitoring(),
        this.checkPerformanceMonitoring()
      ]);

      const services = {
        database: this.getServiceResult(database),
        aiService: this.getServiceResult(aiService),
        cache: this.getServiceResult(cache),
        costMonitoring: this.getServiceResult(costMonitoring),
        performanceMonitoring: this.getServiceResult(performanceMonitoring)
      };

      const overallStatus = this.calculateOverallStatus(services);
      const metrics = this.getSystemMetrics();

      const healthStatus: HealthStatus = {
        status: overallStatus,
        timestamp,
        uptime,
        version: process.env.npm_package_version || '1.0.0',
        services,
        metrics
      };

      logInfo('健康检查完成', { status: overallStatus, timestamp });
      return healthStatus;
    } catch (error) {
      logError('健康检查失败', { error, timestamp });
      throw new Error('健康检查执行失败');
    }
  }

  /**
   * 检查数据库健康状态
   */
  private static async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      await DatabaseService.healthCheck();
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : '数据库连接失败'
      };
    }
  }

  /**
   * 检查AI服务健康状态
   */
  private static async checkAIService(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const aiService = AIServiceFactory.getInstance().getService();
      // 执行简单的健康检查
      const testResult = await aiService.analyzeText('健康检查测试', {
        scenario: 'health_check',
        maxTokens: 10
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: testResult ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          provider: aiService.constructor.name,
          testPassed: !!testResult
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'AI服务不可用'
      };
    }
  }

  /**
   * 检查缓存服务健康状态
   */
  private static async checkCache(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const testKey = 'health_check_' + Date.now();
      const testValue = 'test';
      
      // 测试缓存写入和读取
      await CacheService.set(testKey, testValue, 60);
      const retrieved = await CacheService.get(testKey);
      await CacheService.delete(testKey);
      
      const responseTime = Date.now() - startTime;
      const isHealthy = retrieved === testValue;
      
      return {
        status: isHealthy ? 'healthy' : 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          testPassed: isHealthy
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'unhealthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : '缓存服务不可用'
      };
    }
  }

  /**
   * 检查成本监控服务
   */
  private static async checkCostMonitoring(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const costService = CostMonitoringService.getInstance();
      const stats = await costService.getUserCostStats('test_user', 'day');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          statsRetrieved: !!stats
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : '成本监控服务异常'
      };
    }
  }

  /**
   * 检查性能监控服务健康状态
   */
  private static async checkPerformanceMonitoring(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const performanceService = PerformanceMonitoringService.getInstance();
      const metrics = performanceService.getPerformanceStats('hour');
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
        details: {
          metricsAvailable: !!metrics
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'degraded',
        responseTime,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : '性能监控服务异常'
      };
    }
  }

  /**
   * 获取系统指标
   */
  private static getSystemMetrics(): {
    memory: MemoryMetrics;
    cpu: CpuMetrics;
    requests: RequestMetrics;
  } {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = os.totalmem();
      const loadAverage = os.loadavg();
    
      return {
        memory: {
          used: memUsage.rss,
          total: totalMemory,
          percentage: (memUsage.rss / totalMemory) * 100,
          heap: {
            used: memUsage.heapUsed,
            total: memUsage.heapTotal
          }
        },
        cpu: {
          usage: process.cpuUsage().user / 1000000, // 转换为秒
          loadAverage
        },
        requests: {
          total: this.requestMetrics.total,
          successful: this.requestMetrics.successful,
          failed: this.requestMetrics.failed,
          averageResponseTime: this.calculateAverageResponseTime()
        }
      };
    } catch (error) {
      logError('获取系统指标失败', { error });
      return {
        memory: {
          used: 0,
          total: 0,
          percentage: 0,
          heap: {
            used: 0,
            total: 0
          }
        },
        cpu: {
          usage: 0,
          loadAverage: [0, 0, 0]
        },
        requests: {
          total: this.requestMetrics.total,
          successful: this.requestMetrics.successful,
          failed: this.requestMetrics.failed,
          averageResponseTime: this.calculateAverageResponseTime()
        }
      };
    }
  }

  /**
   * 计算整体健康状态
   */
  private static calculateOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  /**
   * 获取服务检查结果
   */
  private static getServiceResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: result.reason?.message || '服务检查失败'
      };
    }
  }

  /**
   * 记录请求指标
   */
  static recordRequest(responseTime: number, success: boolean): void {
    this.requestMetrics.total++;
    
    if (success) {
      this.requestMetrics.successful++;
    } else {
      this.requestMetrics.failed++;
    }
    
    this.requestMetrics.responseTimes.push(responseTime);
    
    // 保持最近1000个响应时间记录
    if (this.requestMetrics.responseTimes.length > 1000) {
      this.requestMetrics.responseTimes = this.requestMetrics.responseTimes.slice(-1000);
    }
  }

  /**
   * 计算平均响应时间
   */
  private static calculateAverageResponseTime(): number {
    const times = this.requestMetrics.responseTimes;
    if (times.length === 0) return 0;
    
    const sum = times.reduce((acc, time) => acc + time, 0);
    return sum / times.length;
  }

  /**
   * 重置请求指标
   */
  static resetRequestMetrics(): void {
    this.requestMetrics = {
      total: 0,
      successful: 0,
      failed: 0,
      responseTimes: []
    };
    
    logInfo('请求指标已重置');
  }
}