import { Router } from 'express';
import { getUserHistory, getTaskDetail, deleteTask, getUserStats } from '../controllers/historyController.js';
import { authenticateToken } from '../middleware/auth.js';
import { rateLimiter } from '../middleware/index.js';

const router = Router();

// 所有历史记录相关的路由都需要认证
router.use(authenticateToken);

// 应用速率限制
router.use(rateLimiter);

/**
 * @route GET /api/history
 * @desc 获取用户分析历史记录
 * @access Private
 * @query page - 页码 (默认: 1)
 * @query limit - 每页数量 (默认: 20)
 * @query type - 任务类型过滤 (TEXT/IMAGE)
 * @query status - 状态过滤 (PENDING/COMPLETED/FAILED)
 */
router.get('/', getUserHistory);

/**
 * @route GET /api/history/stats
 * @desc 获取用户统计信息
 * @access Private
 */
router.get('/stats', getUserStats);

/**
 * @route GET /api/history/:taskId
 * @desc 获取单个分析任务详情
 * @access Private
 */
router.get('/:taskId', getTaskDetail);

/**
 * @route DELETE /api/history/:taskId
 * @desc 删除分析任务
 * @access Private
 */
router.delete('/:taskId', deleteTask);

export default router;