import { Response } from 'express';
import { AnalysisTaskService } from '../services/database.service.js';
import { ApiResponse, AuthenticatedRequest } from '../types/index.js';
import { logInfo, logError } from '../utils/logger.js';

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

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    logInfo('获取用户分析历史', {
      userId,
      page,
      limit,
      type,
      status
    });

    const tasks = await analysisTaskService.getUserTasks(userId, {
      skip,
      take,
      type: type as string,
      status: status as string
    });

    // 格式化返回数据
    const formattedTasks = tasks.map(task => ({
      id: task.id,
      type: task.type,
      status: task.status,
      content: task.content?.substring(0, 100) + (task.content && task.content.length > 100 ? '...' : ''),
      filePath: task.filePath,
      result: task.result,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    }));

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
    logError('获取用户历史记录失败', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取历史记录失败'
    });
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
    const taskId = Number(req.params.taskId);

    if (isNaN(taskId)) {
      res.status(400).json({
        success: false,
        error: '无效的任务ID'
      });
      return;
    }

    logInfo('获取任务详情', { userId, taskId });

    const task = await analysisTaskService.getTaskById(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        error: '任务不存在'
      });
      return;
    }

    // 检查任务是否属于当前用户
    if (task.userId !== userId) {
      res.status(403).json({
        success: false,
        error: '无权访问此任务'
      });
      return;
    }

    res.json({
      success: true,
      data: task,
      message: '获取任务详情成功'
    });

  } catch (error) {
    logError('获取任务详情失败', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取任务详情失败'
    });
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
    const taskId = Number(req.params.taskId);

    if (isNaN(taskId)) {
      res.status(400).json({
        success: false,
        error: '无效的任务ID'
      });
      return;
    }

    logInfo('删除任务', { userId, taskId });

    const task = await analysisTaskService.getTaskById(taskId);

    if (!task) {
      res.status(404).json({
        success: false,
        error: '任务不存在'
      });
      return;
    }

    // 检查任务是否属于当前用户
    if (task.userId !== userId) {
      res.status(403).json({
        success: false,
        error: '无权删除此任务'
      });
      return;
    }

    // 删除关联的文件
    if (task.filePath) {
      try {
        const fs = await import('fs/promises');
        await fs.unlink(task.filePath);
      } catch (fileError) {
        logError('删除关联文件失败', fileError);
        // 继续删除数据库记录，即使文件删除失败
      }
    }

    await analysisTaskService.deleteTask(taskId);

    res.json({
      success: true,
      message: '删除任务成功'
    });

  } catch (error) {
    logError('删除任务失败', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除任务失败'
    });
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

    // 获取所有任务
    const allTasks = await analysisTaskService.getUserTasks(userId);

    // 统计信息
    const stats = {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(task => task.status === 'COMPLETED').length,
      failedTasks: allTasks.filter(task => task.status === 'FAILED').length,
      pendingTasks: allTasks.filter(task => task.status === 'PENDING').length,
      textTasks: allTasks.filter(task => task.type === 'TEXT').length,
      imageTasks: allTasks.filter(task => task.type === 'IMAGE').length,
      recentTasks: allTasks
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(task => ({
          id: task.id,
          type: task.type,
          status: task.status,
          createdAt: task.createdAt
        }))
    };

    res.json({
      success: true,
      data: stats,
      message: '获取统计信息成功'
    });

  } catch (error) {
    logError('获取用户统计信息失败', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取统计信息失败'
    });
  }
};