import winston from 'winston';
import { appConfig } from '../config/index.js';

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 开发环境格式
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
  })
);

// 创建 logger 实例
export const logger = winston.createLogger({
  level: appConfig.logging.level,
  format: appConfig.server.isDevelopment ? devFormat : logFormat,
  defaultMeta: { service: 'beauty-ai-backend' },
  transports: [
    // 控制台输出
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    }),
    
    // 错误日志文件
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      handleExceptions: true,
      handleRejections: true,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // 所有日志文件
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  exitOnError: false
});

// 生产环境不输出到控制台
if (appConfig.server.isProduction) {
  logger.remove(logger.transports[0]);
}

// 导出便捷方法
export const logInfo = (message: string, meta?: any): void => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error | any): void => {
  logger.error(message, { error: error?.stack || error });
};

export const logWarn = (message: string, meta?: any): void => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any): void => {
  logger.debug(message, meta);
};