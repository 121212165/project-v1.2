import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { connectDatabase } from './config/database.js';
import { errorHandler, notFoundHandler, requestLogger, securityMiddleware, compressionMiddleware } from './middleware/index.js';
import analyzeRoutes from './routes/analyze.js';
import { authRouter } from './routes/auth.js';
import historyRouter from './routes/history.js';
import deepseekRouter from './routes/deepseek.js';
import { logInfo, logError } from './utils/logger.js';

const app = express();

app.set('trust proxy', 1);
app.use(securityMiddleware);
app.use(compressionMiddleware);
app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

app.use('/api/auth', authRouter);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/history', historyRouter);
app.use('/api/deepseek', deepseekRouter);

app.get('/', (req, res) => res.json({ success: true, message: '美妆AI助手', version: '2.0.0' }));
app.use(notFoundHandler);
app.use(errorHandler);

process.on('uncaughtException', (e) => { logError('未捕获异常', e); process.exit(1); });
process.on('unhandledRejection', (r) => { logError('未处理Promise拒绝', r); process.exit(1); });

const PORT = config.PORT;
connectDatabase().then(() => {
  app.listen(PORT, () => {
    logInfo(`服务器启动成功`, { port: PORT, env: config.NODE_ENV });
    if (config.isDev) console.log(`📍 http://localhost:${PORT}`);
  });
}).catch((err) => { logError('数据库连接失败', err); process.exit(1); });

export default app;
