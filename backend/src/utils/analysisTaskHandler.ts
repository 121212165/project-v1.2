import { AIService, AnalysisTaskService } from '../services/index.js';
import { logInfo, logError } from './logger.js';
import { TextAnalysisResponse, ImageAnalysisResponse } from '../types/index.js';
import { ResponseHandler } from './responseHandler.js';

/**
 * 分析任务处理器
 * 统一处理文本和图片分析任务的创建、执行和状态管理
 */
export class AnalysisTaskHandler {
  /**
   * 检查成本限制
   */
  async checkCostLimits(userId: string): Promise<void> {
    const costCheck = await AIService.checkCostLimit();
    if (!costCheck) {
      throw new Error('已达到使用限制，请稍后重试');
    }
  }

  /**
   * 处理文本分析任务
   */
  async handleTextAnalysis(
    userId: string,
    text: string,
    sessionId?: string,
    scenario?: string,
    useCache: boolean = true
  ): Promise<{ taskId: string; result: TextAnalysisResponse; sessionId?: string }> {
    logInfo('开始文本分析', {
      userId,
      textLength: text.length,
      sessionId,
      scenario,
      useCache
    });

    // 创建分析任务
    const task = await AnalysisTaskService.createTask({
      userId,
      type: 'text',
      content: text,
      status: 'processing',
      metadata: { sessionId, scenario }
    });

    try {
      let result: TextAnalysisResponse;

      if (sessionId) {
        // 多轮对话分析
        result = await AIService.analyzeConversation(
          sessionId,
          text,
          'text',
          undefined,
          { useCache }
        ) as TextAnalysisResponse;
      } else {
        // 单次分析
        result = await AIService.analyzeText(text, {
          useCache,
          scenario
        });
      }

      // 更新任务状态
      await AnalysisTaskService.updateTaskStatus(task.id, 'completed', result);

      logInfo('文本分析完成', {
        userId,
        taskId: task.id,
        score: result.score,
        sessionId
      });

      return {
        taskId: task.id,
        result,
        sessionId: sessionId || undefined
      };
    } catch (error) {
      // 更新任务状态为失败
      await AnalysisTaskService.updateTaskStatus(task.id, 'failed', {
        error: error instanceof Error ? error.message : '分析失败'
      });
      throw error;
    }
  }

  /**
   * 处理图片分析任务
   */
  async handleImageAnalysis(
    userId: string,
    text: string | undefined,
    imageFile: Express.Multer.File,
    savedFilePath: string | undefined,
    sessionId?: string,
    scenario?: string,
    useCache: boolean = true
  ): Promise<{ taskId: string; result: ImageAnalysisResponse; sessionId?: string }> {
    logInfo('开始图文分析', {
      userId,
      hasText: !!text,
      imageInfo: { size: imageFile.size, type: imageFile.mimetype },
      sessionId,
      scenario,
      useCache
    });

    // 创建分析任务
    const task = await AnalysisTaskService.createTask({
      userId,
      type: 'image',
      content: text || '图片分析',
      status: 'processing',
      metadata: {
        imagePath: savedFilePath,
        sessionId,
        scenario,
        imageInfo: {
          size: imageFile.size,
          type: imageFile.mimetype,
          originalName: imageFile.originalname
        }
      }
    });

    try {
      // 将图片转换为base64格式
      const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;

      let result: ImageAnalysisResponse;

      if (sessionId) {
        // 多轮对话分析
        result = await AIService.analyzeConversation(
          sessionId,
          text || '请分析这张图片',
          'image',
          imageBase64,
          { useCache }
        ) as ImageAnalysisResponse;
      } else {
        // 单次分析
        result = await AIService.analyzeImageAndText(imageBase64, text, {
          useCache,
          scenario
        });
      }

      // 更新任务状态
      await AnalysisTaskService.updateTaskStatus(task.id, 'completed', result);

      logInfo('图文分析完成', {
        userId,
        taskId: task.id,
        status: result.status,
        sessionId
      });

      return {
        taskId: task.id,
        result,
        sessionId: sessionId || undefined
      };
    } catch (error) {
      // 更新任务状态为失败
      await AnalysisTaskService.updateTaskStatus(task.id, 'failed', {
        error: error instanceof Error ? error.message : '分析失败'
      });

      // 清理已保存的文件
      if (savedFilePath) {
        const fs = await import('fs/promises');
        await fs.unlink(savedFilePath).catch(err => logError('清理文件失败', err));
      }

      throw error;
    }
  }

  /**
   * 批量处理文本分析
   */
  async handleBatchTextAnalysis(
    userId: string,
    texts: string[],
    options: {
      sessionId?: string;
      scenario?: string;
      useCache?: boolean;
    } = {}
  ): Promise<{ taskId: string; results: TextAnalysisResponse[] }> {
    const { sessionId, scenario, useCache = true } = options;

    // 检查成本限制
    await this.checkCostLimits(userId);

    logInfo('开始批量文本分析', {
      userId,
      textCount: texts.length,
      sessionId,
      scenario
    });

    // 创建批量任务
    const task = await AnalysisTaskService.createTask({
      userId,
      type: 'batch_text',
      content: `批量分析 ${texts.length} 个文本`,
      status: 'processing',
      metadata: { sessionId, scenario, textCount: texts.length }
    });

    try {
      const requests = texts.map(text => ({
        text,
        sessionId,
        scenario
      }));

      const results = await AIService.batchAnalyzeText(requests, {
        useCache,
        retryConfig: { maxAttempts: 2 }
      });

      // 更新任务状态
      await AnalysisTaskService.updateTaskStatus(task.id, 'completed', {
        results,
        summary: {
          total: texts.length,
          successful: results.length,
          averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
        }
      });

      logInfo('批量文本分析完成', {
        userId,
        taskId: task.id,
        textCount: texts.length,
        successCount: results.length
      });

      return {
        taskId: task.id,
        results
      };
    } catch (error) {
      await AnalysisTaskService.updateTaskStatus(task.id, 'failed', {
        error: error instanceof Error ? error.message : '批量分析失败'
      });
      throw error;
    }
  }
}