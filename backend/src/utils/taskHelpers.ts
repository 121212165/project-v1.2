import { Response } from 'express';
import { AuthenticatedRequest } from '../types/index.js';
import { logError } from './logger.js';

/**
 * 格式化任务响应数据
 */
export const formatTaskResponse = (task: any) => {
  return {
    id: task.id,
    type: task.type,
    status: task.status,
    content: task.content,
    result: task.result,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    userId: task.userId,
    metadata: task.metadata || {},
    processingTime: task.processingTime,
    errorMessage: task.errorMessage
  };
};

/**
 * 验证任务ID格式
 */
export const validateTaskId = (taskId: string): boolean => {
  if (!taskId || typeof taskId !== 'string') {
    return false;
  }
  
  // 检查是否为有效的UUID格式或数字ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const numericRegex = /^\d+$/;
  
  return uuidRegex.test(taskId) || numericRegex.test(taskId);
};

/**
 * 检查任务所有权
 */
export const checkTaskOwnership = async (
  taskId: string, 
  userId: string, 
  taskService: any
): Promise<boolean> => {
  try {
    const task = await taskService.getTaskById(taskId);
    
    if (!task) {
      return false;
    }
    
    return task.userId === userId;
  } catch (error) {
    logError('检查任务所有权失败', { taskId, userId, error });
    return false;
  }
};

/**
 * 验证任务访问权限
 */
export const validateTaskAccess = async (
  req: AuthenticatedRequest,
  res: Response,
  taskId: string,
  taskService: any
): Promise<boolean> => {
  // 验证任务ID格式
  if (!validateTaskId(taskId)) {
    res.status(400).json({
      success: false,
      message: '无效的任务ID格式'
    });
    return false;
  }
  
  // 检查任务所有权
  const hasAccess = await checkTaskOwnership(taskId, req.user!.id, taskService);
  if (!hasAccess) {
    res.status(403).json({
      success: false,
      message: '无权访问此任务'
    });
    return false;
  }
  
  return true;
};

/**
 * 获取任务状态描述
 */
export const getTaskStatusDescription = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '等待处理',
    'processing': '处理中',
    'completed': '已完成',
    'failed': '处理失败',
    'cancelled': '已取消'
  };
  
  return statusMap[status] || '未知状态';
};

/**
 * 获取任务类型描述
 */
export const getTaskTypeDescription = (type: string): string => {
  const typeMap: Record<string, string> = {
    'text_analysis': '文本分析',
    'image_analysis': '图像分析',
    'image_text_analysis': '图文分析',
    'batch_analysis': '批量分析'
  };
  
  return typeMap[type] || '未知类型';
};

/**
 * 计算任务处理时间
 */
export const calculateProcessingTime = (startTime: Date, endTime: Date): number => {
  return Math.round((endTime.getTime() - startTime.getTime()) / 1000); // 返回秒数
};

/**
 * 格式化处理时间显示
 */
export const formatProcessingTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}分${remainingSeconds}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分钟`;
  }
};