import { PrismaClient, User, AnalysisTask, ForbiddenWord, SystemConfig, ApiLog } from '../generated/prisma/index.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * 基础数据库服务类
 * 提供通用的CRUD操作
 */
export class DatabaseService {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  /**
   * 执行事务
   */
  async transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(fn);
  }

  /**
   * 执行原生SQL查询
   */
  async executeRaw(sql: string, ...values: any[]): Promise<any> {
    return await this.prisma.$executeRaw`${sql}`;
  }

  /**
   * 查询原生SQL
   */
  async queryRaw(sql: string, ...values: any[]): Promise<any> {
    return await this.prisma.$queryRaw`${sql}`;
  }

  /**
   * 数据库健康检查
   */
  static async healthCheck(): Promise<void> {
    try {
      // 执行简单的数据库查询来检查连接
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      logger.error('Database health check failed:', error);
      throw new Error('数据库连接失败');
    }
  }
}

/**
 * 用户数据服务
 */
export class UserService extends DatabaseService {
  /**
   * 创建用户
   */
  async createUser(data: {
    username: string;
    email: string;
    passwordHash: string;
  }): Promise<User> {
    try {
      return await this.prisma.user.create({
        data,
      });
    } catch (error) {
      logger.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取用户
   */
  async getUserById(id: number): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to get user by id:', error);
      throw error;
    }
  }

