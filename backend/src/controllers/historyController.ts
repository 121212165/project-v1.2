import { Response } from 'express';
import { AnalysisTaskService } from '../services/database.service.js';
import { ApiResponse, AuthenticatedRequest } from '../types/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { formatTaskResponse, validateTaskId, checkTaskOwnership } from '../utils/taskHelpers.js';
import { calculateStats } from '../utils/statsHelpers.js';
import { handleFileDelete } from '../utils/fileHelpers.js';
import { errorHandler } from '../utils/errorHandler.js';
// 初始化服务实例
const analysisTaskService = new AnalysisTaskService();

/**
 * 获取用户分析历史记录
 */
export const getUserHistory = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20, type, status } = req.query;

    const paginationParams = {
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      type: type as string,
      status: status as string
    };

    logInfo('获取用户分析历史', { userId, ...paginationParams });

    const tasks = await analysisTaskService.getUserTasks(userId, paginationParams);
    const formattedTasks = tasks.map(formatTaskResponse);

    res.json({
      success: true,
      data: {
        tasks: formattedTasks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: formattedTasks.length
        }
      },
      message: '获取历史记录成功'
    });
  } catch (error) {
    errorHandler(error, res, '获取用户历史记录失败');
  }
};

/**
 * 获取单个分析任务详情
 */
export const getTaskDetail = async (
  req: AuthenticatedRequest<{ taskId: string }>,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const taskId = validateTaskId(req.params.taskId, res);
    if (!taskId) return;

    logInfo('获取任务详情', { userId, taskId });

    const task = await analysisTaskService.getTaskById(taskId);
    if (!task || !checkTaskOwnership(task, userId, res)) return;

    res.json({
      success: true,
      data: task,
      message: '获取任务详情成功'
    });
  } catch (error) {
    errorHandler(error, res, '获取任务详情失败');
  }
};

/**
 * 删除分析任务
 */
export const deleteTask = async (
  req: AuthenticatedRequest<{ taskId: string }>,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const taskId = validateTaskId(req.params.taskId, res);
    if (!taskId) return;

    logInfo('删除任务', { userId, taskId });

    const task = await analysisTaskService.getTaskById(taskId);
    if (!task || !checkTaskOwnership(task, userId, res)) return;

    if (task.filePath) {
      await handleFileDelete(task.filePath);
    }

    await analysisTaskService.deleteTask(taskId);

    res.json({
      success: true,
      message: '删除任务成功'
    });
  } catch (error) {
    errorHandler(error, res, '删除任务失败');
  }
};

/**
 * 获取用户统计信息
 */
export const getUserStats = async (
  req: AuthenticatedRequest,
  res: Response<ApiResponse>
): Promise<void> => {
  try {
    const userId = req.user!.id;
    logInfo('获取用户统计信息', { userId });

    const allTasks = await analysisTaskService.getUserTasks(userId);
    const stats = calculateStats(allTasks);

    res.json({
      success: true,
      data: stats,
      message: '获取统计信息成功'
    });
  } catch (error) {
    errorHandler(error, res, '获取用户统计信息失败');
  }
};