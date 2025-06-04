/**
 * 成本控制和监控服务
 * 负责API调用量统计、成本预算告警、调用频率限制等
 */

import { logInfo, logError, logWarn } from '../../utils/logger.js';
import { CacheService } from '../cacheService.js';

/**
 * 使用记录接口
 */
interface UsageRecord {
  userId: string;
  provider: string;
  model: string;
  requestType: 'text' | 'image' | 'batch';
  timestamp: Date;
  cost: number;
  tokens?: {
    input: number;
    output: number;
  };
  processingTime: number;
  success: boolean;
  errorType?: string;
}

/**
 * 成本统计接口
 */
interface CostStats {
  totalCost: number;
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageCost: number;
  averageResponseTime: number;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * 预算配置接口
 */
interface BudgetConfig {
  userId: string;
  dailyLimit: number;
  monthlyLimit: number;
  totalLimit: number;
  alertThresholds: {
    daily: number; // 百分比，如 80 表示 80%
    monthly: number;
    total: number;
  };
  enabled: boolean;
}

/**
 * 频率限制配置接口
 */
interface RateLimitConfig {
  userId: string;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  enabled: boolean;
}

/**
 * 告警配置接口
 */
interface AlertConfig {
  type: 'budget' | 'rate_limit' | 'error_rate' | 'cost_spike';
  threshold: number;
  enabled: boolean;
  notificationMethods: ('email' | 'webhook' | 'log')[];
}

/**
 * 成本监控服务实现
 */
export class CostMonitoringService {
  private static instance: CostMonitoringService;
  private usageRecords: Map<string, UsageRecord[]> = new Map(); // userId -> records
  private budgetConfigs: Map<string, BudgetConfig> = new Map();
  private rateLimitConfigs: Map<string, RateLimitConfig> = new Map();
  private alertConfigs: Map<string, AlertConfig[]> = new Map();
  
  // 默认配置
  private readonly DEFAULT_BUDGET: BudgetConfig = {
    userId: 'default',
    dailyLimit: 100, // 100元/天
    monthlyLimit: 2000, // 2000元/月
    totalLimit: 10000, // 10000元总限制
    alertThresholds: {
      daily: 80,
      monthly: 80,
      total: 90
    },
    enabled: true
  };
  
  private readonly DEFAULT_RATE_LIMIT: RateLimitConfig = {
    userId: 'default',
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    enabled: true
  };

