import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger.js';

const poolConfig: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  application_name: 'beauty-ai-backend',
  query_timeout: 30000,
  statement_timeout: 30000,
};

export const pool = new Pool(poolConfig);

// 监听关键连接池事件
['connect', 'acquire', 'remove'].forEach(event => {
  pool.on(event, () => logger.debug(`Database client ${event}ed`));
});

pool.on('error', err => logger.error('Database pool error:', err));

export const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:', error);
    return false;
  }
};

export const getPoolStatus = () => ({
  totalCount: pool.totalCount,
  idleCount: pool.idleCount,
  waitingCount: pool.waitingCount,
});

export const query = async (text: string, params?: any[]): Promise<any> => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    logger.debug('Executed query', { text, duration: Date.now() - start, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Query execution failed', { text, duration: Date.now() - start, error: error.message });
    throw error;
  }
};

export const transaction = async <T>(callback: (client: any) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Transaction failed:', error);
    throw error;
  } finally {
    client.release();
  }
};

export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Failed to close database pool:', error);
    throw error;
  }
};

// 进程退出处理
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, async () => {
    logger.info(`Received ${signal}, closing database pool...`);
    await closePool();
    process.exit(0);
  });
});

export default pool;