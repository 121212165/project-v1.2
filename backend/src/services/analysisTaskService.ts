// 重新导出 AnalysisTaskService 以保持向后兼容性
export { AnalysisTaskService, analysisTaskService } from './database.service.js';

// 导出相关类型
export type { AnalysisTask } from '@prisma/client';