  private constructor() {
    this.initializeDefaultConfigs();
    this.startPeriodicCleanup();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CostMonitoringService {
    if (!CostMonitoringService.instance) {
      CostMonitoringService.instance = new CostMonitoringService();
    }
    return CostMonitoringService.instance;
  }

  /**
   * 记录API使用
   */
  public async recordUsage(record: UsageRecord): Promise<void> {
    try {
      // 获取用户记录列表
      if (!this.usageRecords.has(record.userId)) {
        this.usageRecords.set(record.userId, []);
      }
      
      const userRecords = this.usageRecords.get(record.userId)!;
      userRecords.push(record);
      
      // 限制内存中的记录数量（保留最近1000条）
      if (userRecords.length > 1000) {
        userRecords.splice(0, userRecords.length - 1000);
      }
      
      // 检查预算限制
      await this.checkBudgetLimits(record.userId);
      
      // 检查频率限制
      await this.checkRateLimits(record.userId);
      
      // 检查异常情况
      await this.checkAnomalies(record);
      
      logInfo('使用记录已保存', {
        userId: record.userId,
        provider: record.provider,
        cost: record.cost,
        success: record.success
      });
      
    } catch (error) {
      logError('记录使用失败', {
        userId: record.userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * 检查用户是否可以进行API调用
   */
  public async canMakeRequest(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    limits: {
      budget: boolean;
      rateLimit: boolean;
    };
  }> {
    try {
      // 检查预算限制
      const budgetCheck = await this.checkBudgetLimits(userId, false);
      
      // 检查频率限制
      const rateLimitCheck = await this.checkRateLimits(userId, false);
      
      const allowed = budgetCheck.allowed && rateLimitCheck.allowed;
      let reason: string | undefined;
      
      if (!budgetCheck.allowed) {
        reason = budgetCheck.reason;
      } else if (!rateLimitCheck.allowed) {
        reason = rateLimitCheck.reason;
      }
      
      return {
        allowed,
        reason,
        limits: {
          budget: budgetCheck.allowed,
          rateLimit: rateLimitCheck.allowed
        }
      };
      
    } catch (error) {
      logError('检查请求权限失败', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      
      return {
        allowed: false,
        reason: '权限检查失败',
        limits: {
          budget: false,
          rateLimit: false
        }
      };
    }
  }

  /**
   * 获取用户成本统计
   */
  public async getUserCostStats(userId: string, period: 'day' | 'month' | 'total' = 'day'): Promise<CostStats> {
    const records = this.getUserRecords(userId, period);
    
    if (records.length === 0) {
      return {
        totalCost: 0,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        averageCost: 0,
        averageResponseTime: 0,
        tokenUsage: {
          input: 0,
          output: 0,
          total: 0
        }
      };
    }
    
    const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
    const successCount = records.filter(record => record.success).length;
    const failureCount = records.length - successCount;
    const totalResponseTime = records.reduce((sum, record) => sum + record.processingTime, 0);
    
    const tokenUsage = records.reduce(
      (acc, record) => {
        if (record.tokens) {
          acc.input += record.tokens.input;
          acc.output += record.tokens.output;
        }
        return acc;
      },
      { input: 0, output: 0, total: 0 }
    );
    tokenUsage.total = tokenUsage.input + tokenUsage.output;
    
    return {
      totalCost,
      requestCount: records.length,
      successCount,
      failureCount,
      averageCost: totalCost / records.length,
      averageResponseTime: totalResponseTime / records.length,
      tokenUsage
    };
  }

  /**
   * 生成成本报告
   */
  public async generateCostReport(userId: string, startDate: Date, endDate: Date): Promise<{
    summary: CostStats;
    dailyBreakdown: { date: string; stats: CostStats }[];
    providerBreakdown: { provider: string; stats: CostStats }[];
    modelBreakdown: { model: string; stats: CostStats }[];
    recommendations: string[];
  }> {
    const allRecords = this.usageRecords.get(userId) || [];
    const filteredRecords = allRecords.filter(
      record => record.timestamp >= startDate && record.timestamp <= endDate
    );
    
    // 总体统计
    const summary = this.calculateStatsFromRecords(filteredRecords);
    
    // 按日期分组
    const dailyGroups = this.groupRecordsByDate(filteredRecords);
    const dailyBreakdown = Object.entries(dailyGroups).map(([date, records]) => ({
      date,
      stats: this.calculateStatsFromRecords(records)
    }));
    
    // 按提供商分组
    const providerGroups = this.groupRecordsByProvider(filteredRecords);
    const providerBreakdown = Object.entries(providerGroups).map(([provider, records]) => ({
      provider,
      stats: this.calculateStatsFromRecords(records)
    }));
    
    // 按模型分组
    const modelGroups = this.groupRecordsByModel(filteredRecords);
    const modelBreakdown = Object.entries(modelGroups).map(([model, records]) => ({
      model,
      stats: this.calculateStatsFromRecords(records)
    }));
    
    // 生成建议
    const recommendations = this.generateRecommendations(summary, providerBreakdown, modelBreakdown);
    
    return {
      summary,
      dailyBreakdown,
      providerBreakdown,
      modelBreakdown,
      recommendations
    };
  }

  /**
   * 设置用户预算配置
   */
  public setBudgetConfig(config: BudgetConfig): void {
    this.budgetConfigs.set(config.userId, config);
    logInfo('预算配置已更新', { userId: config.userId, config });
  }

  /**
   * 设置用户频率限制配置
   */
  public setRateLimitConfig(config: RateLimitConfig): void {
    this.rateLimitConfigs.set(config.userId, config);
    logInfo('频率限制配置已更新', { userId: config.userId, config });
  }

  /**
   * 设置告警配置
   */
  public setAlertConfig(userId: string, alerts: AlertConfig[]): void {
    this.alertConfigs.set(userId, alerts);
    logInfo('告警配置已更新', { userId, alertCount: alerts.length });
  }

  /**
   * 获取系统整体统计
   */
  public async getSystemStats(): Promise<{
    totalUsers: number;
    totalCost: number;
    totalRequests: number;
    averageCostPerUser: number;
    topUsers: { userId: string; cost: number }[];
    providerDistribution: { provider: string; percentage: number }[];
  }> {
    const allUsers = Array.from(this.usageRecords.keys());
    let totalCost = 0;
    let totalRequests = 0;
    const userCosts: { userId: string; cost: number }[] = [];
    const providerCounts: Map<string, number> = new Map();
    
    for (const userId of allUsers) {
      const userStats = await this.getUserCostStats(userId, 'total');
      totalCost += userStats.totalCost;
      totalRequests += userStats.requestCount;
      userCosts.push({ userId, cost: userStats.totalCost });
      
      // 统计提供商使用情况
      const userRecords = this.usageRecords.get(userId) || [];
      for (const record of userRecords) {
        const count = providerCounts.get(record.provider) || 0;
        providerCounts.set(record.provider, count + 1);
      }
    }
    
    // 排序用户成本
    userCosts.sort((a, b) => b.cost - a.cost);
    const topUsers = userCosts.slice(0, 10);
    
    // 计算提供商分布
    const totalProviderRequests = Array.from(providerCounts.values()).reduce((sum, count) => sum + count, 0);
    const providerDistribution = Array.from(providerCounts.entries()).map(([provider, count]) => ({
      provider,
      percentage: (count / totalProviderRequests) * 100
    }));
    
    return {
      totalUsers: allUsers.length,
      totalCost,
      totalRequests,
      averageCostPerUser: allUsers.length > 0 ? totalCost / allUsers.length : 0,
      topUsers,
      providerDistribution
    };
  }

  // 私有方法

  /**
   * 初始化默认配置
   */
  private initializeDefaultConfigs(): void {
    this.budgetConfigs.set('default', this.DEFAULT_BUDGET);
    this.rateLimitConfigs.set('default', this.DEFAULT_RATE_LIMIT);
    
    logInfo('成本监控服务初始化完成');
  }

  /**
   * 检查预算限制
   */
  private async checkBudgetLimits(userId: string, triggerAlert: boolean = true): Promise<{
    allowed: boolean;
    reason?: string;
    usage: {
      daily: number;
      monthly: number;
      total: number;
    };
  }> {
    const config = this.budgetConfigs.get(userId) || this.budgetConfigs.get('default')!;
    
    if (!config.enabled) {
      return {
        allowed: true,
        usage: { daily: 0, monthly: 0, total: 0 }
      };
    }
    
    const dailyStats = await this.getUserCostStats(userId, 'day');
    const monthlyStats = await this.getUserCostStats(userId, 'month');
    const totalStats = await this.getUserCostStats(userId, 'total');
    
    const usage = {
      daily: dailyStats.totalCost,
      monthly: monthlyStats.totalCost,
      total: totalStats.totalCost
    };
    
    // 检查限制
    if (usage.daily > config.dailyLimit) {
      if (triggerAlert) {
        await this.triggerAlert(userId, 'budget', `每日预算超限: ${usage.daily}/${config.dailyLimit}`);
      }
      return {
        allowed: false,
        reason: `已超出每日预算限制 ${config.dailyLimit} 元`,
        usage
      };
    }
    
    if (usage.monthly > config.monthlyLimit) {
      if (triggerAlert) {
        await this.triggerAlert(userId, 'budget', `每月预算超限: ${usage.monthly}/${config.monthlyLimit}`);
      }
      return {
        allowed: false,
        reason: `已超出每月预算限制 ${config.monthlyLimit} 元`,
        usage
      };
    }
    
    if (usage.total > config.totalLimit) {
      if (triggerAlert) {
        await this.triggerAlert(userId, 'budget', `总预算超限: ${usage.total}/${config.totalLimit}`);
      }
      return {
        allowed: false,
        reason: `已超出总预算限制 ${config.totalLimit} 元`,
        usage
      };
    }
    
    // 检查告警阈值
    if (triggerAlert) {
      const dailyPercentage = (usage.daily / config.dailyLimit) * 100;
      const monthlyPercentage = (usage.monthly / config.monthlyLimit) * 100;
      const totalPercentage = (usage.total / config.totalLimit) * 100;
      
      if (dailyPercentage >= config.alertThresholds.daily) {
        await this.triggerAlert(userId, 'budget', `每日预算使用率达到 ${dailyPercentage.toFixed(1)}%`);
      }
      
      if (monthlyPercentage >= config.alertThresholds.monthly) {
        await this.triggerAlert(userId, 'budget', `每月预算使用率达到 ${monthlyPercentage.toFixed(1)}%`);
      }
      
      if (totalPercentage >= config.alertThresholds.total) {
        await this.triggerAlert(userId, 'budget', `总预算使用率达到 ${totalPercentage.toFixed(1)}%`);
      }
    }
    
    return {
      allowed: true,
      usage
    };
  }

  /**
   * 检查频率限制
   */
  private async checkRateLimits(userId: string, triggerAlert: boolean = true): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const config = this.rateLimitConfigs.get(userId) || this.rateLimitConfigs.get('default')!;
    
    if (!config.enabled) {
      return { allowed: true };
    }
    
    const now = new Date();
    const records = this.usageRecords.get(userId) || [];
    
    // 检查每分钟限制
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const recentMinuteRequests = records.filter(record => record.timestamp >= oneMinuteAgo).length;
    
    if (recentMinuteRequests >= config.requestsPerMinute) {
      if (triggerAlert) {
        await this.triggerAlert(userId, 'rate_limit', `每分钟请求数超限: ${recentMinuteRequests}/${config.requestsPerMinute}`);
      }
      return {
        allowed: false,
        reason: `已超出每分钟请求限制 ${config.requestsPerMinute} 次`
      };
    }
    
    // 检查每小时限制
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentHourRequests = records.filter(record => record.timestamp >= oneHourAgo).length;
    
    if (recentHourRequests >= config.requestsPerHour) {
      if (triggerAlert) {
        await this.triggerAlert(userId, 'rate_limit', `每小时请求数超限: ${recentHourRequests}/${config.requestsPerHour}`);
      }
      return {
        allowed: false,
        reason: `已超出每小时请求限制 ${config.requestsPerHour} 次`
      };
    }
    
    // 检查每日限制
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentDayRequests = records.filter(record => record.timestamp >= oneDayAgo).length;
    
    if (recentDayRequests >= config.requestsPerDay) {
      if (triggerAlert) {
        await this.triggerAlert(userId, 'rate_limit', `每日请求数超限: ${recentDayRequests}/${config.requestsPerDay}`);
      }
      return {
        allowed: false,
        reason: `已超出每日请求限制 ${config.requestsPerDay} 次`
      };
    }
    
    return { allowed: true };
  }

  /**
   * 检查异常情况
   */
  private async checkAnomalies(record: UsageRecord): Promise<void> {
    // 检查成本异常
    const userRecords = this.usageRecords.get(record.userId) || [];
    const recentRecords = userRecords.slice(-10); // 最近10次请求
    
    if (recentRecords.length >= 5) {
      const averageCost = recentRecords.reduce((sum, r) => sum + r.cost, 0) / recentRecords.length;
      
      // 如果当前请求成本是平均成本的3倍以上，触发告警
      if (record.cost > averageCost * 3) {
        await this.triggerAlert(record.userId, 'cost_spike', `成本异常: 当前 ${record.cost} 元，平均 ${averageCost.toFixed(2)} 元`);
      }
    }
    
    // 检查错误率
    const recentFailures = recentRecords.filter(r => !r.success).length;
    const errorRate = recentFailures / recentRecords.length;
    
    if (errorRate > 0.5 && recentRecords.length >= 5) {
      await this.triggerAlert(record.userId, 'error_rate', `错误率过高: ${(errorRate * 100).toFixed(1)}%`);
    }
  }

  /**
   * 触发告警
   */
  private async triggerAlert(userId: string, type: string, message: string): Promise<void> {
    const alerts = this.alertConfigs.get(userId) || [];
    const relevantAlerts = alerts.filter(alert => alert.type === type && alert.enabled);
    
    for (const alert of relevantAlerts) {
      for (const method of alert.notificationMethods) {
        switch (method) {
          case 'log':
            logWarn('成本监控告警', { userId, type, message });
            break;
          case 'email':
            // 这里可以集成邮件发送服务
            logInfo('邮件告警（未实现）', { userId, type, message });
            break;
          case 'webhook':
            // 这里可以集成Webhook通知
            logInfo('Webhook告警（未实现）', { userId, type, message });
            break;
        }
      }
    }
  }

  /**
   * 获取用户记录（按时间段过滤）
   */
  private getUserRecords(userId: string, period: 'day' | 'month' | 'total'): UsageRecord[] {
    const records = this.usageRecords.get(userId) || [];
    
    if (period === 'total') {
      return records;
    }
    
    const now = new Date();
    let startTime: Date;
    
    if (period === 'day') {
      startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else { // month
      startTime = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    
    return records.filter(record => record.timestamp >= startTime);
  }

  /**
   * 从记录计算统计信息
   */
  private calculateStatsFromRecords(records: UsageRecord[]): CostStats {
    if (records.length === 0) {
      return {
        totalCost: 0,
        requestCount: 0,
        successCount: 0,
        failureCount: 0,
        averageCost: 0,
        averageResponseTime: 0,
        tokenUsage: { input: 0, output: 0, total: 0 }
      };
    }
    
    const totalCost = records.reduce((sum, record) => sum + record.cost, 0);
    const successCount = records.filter(record => record.success).length;
    const totalResponseTime = records.reduce((sum, record) => sum + record.processingTime, 0);
    
    const tokenUsage = records.reduce(
      (acc, record) => {
        if (record.tokens) {
          acc.input += record.tokens.input;
          acc.output += record.tokens.output;
        }
        return acc;
      },
      { input: 0, output: 0, total: 0 }
    );
    tokenUsage.total = tokenUsage.input + tokenUsage.output;
    
    return {
      totalCost,
      requestCount: records.length,
      successCount,
      failureCount: records.length - successCount,
      averageCost: totalCost / records.length,
      averageResponseTime: totalResponseTime / records.length,
      tokenUsage
    };
  }

  /**
   * 按日期分组记录
   */
  private groupRecordsByDate(records: UsageRecord[]): { [date: string]: UsageRecord[] } {
    return records.reduce((groups, record) => {
      const date = record.timestamp.toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(record);
      return groups;
    }, {} as { [date: string]: UsageRecord[] });
  }

  /**
   * 按提供商分组记录
   */
  private groupRecordsByProvider(records: UsageRecord[]): { [provider: string]: UsageRecord[] } {
    return records.reduce((groups, record) => {
      if (!groups[record.provider]) {
        groups[record.provider] = [];
      }
      groups[record.provider].push(record);
      return groups;
    }, {} as { [provider: string]: UsageRecord[] });
  }

  /**
   * 按模型分组记录
   */
  private groupRecordsByModel(records: UsageRecord[]): { [model: string]: UsageRecord[] } {
    return records.reduce((groups, record) => {
      if (!groups[record.model]) {
        groups[record.model] = [];
      }
      groups[record.model].push(record);
      return groups;
    }, {} as { [model: string]: UsageRecord[] });
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(
    summary: CostStats,
    providerBreakdown: { provider: string; stats: CostStats }[],
    modelBreakdown: { model: string; stats: CostStats }[]
  ): string[] {
    const recommendations: string[] = [];
    
    // 成功率建议
    const successRate = summary.requestCount > 0 ? summary.successCount / summary.requestCount : 0;
    if (successRate < 0.9) {
      recommendations.push(`API成功率较低 (${(successRate * 100).toFixed(1)}%)，建议检查请求参数和网络连接`);
    }
    
    // 成本效率建议
    if (summary.averageCost > 1) {
      recommendations.push('平均请求成本较高，建议优化提示词长度或选择更经济的模型');
    }
    
    // 提供商建议
    if (providerBreakdown.length > 1) {
      const sortedProviders = providerBreakdown.sort((a, b) => a.stats.averageCost - b.stats.averageCost);
      const cheapest = sortedProviders[0];
      recommendations.push(`${cheapest.provider} 的平均成本最低 (${cheapest.stats.averageCost.toFixed(3)} 元/请求)`);
    }
    
    // 响应时间建议
    if (summary.averageResponseTime > 5000) {
      recommendations.push('平均响应时间较长，建议启用缓存或选择更快的模型');
    }
    
    return recommendations;
  }

  /**
   * 启动定期清理
   */
  private startPeriodicCleanup(): void {
    // 每小时清理一次过期数据
    setInterval(() => {
      this.cleanupOldRecords();
    }, 60 * 60 * 1000);
  }

  /**
   * 清理旧记录
   */
  private cleanupOldRecords(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    for (const [userId, records] of this.usageRecords.entries()) {
      const filteredRecords = records.filter(record => record.timestamp >= thirtyDaysAgo);
      this.usageRecords.set(userId, filteredRecords);
    }
    
    logInfo('旧记录清理完成');
  }
}

// 导出单例实例
export const costMonitoringService = CostMonitoringService.getInstance();