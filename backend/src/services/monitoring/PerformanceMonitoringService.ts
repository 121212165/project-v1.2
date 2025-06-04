/**
 * 性能监控服务
 * 负责API响应时间、成功率、系统资源使用等监控
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import * as os from 'os';
import * as process from 'process';

/**
 * 性能指标接口
 */
interface PerformanceMetric {
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  success: boolean;
  userId?: string;
  userAgent?: string;
  ip?: string;
  memoryUsage: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  cpuUsage: {
    user: number;
    system: number;
  };
}

/**
 * 系统资源指标接口
 */
interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number; // 百分比
    loadAverage: number[];
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
  process: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    uptime: number;
  };
  disk?: {
    total: number;
    free: number;
    used: number;
    usagePercentage: number;
  };
}

/**
 * 性能统计接口
 */
interface PerformanceStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageResponseTime: number;
  medianResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorsByStatusCode: { [statusCode: number]: number };
  slowestEndpoints: { endpoint: string; averageTime: number }[];
}

/**
 * 告警规则接口
 */
interface AlertRule {
  id: string;
  name: string;
  type: 'response_time' | 'error_rate' | 'cpu_usage' | 'memory_usage' | 'disk_usage';
  threshold: number;
  duration: number; // 持续时间（秒）
  enabled: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  notificationMethods: ('email' | 'webhook' | 'log')[];
}

/**
 * 性能监控服务实现
 */
