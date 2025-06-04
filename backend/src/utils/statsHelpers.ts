import { logInfo, logError } from './logger.js';

/**
 * 用户统计信息接口
 */
export interface UserStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  pendingTasks: number;
  processingTasks: number;
  totalProcessingTime: number;
  averageProcessingTime: number;
  tasksByType: Record<string, number>;
  tasksByDate: Record<string, number>;
  successRate: number;
}

/**
 * 计算用户统计信息
 */
export const calculateStats = async (tasks: any[]): Promise<UserStats> => {
  try {
    logInfo('开始计算用户统计信息', { taskCount: tasks.length });
    
    const stats: UserStats = {
      totalTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      pendingTasks: 0,
      processingTasks: 0,
      totalProcessingTime: 0,
      averageProcessingTime: 0,
      tasksByType: {},
      tasksByDate: {},
      successRate: 0
    };
    
    // 遍历任务计算统计信息
    tasks.forEach(task => {
      // 按状态统计
      switch (task.status) {
        case 'completed':
          stats.completedTasks++;
          break;
        case 'failed':
          stats.failedTasks++;
          break;
        case 'pending':
          stats.pendingTasks++;
          break;
        case 'processing':
          stats.processingTasks++;
          break;
      }
      
      // 按类型统计
      const taskType = task.type || 'unknown';
      stats.tasksByType[taskType] = (stats.tasksByType[taskType] || 0) + 1;
      
      // 按日期统计
      const dateKey = new Date(task.createdAt).toISOString().split('T')[0];
      stats.tasksByDate[dateKey] = (stats.tasksByDate[dateKey] || 0) + 1;
      
      // 处理时间统计
      if (task.processingTime && typeof task.processingTime === 'number') {
        stats.totalProcessingTime += task.processingTime;
      }
    });
    
    // 计算平均处理时间
    const completedTasksWithTime = tasks.filter(task => 
      task.status === 'completed' && task.processingTime
    );
    
    if (completedTasksWithTime.length > 0) {
      stats.averageProcessingTime = Math.round(
        stats.totalProcessingTime / completedTasksWithTime.length
      );
    }
    
    // 计算成功率
    if (stats.totalTasks > 0) {
      stats.successRate = Math.round(
        (stats.completedTasks / stats.totalTasks) * 100
      );
    }
    
    logInfo('用户统计信息计算完成', stats);
    return stats;
    
  } catch (error) {
    logError('计算用户统计信息失败', { error });
    throw new Error('统计信息计算失败');
  }
};

/**
 * 计算任务趋势数据
 */
export const calculateTaskTrends = (tasks: any[], days: number = 7): Record<string, any> => {
  try {
    const trends: Record<string, any> = {
      daily: {},
      weekly: {},
      monthly: {}
    };
    
    const now = new Date();
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    // 过滤指定时间范围内的任务
    const recentTasks = tasks.filter(task => 
      new Date(task.createdAt) >= startDate
    );
    
    // 按日统计
    recentTasks.forEach(task => {
      const dateKey = new Date(task.createdAt).toISOString().split('T')[0];
      if (!trends.daily[dateKey]) {
        trends.daily[dateKey] = {
          total: 0,
          completed: 0,
          failed: 0,
          pending: 0
        };
      }
      
      trends.daily[dateKey].total++;
      trends.daily[dateKey][task.status]++;
    });
    
    return trends;
    
  } catch (error) {
    logError('计算任务趋势失败', { error });
    return {};
  }
};

/**
 * 计算性能指标
 */
export const calculatePerformanceMetrics = (tasks: any[]): Record<string, any> => {
  try {
    const completedTasks = tasks.filter(task => task.status === 'completed');
    const failedTasks = tasks.filter(task => task.status === 'failed');
    
    const metrics = {
      totalTasks: tasks.length,
      successRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
      failureRate: tasks.length > 0 ? (failedTasks.length / tasks.length) * 100 : 0,
      averageProcessingTime: 0,
      minProcessingTime: 0,
      maxProcessingTime: 0,
      processingTimeDistribution: {
        fast: 0,    // < 5秒
        medium: 0,  // 5-30秒
        slow: 0     // > 30秒
      }
    };
    
    // 计算处理时间相关指标
    const processingTimes = completedTasks
      .filter(task => task.processingTime)
      .map(task => task.processingTime);
    
    if (processingTimes.length > 0) {
      metrics.averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      metrics.minProcessingTime = Math.min(...processingTimes);
      metrics.maxProcessingTime = Math.max(...processingTimes);
      
      // 处理时间分布
      processingTimes.forEach(time => {
        if (time < 5) {
          metrics.processingTimeDistribution.fast++;
        } else if (time <= 30) {
          metrics.processingTimeDistribution.medium++;
        } else {
          metrics.processingTimeDistribution.slow++;
        }
      });
    }
    
    return metrics;
    
  } catch (error) {
    logError('计算性能指标失败', { error });
    return {};
  }
};

/**
 * 生成统计报告
 */
export const generateStatsReport = async (tasks: any[]): Promise<Record<string, any>> => {
  try {
    const basicStats = await calculateStats(tasks);
    const trends = calculateTaskTrends(tasks, 30); // 最近30天
    const performance = calculatePerformanceMetrics(tasks);
    
    return {
      basic: basicStats,
      trends,
      performance,
      generatedAt: new Date().toISOString()
    };
    
  } catch (error) {
    logError('生成统计报告失败', { error });
    throw new Error('统计报告生成失败');
  }
};