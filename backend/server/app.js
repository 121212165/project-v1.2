import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import analyzeRoutes from './routes/analyze.js';

// 获取文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 加载环境变量
dotenv.config();

// 创建Express应用实例
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*', // 配置CORS源
    methods: ['GET', 'POST'], // 允许的HTTP方法
    credentials: true // 允许携带凭证
}));
app.use(express.json({ 
    limit: '10mb',
    strict: true // 严格模式解析JSON
}));
app.use(express.static(path.join(__dirname, '../public'), {
    maxAge: '1d' // 静态资源缓存1天
}));

// API路由
app.use('/api', analyzeRoutes);

// 主页路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err.stack);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 启动服务器
const server = app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 优雅关闭服务器
process.on('SIGTERM', () => {
    console.log('收到 SIGTERM 信号，准备关闭服务器');
    server.close(() => {
        console.log('服务器已安全关闭');
        process.exit(0);
    });
});