  /**
   * 根据用户名获取用户
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { username },
      });
    } catch (error) {
      logger.error('Failed to get user by username:', error);
      throw error;
    }
  }

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      logger.error('Failed to get user by email:', error);
      throw error;
    }
  }

  /**
   * 更新用户
   */
  async updateUser(id: number, data: Partial<User>): Promise<User> {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * 删除用户
   */
  async deleteUser(id: number): Promise<User> {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * 获取用户列表
   */
  async getUsers(options: {
    skip?: number;
    take?: number;
    orderBy?: any;
  } = {}): Promise<User[]> {
    try {
      return await this.prisma.user.findMany({
        skip: options.skip,
        take: options.take,
        orderBy: options.orderBy || { createdAt: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get users:', error);
      throw error;
    }
  }
}

/**
 * 分析任务数据服务
 */
export class AnalysisTaskService extends DatabaseService {
  /**
   * 创建分析任务
   */
  async createTask(data: {
    userId: number;
    type: string;
    content?: string;
    filePath?: string;
  }): Promise<AnalysisTask> {
    try {
      return await this.prisma.analysisTask.create({
        data,
        include: {
          user: true,
        },
      });
    } catch (error) {
      logger.error('Failed to create analysis task:', error);
      throw error;
    }
  }

  /**
   * 获取分析任务
   */
  async getTaskById(id: number): Promise<AnalysisTask | null> {
    try {
      return await this.prisma.analysisTask.findUnique({
        where: { id },
        include: {
          user: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get analysis task:', error);
      throw error;
    }
  }

  /**
   * 更新分析任务
   */
  async updateTask(id: number, data: Partial<AnalysisTask>): Promise<AnalysisTask> {
    try {
      return await this.prisma.analysisTask.update({
        where: { id },
        data,
        include: {
          user: true,
        },
      });
    } catch (error) {
      logger.error('Failed to update analysis task:', error);
      throw error;
    }
  }

  /**
   * 获取用户的分析任务列表
   */
  async getUserTasks(userId: number, options: {
    skip?: number;
    take?: number;
    status?: string;
    type?: string;
  } = {}): Promise<AnalysisTask[]> {
    try {
      const where: any = { userId };
      if (options.status) where.status = options.status;
      if (options.type) where.type = options.type;

      return await this.prisma.analysisTask.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: { createdAt: 'desc' },
        include: {
          user: true,
        },
      });
    } catch (error) {
      logger.error('Failed to get user tasks:', error);
      throw error;
    }
  }

  /**
   * 删除分析任务
   */
  async deleteTask(id: number): Promise<AnalysisTask> {
    try {
      return await this.prisma.analysisTask.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to delete analysis task:', error);
      throw error;
    }
  }
}

/**
 * 违禁词数据服务
 */
export class ForbiddenWordService extends DatabaseService {
  /**
   * 创建违禁词
   */
  async createWord(data: {
    word: string;
    category?: string;
    severity?: number;
  }): Promise<ForbiddenWord> {
    try {
      return await this.prisma.forbiddenWord.create({
        data,
      });
    } catch (error) {
      logger.error('Failed to create forbidden word:', error);
      throw error;
    }
  }

  /**
   * 获取所有活跃的违禁词
   */
  async getActiveWords(): Promise<ForbiddenWord[]> {
    try {
      return await this.prisma.forbiddenWord.findMany({
        where: { isActive: true },
        orderBy: { severity: 'desc' },
      });
    } catch (error) {
      logger.error('Failed to get active forbidden words:', error);
      throw error;
    }
  }

  /**
   * 批量创建违禁词
   */
  async createWords(words: Array<{
    word: string;
    category?: string;
    severity?: number;
  }>): Promise<{ count: number }> {
    try {
      return await this.prisma.forbiddenWord.createMany({
        data: words,
        skipDuplicates: true,
      });
    } catch (error) {
      logger.error('Failed to create forbidden words:', error);
      throw error;
    }
  }

  /**
   * 更新违禁词
   */
  async updateWord(id: number, data: Partial<ForbiddenWord>): Promise<ForbiddenWord> {
    try {
      return await this.prisma.forbiddenWord.update({
        where: { id },
        data,
      });
    } catch (error) {
      logger.error('Failed to update forbidden word:', error);
      throw error;
    }
  }

  /**
   * 删除违禁词
   */
  async deleteWord(id: number): Promise<ForbiddenWord> {
    try {
      return await this.prisma.forbiddenWord.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Failed to delete forbidden word:', error);
      throw error;
    }
  }
}

/**
 * 系统配置数据服务
 */
export class SystemConfigService extends DatabaseService {
  /**
   * 获取配置值
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const config = await this.prisma.systemConfig.findUnique({
        where: { key },
      });
      return config?.value || null;
    } catch (error) {
      logger.error('Failed to get system config:', error);
      throw error;
    }
  }

  /**
   * 设置配置值
   */
  async setConfig(key: string, value: string, type: string = 'string'): Promise<SystemConfig> {
    try {
      return await this.prisma.systemConfig.upsert({
        where: { key },
        update: { value, type },
        create: { key, value, type },
      });
    } catch (error) {
      logger.error('Failed to set system config:', error);
      throw error;
    }
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<SystemConfig[]> {
    try {
      return await this.prisma.systemConfig.findMany({
        orderBy: { key: 'asc' },
      });
    } catch (error) {
      logger.error('Failed to get all system configs:', error);
      throw error;
    }
  }
}

/**
 * API日志数据服务
 */
export class ApiLogService extends DatabaseService {
  /**
   * 记录API调用日志
   */
  async logApiCall(data: {
    userId?: number;
    endpoint: string;
    method: string;
    statusCode: number;
    duration: number;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<ApiLog> {
    try {
      return await this.prisma.apiLog.create({
        data,
      });
    } catch (error) {
      logger.error('Failed to log API call:', error);
      throw error;
    }
  }

  /**
   * 获取API调用统计
   */
  async getApiStats(options: {
    startDate?: Date;
    endDate?: Date;
    userId?: number;
  } = {}): Promise<any> {
    try {
      const where: any = {};
      if (options.startDate || options.endDate) {
        where.createdAt = {};
        if (options.startDate) where.createdAt.gte = options.startDate;
        if (options.endDate) where.createdAt.lte = options.endDate;
      }
      if (options.userId) where.userId = options.userId;

      const [totalCalls, avgDuration, statusCodes] = await Promise.all([
        this.prisma.apiLog.count({ where }),
        this.prisma.apiLog.aggregate({
          where,
          _avg: { duration: true },
        }),
        this.prisma.apiLog.groupBy({
          by: ['statusCode'],
          where,
          _count: { statusCode: true },
        }),
      ]);

      return {
        totalCalls,
        avgDuration: avgDuration._avg.duration,
        statusCodes,
      };
    } catch (error) {
      logger.error('Failed to get API stats:', error);
      throw error;
    }
  }
}

// 导出服务实例
export const userService = new UserService();
export const analysisTaskService = new AnalysisTaskService();
export const forbiddenWordService = new ForbiddenWordService();
export const systemConfigService = new SystemConfigService();
export const apiLogService = new ApiLogService();