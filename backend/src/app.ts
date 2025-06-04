import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { appConfig } from './config/index.js';
import { logger, logInfo, logError } from './utils/logger.js';
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
  securityMiddleware,
  compressionMiddleware
} from './middleware/index.js';
import analyzeRoutes from './routes/analyze.js';
import { authRouter } from './routes/auth.js';
import historyRouter from './routes/history.js';
import deepseekRouter from './routes/deepseek.js';

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建Express应用
const app = express();

// 信任代理（用于获取真实IP）
app.set('trust proxy', 1);

// 安全中间件
app.use(securityMiddleware);

// 压缩中间件
app.use(compressionMiddleware);

// CORS配置
app.use(cors({
  origin: appConfig.cors.origin,
  credentials: appConfig.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 请求解析中间件
app.use(express.json({ 
  limit: '10mb',
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// 请求日志中间件
app.use(requestLogger);

// 静态文件服务（如果需要）
if (appConfig.server.isDevelopment) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// API路由
app.use('/api/auth', authRouter);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRouter);
app.use('/api/deepseek', deepseekRouter);

// 根路径
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '美妆AI助手后端服务',
    version: '2.0.0',
    environment: appConfig.server.env,
    timestamp: new Date().toISOString()
  });
});

// API信息路由
app.get('/api', (req, res) => {
  res.json({
    message: '美妆AI助手 API',
    version: '1.0.0',
    endpoints: {
      analyze: {
        text: 'POST /api/analyze/text - 文本分析',
        image: 'POST /api/analyze/image-text - 图文分析',
        health: 'GET /api/analyze/health - 健康检查'
      },
      auth: {
        register: 'POST /api/auth/register - 用户注册',
        login: 'POST /api/auth/login - 用户登录',
        profile: 'GET /api/auth/me - 获取用户信息',
        logout: 'POST /api/auth/logout - 用户登出'
      },
      history: {
        list: 'GET /api/history - 获取分析历史记录',
        detail: 'GET /api/history/:taskId - 获取任务详情',
        delete: 'DELETE /api/history/:taskId - 删除任务',
        stats: 'GET /api/history/stats - 获取用户统计信息'
      }
    },
    docs: '/api/docs'
  });
});

// 404处理
app.use(notFoundHandler);

// 错误处理中间件（必须放在最后）
app.use(errorHandler);

// 优雅关闭处理
process.on('SIGTERM', () => {
  logInfo('收到SIGTERM信号，开始优雅关闭...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logInfo('收到SIGINT信号，开始优雅关闭...');
  process.exit(0);
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logError('未捕获的异常', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('未处理的Promise拒绝', { reason, promise });
  process.exit(1);
});

// 启动服务器
const PORT = appConfig.server.port;

app.listen(PORT, () => {
  logInfo(`🚀 服务器启动成功`, {
    port: PORT,
    environment: appConfig.server.env,
    nodeVersion: process.version,
    pid: process.pid
  });
  
  if (appConfig.server.isDevelopment) {
    console.log(`\n🌟 美妆AI助手后端服务已启动`);
    console.log(`📍 服务地址: http://localhost:${PORT}`);
    console.log(`🔍 API文档: http://localhost:${PORT}/api`);
    console.log(`💊 健康检查: http://localhost:${PORT}/api/analyze/health`);
    console.log(`📝 环境: ${appConfig.server.env}\n`);
  }
});

export default app;