export class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private alertStates: Map<string, { triggered: boolean; since: Date }> = new Map();
  
  // 配置
  private readonly MAX_METRICS = 10000; // 最大保存的指标数量
  private readonly SYSTEM_METRICS_INTERVAL = 30000; // 系统指标收集间隔（毫秒）
  private readonly ALERT_CHECK_INTERVAL = 60000; // 告警检查间隔（毫秒）
  
  private systemMetricsTimer?: NodeJS.Timeout;
  private alertCheckTimer?: NodeJS.Timeout;
  private lastCpuUsage?: NodeJS.CpuUsage;

  private constructor() {
    this.initializeDefaultAlertRules();
    this.startSystemMetricsCollection();
    this.startAlertChecking();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * 记录API性能指标
   */
  public recordMetric(metric: Omit<PerformanceMetric, 'timestamp' | 'memoryUsage' | 'cpuUsage'>): void {
    try {
      const fullMetric: PerformanceMetric = {
        ...metric,
        timestamp: new Date(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(this.lastCpuUsage)
      };
      
      this.metrics.push(fullMetric);
      
      // 限制内存中的指标数量
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics.splice(0, this.metrics.length - this.MAX_METRICS);
      }
      
      // 更新CPU使用基准
      this.lastCpuUsage = process.cpuUsage();
      
      logInfo('性能指标已记录', {
        endpoint: metric.endpoint,
        responseTime: metric.responseTime,
        success: metric.success
      });
      
    } catch (error) {
      logError('记录性能指标失败', {
        endpoint: metric.endpoint,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 获取性能统计
   */
  public getPerformanceStats(period: 'hour' | 'day' | 'week' = 'hour'): PerformanceStats {
    const filteredMetrics = this.getMetricsForPeriod(period);
    
    if (filteredMetrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        averageResponseTime: 0,
        medianResponseTime: 0,
        p95ResponseTime: 0,
        p99ResponseTime: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        requestsPerSecond: 0,
        errorsByStatusCode: {},
        slowestEndpoints: []
      };
    }
    
    const totalRequests = filteredMetrics.length;
    const successfulRequests = filteredMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;
    
    // 响应时间统计
    const responseTimes = filteredMetrics.map(m => m.responseTime).sort((a, b) => a - b);
    const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const medianResponseTime = this.calculatePercentile(responseTimes, 50);
    const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
    const p99ResponseTime = this.calculatePercentile(responseTimes, 99);
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    // 计算RPS
    const timeSpan = this.getTimeSpanForPeriod(period);
    const requestsPerSecond = totalRequests / (timeSpan / 1000);
    
    // 错误统计
    const errorsByStatusCode: { [statusCode: number]: number } = {};
    filteredMetrics.filter(m => !m.success).forEach(m => {
      errorsByStatusCode[m.statusCode] = (errorsByStatusCode[m.statusCode] || 0) + 1;
    });
    
    // 最慢的端点
    const endpointStats = this.groupMetricsByEndpoint(filteredMetrics);
    const slowestEndpoints = Object.entries(endpointStats)
      .map(([endpoint, metrics]) => ({
        endpoint,
        averageTime: metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length
      }))
      .sort((a, b) => b.averageTime - a.averageTime)
      .slice(0, 10);
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      averageResponseTime,
      medianResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      errorsByStatusCode,
      slowestEndpoints
    };
  }

  /**
   * 获取系统资源统计
   */
  public getSystemStats(period: 'hour' | 'day' | 'week' = 'hour'): {
    current: SystemMetrics;
    average: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage?: number;
    };
    peak: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage?: number;
    };
    timeline: SystemMetrics[];
  } {
    const filteredSystemMetrics = this.getSystemMetricsForPeriod(period);
    const current = this.getCurrentSystemMetrics();
    
    if (filteredSystemMetrics.length === 0) {
      return {
        current,
        average: {
          cpuUsage: 0,
          memoryUsage: 0
        },
        peak: {
          cpuUsage: 0,
          memoryUsage: 0
        },
        timeline: []
      };
    }
    
    // 计算平均值
    const avgCpuUsage = filteredSystemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / filteredSystemMetrics.length;
    const avgMemoryUsage = filteredSystemMetrics.reduce((sum, m) => sum + m.memory.usagePercentage, 0) / filteredSystemMetrics.length;
    
    // 计算峰值
    const peakCpuUsage = Math.max(...filteredSystemMetrics.map(m => m.cpu.usage));
    const peakMemoryUsage = Math.max(...filteredSystemMetrics.map(m => m.memory.usagePercentage));
    
    return {
      current,
      average: {
        cpuUsage: avgCpuUsage,
        memoryUsage: avgMemoryUsage
      },
      peak: {
        cpuUsage: peakCpuUsage,
        memoryUsage: peakMemoryUsage
      },
      timeline: filteredSystemMetrics
    };
  }

  /**
   * 获取端点性能分析
   */
  public getEndpointAnalysis(period: 'hour' | 'day' | 'week' = 'hour'): {
    endpoint: string;
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    p95ResponseTime: number;
    errorsPerHour: number;
  }[] {
    const filteredMetrics = this.getMetricsForPeriod(period);
    const endpointStats = this.groupMetricsByEndpoint(filteredMetrics);
    const timeSpanHours = this.getTimeSpanForPeriod(period) / (1000 * 60 * 60);
    
    return Object.entries(endpointStats).map(([endpoint, metrics]) => {
      const totalRequests = metrics.length;
      const successfulRequests = metrics.filter(m => m.success).length;
      const successRate = (successfulRequests / totalRequests) * 100;
      const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95ResponseTime = this.calculatePercentile(responseTimes, 95);
      const errorCount = totalRequests - successfulRequests;
      const errorsPerHour = errorCount / timeSpanHours;
      
      return {
        endpoint,
        totalRequests,
        successRate,
        averageResponseTime,
        p95ResponseTime,
        errorsPerHour
      };
    }).sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * 获取用户性能分析
   */
  public getUserAnalysis(period: 'hour' | 'day' | 'week' = 'hour'): {
    userId: string;
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorsPerHour: number;
  }[] {
    const filteredMetrics = this.getMetricsForPeriod(period).filter(m => m.userId);
    const userStats = this.groupMetricsByUser(filteredMetrics);
    const timeSpanHours = this.getTimeSpanForPeriod(period) / (1000 * 60 * 60);
    
    return Object.entries(userStats).map(([userId, metrics]) => {
      const totalRequests = metrics.length;
      const successfulRequests = metrics.filter(m => m.success).length;
      const successRate = (successfulRequests / totalRequests) * 100;
      const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
      const errorCount = totalRequests - successfulRequests;
      const errorsPerHour = errorCount / timeSpanHours;
      
      return {
        userId,
        totalRequests,
        successRate,
        averageResponseTime,
        errorsPerHour
      };
    }).sort((a, b) => b.totalRequests - a.totalRequests);
  }

  /**
   * 生成性能报告
   */
  public generatePerformanceReport(period: 'hour' | 'day' | 'week' = 'day'): {
    summary: PerformanceStats;
    systemStats: ReturnType<typeof this.getSystemStats>;
    endpointAnalysis: ReturnType<typeof this.getEndpointAnalysis>;
    userAnalysis: ReturnType<typeof this.getUserAnalysis>;
    alerts: { rule: AlertRule; triggered: boolean; since?: Date }[];
    recommendations: string[];
  } {
    const summary = this.getPerformanceStats(period);
    const systemStats = this.getSystemStats(period);
    const endpointAnalysis = this.getEndpointAnalysis(period);
    const userAnalysis = this.getUserAnalysis(period);
    
    // 获取告警状态
    const alerts = Array.from(this.alertRules.values()).map(rule => {
      const state = this.alertStates.get(rule.id);
      return {
        rule,
        triggered: state?.triggered || false,
        since: state?.since
      };
    });
    
    // 生成建议
    const recommendations = this.generateRecommendations(summary, systemStats, endpointAnalysis);
    
    return {
      summary,
      systemStats,
      endpointAnalysis,
      userAnalysis,
      alerts,
      recommendations
    };
  }

  /**
   * 添加告警规则
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.alertStates.set(rule.id, { triggered: false, since: new Date() });
    logInfo('告警规则已添加', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * 移除告警规则
   */
  public removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.alertStates.delete(ruleId);
    logInfo('告警规则已移除', { ruleId });
  }

  /**
   * 获取健康检查状态
   */
  public getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: {
      responseTime: { status: 'ok' | 'warning' | 'critical'; value: number };
      errorRate: { status: 'ok' | 'warning' | 'critical'; value: number };
      cpuUsage: { status: 'ok' | 'warning' | 'critical'; value: number };
      memoryUsage: { status: 'ok' | 'warning' | 'critical'; value: number };
    };
  } {
    const recentStats = this.getPerformanceStats('hour');
    const systemStats = this.getSystemStats('hour');
    
    // 响应时间检查
    const responseTimeStatus = recentStats.averageResponseTime < 1000 ? 'ok' : 
                              recentStats.averageResponseTime < 3000 ? 'warning' : 'critical';
    
    // 错误率检查
    const errorRateStatus = recentStats.successRate > 95 ? 'ok' : 
                           recentStats.successRate > 90 ? 'warning' : 'critical';
    
    // CPU使用率检查
    const cpuUsageStatus = systemStats.current.cpu.usage < 70 ? 'ok' : 
                          systemStats.current.cpu.usage < 90 ? 'warning' : 'critical';
    
    // 内存使用率检查
    const memoryUsageStatus = systemStats.current.memory.usagePercentage < 80 ? 'ok' : 
                             systemStats.current.memory.usagePercentage < 95 ? 'warning' : 'critical';
    
    const checks = {
      responseTime: { status: responseTimeStatus, value: recentStats.averageResponseTime },
      errorRate: { status: errorRateStatus, value: 100 - recentStats.successRate },
      cpuUsage: { status: cpuUsageStatus, value: systemStats.current.cpu.usage },
      memoryUsage: { status: memoryUsageStatus, value: systemStats.current.memory.usagePercentage }
    };
    
    // 确定整体状态
    const criticalCount = Object.values(checks).filter(check => check.status === 'critical').length;
    const warningCount = Object.values(checks).filter(check => check.status === 'warning').length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (criticalCount > 0) {
      status = 'unhealthy';
    } else if (warningCount > 0) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }
    
    return { status, checks };
  }

  /**
   * 清理旧数据
   */
  public cleanup(): void {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    // 清理性能指标
    this.metrics = this.metrics.filter(metric => metric.timestamp >= sevenDaysAgo);
    
    // 清理系统指标
    this.systemMetrics = this.systemMetrics.filter(metric => metric.timestamp >= sevenDaysAgo);
    
    logInfo('性能监控数据清理完成', {
      metricsCount: this.metrics.length,
      systemMetricsCount: this.systemMetrics.length
    });
  }

  /**
   * 停止监控
   */
  public stop(): void {
    if (this.systemMetricsTimer) {
      clearInterval(this.systemMetricsTimer);
      this.systemMetricsTimer = undefined;
    }
    
    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
      this.alertCheckTimer = undefined;
    }
    
    logInfo('性能监控服务已停止');
  }

  // 私有方法

  /**
   * 初始化默认告警规则
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_response_time',
        name: '响应时间过高',
        type: 'response_time',
        threshold: 5000, // 5秒
        duration: 300, // 5分钟
        enabled: true,
        severity: 'high',
        notificationMethods: ['log']
      },
      {
        id: 'high_error_rate',
        name: '错误率过高',
        type: 'error_rate',
        threshold: 10, // 10%
        duration: 300,
        enabled: true,
        severity: 'high',
        notificationMethods: ['log']
      },
      {
        id: 'high_cpu_usage',
        name: 'CPU使用率过高',
        type: 'cpu_usage',
        threshold: 90, // 90%
        duration: 600, // 10分钟
        enabled: true,
        severity: 'critical',
        notificationMethods: ['log']
      },
      {
        id: 'high_memory_usage',
        name: '内存使用率过高',
        type: 'memory_usage',
        threshold: 95, // 95%
        duration: 300,
        enabled: true,
        severity: 'critical',
        notificationMethods: ['log']
      }
    ];
    
    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
      this.alertStates.set(rule.id, { triggered: false, since: new Date() });
    });
    
    logInfo('默认告警规则已初始化', { ruleCount: defaultRules.length });
  }

  /**
   * 开始系统指标收集
   */
  private startSystemMetricsCollection(): void {
    this.systemMetricsTimer = setInterval(() => {
      try {
        const systemMetric = this.getCurrentSystemMetrics();
        this.systemMetrics.push(systemMetric);
        
        // 限制内存中的系统指标数量
        if (this.systemMetrics.length > 2880) { // 24小时的数据（每30秒一次）
          this.systemMetrics.splice(0, this.systemMetrics.length - 2880);
        }
        
      } catch (error) {
        logError('收集系统指标失败', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, this.SYSTEM_METRICS_INTERVAL);
    
    logInfo('系统指标收集已启动');
  }

  /**
   * 开始告警检查
   */
  private startAlertChecking(): void {
    this.alertCheckTimer = setInterval(() => {
      this.checkAlerts();
    }, this.ALERT_CHECK_INTERVAL);
    
    logInfo('告警检查已启动');
  }

  /**
   * 检查告警
   */
  private checkAlerts(): void {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;
      
      try {
        const shouldTrigger = this.shouldTriggerAlert(rule);
        const currentState = this.alertStates.get(ruleId);
        
        if (shouldTrigger && !currentState?.triggered) {
          // 触发告警
          this.alertStates.set(ruleId, { triggered: true, since: new Date() });
          this.sendAlert(rule, '告警触发');
          
        } else if (!shouldTrigger && currentState?.triggered) {
          // 恢复告警
          this.alertStates.set(ruleId, { triggered: false, since: new Date() });
          this.sendAlert(rule, '告警恢复');
        }
        
      } catch (error) {
        logError('检查告警规则失败', {
          ruleId,
          ruleName: rule.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  /**
   * 判断是否应该触发告警
   */
  private shouldTriggerAlert(rule: AlertRule): boolean {
    const now = new Date();
    const checkPeriod = new Date(now.getTime() - rule.duration * 1000);
    
    switch (rule.type) {
      case 'response_time': {
        const recentMetrics = this.metrics.filter(m => m.timestamp >= checkPeriod);
        if (recentMetrics.length === 0) return false;
        const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
        return avgResponseTime > rule.threshold;
      }
      
      case 'error_rate': {
        const recentMetrics = this.metrics.filter(m => m.timestamp >= checkPeriod);
        if (recentMetrics.length === 0) return false;
        const errorRate = (recentMetrics.filter(m => !m.success).length / recentMetrics.length) * 100;
        return errorRate > rule.threshold;
      }
      
      case 'cpu_usage': {
        const recentSystemMetrics = this.systemMetrics.filter(m => m.timestamp >= checkPeriod);
        if (recentSystemMetrics.length === 0) return false;
        const avgCpuUsage = recentSystemMetrics.reduce((sum, m) => sum + m.cpu.usage, 0) / recentSystemMetrics.length;
        return avgCpuUsage > rule.threshold;
      }
      
      case 'memory_usage': {
        const recentSystemMetrics = this.systemMetrics.filter(m => m.timestamp >= checkPeriod);
        if (recentSystemMetrics.length === 0) return false;
        const avgMemoryUsage = recentSystemMetrics.reduce((sum, m) => sum + m.memory.usagePercentage, 0) / recentSystemMetrics.length;
        return avgMemoryUsage > rule.threshold;
      }
      
      default:
        return false;
    }
  }

  /**
   * 发送告警
   */
  private sendAlert(rule: AlertRule, action: string): void {
    const message = `${action}: ${rule.name} (阈值: ${rule.threshold})`;
    
    for (const method of rule.notificationMethods) {
      switch (method) {
        case 'log':
          if (rule.severity === 'critical') {
            logError(message, { ruleId: rule.id, severity: rule.severity });
          } else {
            logWarn(message, { ruleId: rule.id, severity: rule.severity });
          }
          break;
        case 'email':
          // 这里可以集成邮件发送服务
          logInfo('邮件告警（未实现）', { rule: rule.name, message });
          break;
        case 'webhook':
          // 这里可以集成Webhook通知
          logInfo('Webhook告警（未实现）', { rule: rule.name, message });
          break;
      }
    }
  }

  /**
   * 获取当前系统指标
   */
  private getCurrentSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // 计算CPU使用率（简化版本）
    let cpuUsage = 0;
    if (cpus.length > 0) {
      const totalTicks = cpus.reduce((acc, cpu) => {
        const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
        const idle = cpu.times.idle;
        return acc + ((total - idle) / total);
      }, 0);
      cpuUsage = (totalTicks / cpus.length) * 100;
    }
    
    return {
      timestamp: new Date(),
      cpu: {
        usage: cpuUsage,
        loadAverage: os.loadavg()
      },
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercentage: (usedMem / totalMem) * 100
      },
      process: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        uptime: process.uptime()
      }
    };
  }

  /**
   * 获取指定时间段的指标
   */
  private getMetricsForPeriod(period: 'hour' | 'day' | 'week'): PerformanceMetric[] {
    const now = new Date();
    let startTime: Date;
    
    switch (period) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }
    
    return this.metrics.filter(metric => metric.timestamp >= startTime);
  }

  /**
   * 获取指定时间段的系统指标
   */
  private getSystemMetricsForPeriod(period: 'hour' | 'day' | 'week'): SystemMetrics[] {
    const now = new Date();
    let startTime: Date;
    
    switch (period) {
      case 'hour':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
    }
    
    return this.systemMetrics.filter(metric => metric.timestamp >= startTime);
  }

  /**
   * 获取时间段的毫秒数
   */
  private getTimeSpanForPeriod(period: 'hour' | 'day' | 'week'): number {
    switch (period) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
    }
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * 按端点分组指标
   */
  private groupMetricsByEndpoint(metrics: PerformanceMetric[]): { [endpoint: string]: PerformanceMetric[] } {
    return metrics.reduce((groups, metric) => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
      return groups;
    }, {} as { [endpoint: string]: PerformanceMetric[] });
  }

  /**
   * 按用户分组指标
   */
  private groupMetricsByUser(metrics: PerformanceMetric[]): { [userId: string]: PerformanceMetric[] } {
    return metrics.reduce((groups, metric) => {
      if (!metric.userId) return groups;
      
      if (!groups[metric.userId]) {
        groups[metric.userId] = [];
      }
      groups[metric.userId].push(metric);
      return groups;
    }, {} as { [userId: string]: PerformanceMetric[] });
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    summary: PerformanceStats,
    systemStats: ReturnType<typeof this.getSystemStats>,
    endpointAnalysis: ReturnType<typeof this.getEndpointAnalysis>
  ): string[] {
    const recommendations: string[] = [];
    
    // 响应时间建议
    if (summary.averageResponseTime > 2000) {
      recommendations.push('平均响应时间较长，建议优化数据库查询或启用缓存');
    }
    
    if (summary.p95ResponseTime > 5000) {
      recommendations.push('95%响应时间过长，建议检查慢查询和性能瓶颈');
    }
    
    // 成功率建议
    if (summary.successRate < 95) {
      recommendations.push(`API成功率较低 (${summary.successRate.toFixed(1)}%)，建议检查错误日志和异常处理`);
    }
    
    // 系统资源建议
    if (systemStats.current.cpu.usage > 80) {
      recommendations.push('CPU使用率较高，建议优化算法或增加服务器资源');
    }
    
    if (systemStats.current.memory.usagePercentage > 85) {
      recommendations.push('内存使用率较高，建议检查内存泄漏或增加内存');
    }
    
    // 端点建议
    const slowEndpoints = endpointAnalysis.filter(ep => ep.averageResponseTime > 3000);
    if (slowEndpoints.length > 0) {
      recommendations.push(`发现 ${slowEndpoints.length} 个慢端点，建议优化: ${slowEndpoints.slice(0, 3).map(ep => ep.endpoint).join(', ')}`);
    }
    
    const errorProneEndpoints = endpointAnalysis.filter(ep => ep.successRate < 90);
    if (errorProneEndpoints.length > 0) {
      recommendations.push(`发现 ${errorProneEndpoints.length} 个高错误率端点，建议检查: ${errorProneEndpoints.slice(0, 3).map(ep => ep.endpoint).join(', ')}`);
    }
    
    return recommendations;
  }
}

// 导出单例实例
export const performanceMonitoringService = PerformanceMonitoringService.getInstance();