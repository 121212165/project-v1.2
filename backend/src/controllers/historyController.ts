import { Response } from 'express';
import { AnalysisTaskService } from '../services/database.service.js';
import { AuthenticatedRequest } from '../types/index.js';
import { logInfo, logError } from '../utils/logger.js';

const service = new AnalysisTaskService();

export const getUserHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 20, type, status } = req.query;
    const tasks = await service.getUserTasks(userId, {
      skip: (Number(page) - 1) * Number(limit), take: Number(limit),
      type: type as string, status: status as string,
    });
    res.json({ success: true, data: { tasks, pagination: { page: Number(page), limit: Number(limit), total: tasks.length } } });
  } catch (error) {
    logError('获取用户历史记录失败', error);
    res.status(500).json({ success: false, error: '获取历史记录失败' });
  }
};

export const getTaskDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await service.getTaskById(Number(req.params.taskId));
    if (!task || task.userId !== req.user!.id) { res.status(404).json({ success: false, error: '任务不存在' }); return; }
    res.json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取任务详情失败' });
  }
};

export const deleteTask = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const task = await service.getTaskById(Number(req.params.taskId));
    if (!task || task.userId !== req.user!.id) { res.status(404).json({ success: false, error: '任务不存在' }); return; }
    await service.deleteTask(Number(req.params.taskId));
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除任务失败' });
  }
};

export const getUserStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const tasks = await service.getUserTasks(req.user!.id);
    const stats = {
      totalTasks: tasks.length,
      textTasks: tasks.filter(t => t.type === 'TEXT').length,
      imageTasks: tasks.filter(t => t.type === 'IMAGE').length,
      completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取统计信息失败' });
  }
};
