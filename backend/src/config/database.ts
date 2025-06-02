import { PrismaClient } from '../generated/prisma/index.js';
import { logger } from '../utils/logger.js';
import { pool, testConnection, closePool } from './db-pool';

/**
 * Prisma 客户端实例
 */
export const prisma = new PrismaClient({
  log: ['query', 'error', 'info', 'warn'].map(level => ({
    emit: 'event',
    level
  }))
});

export { pool };

// 统一处理数据库事件监听
const dbEvents = {
  query: (e: any) => logger.debug(`Query: ${e.query}\nParams: ${e.params}\nDuration: ${e.duration}ms`),
  error: (e: any) => logger.error('Database error:', e),
  info: (e: any) => logger.info('Database info:', e.message),
  warn: (e: any) => logger.warn('Database warning:', e.message)
};

Object.entries(dbEvents).forEach(([event, handler]) => {
  prisma.$on(event as any, handler);
});

/**
 * 数据库初始化函数
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    if (!(await testConnection())) {
      throw new Error('Failed to connect to database pool');
    }
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
};

export const connectDatabase = initializeDatabase;

/**
 * 数据库断开连接函数
 */
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await Promise.all([prisma.$disconnect(), closePool()]);
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Failed to disconnect from database:', error);
    throw error;
  }
};

/**
 * 数据库健康检查
 */
export const healthCheck = async (): Promise<{
  prisma: boolean;
  pool: boolean;
  timestamp: string;
}> => {
  const timestamp = new Date().toISOString();
  try {
    const [prismaHealthy, poolHealthy] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
      testConnection()
    ]);
    return { prisma: prismaHealthy, pool: poolHealthy, timestamp };
  } catch {
    return { prisma: false, pool: false, timestamp };
  }
};

// 优雅关闭处理
['beforeExit', 'SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    await disconnectDatabase();
    if (signal !== 'beforeExit') process.exit(0);
  });
});

export default prisma;