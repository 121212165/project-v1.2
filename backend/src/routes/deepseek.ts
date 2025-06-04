import express from 'express';
import Joi from 'joi';
import { validateRequest } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { logInfo, logError } from '../utils/logger.js';
import axios, { AxiosError } from 'axios';

const router = express.Router();

// DeepSeek API 配置
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// 验证聊天请求的 schema
const chatSchema = Joi.object({
  message: Joi.string().required().min(1).max(4000),
  model: Joi.string().default('deepseek-r1'),
  temperature: Joi.number().min(0).max(2).default(0.7),
  max_tokens: Joi.number().min(1).max(4000).default(1000)
});

// DeepSeek 聊天接口
router.post('/chat', 
  authenticateToken,
  validateRequest(chatSchema),
  async (req, res) => {
    try {
      const { message, model, temperature, max_tokens } = req.body;
      const userId = req.user?.id;

      logInfo(`DeepSeek chat request from user ${userId}: ${message.substring(0, 100)}...`);

      // 检查 API Key
      if (!DEEPSEEK_API_KEY) {
        logError('DeepSeek API key not configured');
        return res.status(500).json({
          success: false,
          error: 'DeepSeek API 未配置',
          code: 'API_NOT_CONFIGURED'
        });
      }

      // 构建请求数据
      const requestData = {
        model: model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        temperature: temperature,
        max_tokens: max_tokens,
        stream: false
      };

      // 调用 DeepSeek API
      const response = await axios.post(DEEPSEEK_API_URL, requestData, {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      });

      const aiResponse = response.data.choices[0]?.message?.content || '抱歉，我无法生成回复。';
      
      logInfo(`DeepSeek response for user ${userId}: ${aiResponse.substring(0, 100)}...`);

      res.json({
        success: true,
        response: aiResponse,
        model: model,
        usage: response.data.usage || null
      });

    } catch (error: any) {
      logError('DeepSeek API error:', error);
      
      // 处理不同类型的错误
      if (error.response) {
        // API 返回错误
        const status = error.response.status;
        const errorData = error.response.data;
        
        if (status === 401) {
          return res.status(401).json({
            success: false,
            error: 'DeepSeek API 密钥无效',
            code: 'INVALID_API_KEY'
          });
        } else if (status === 429) {
          return res.status(429).json({
            success: false,
            error: 'API 调用频率限制，请稍后再试',
            code: 'RATE_LIMIT_EXCEEDED'
          });
        } else if (status === 400) {
          return res.status(400).json({
            success: false,
            error: '请求参数错误',
            code: 'BAD_REQUEST',
            details: errorData.error?.message || '未知错误'
          });
        }
      } else if (error.code === 'ECONNABORTED') {
        // 超时错误
        return res.status(408).json({
          success: false,
          error: 'API 请求超时，请稍后再试',
          code: 'REQUEST_TIMEOUT'
        });
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        // 网络连接错误
        return res.status(503).json({
          success: false,
          error: 'DeepSeek 服务暂时不可用',
          code: 'SERVICE_UNAVAILABLE'
        });
      }

      // 通用错误
      res.status(500).json({
        success: false,
        error: 'DeepSeek API 调用失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// 获取可用模型列表
router.get('/models',
  authenticateToken,
  async (req, res) => {
    try {
      logInfo(`DeepSeek models request from user ${req.user?.id}`);

      // DeepSeek 可用模型列表（硬编码，因为 DeepSeek 可能没有专门的模型列表 API）
      const models = [
        {
          id: 'deepseek-r1',
          name: 'DeepSeek R1',
          description: 'DeepSeek 最新的推理模型，具备强大的逻辑推理能力',
          max_tokens: 4000,
          pricing: {
            input: 0.0014,
            output: 0.0028
          }
        },
        {
          id: 'deepseek-chat',
          name: 'DeepSeek Chat',
          description: 'DeepSeek 对话模型，适合日常对话和问答',
          max_tokens: 4000,
          pricing: {
            input: 0.0014,
            output: 0.0028
          }
        },
        {
          id: 'deepseek-coder',
          name: 'DeepSeek Coder',
          description: 'DeepSeek 代码模型，专门优化用于编程任务',
          max_tokens: 4000,
          pricing: {
            input: 0.0014,
            output: 0.0028
          }
        }
      ];

      res.json({
        success: true,
        models: models
      });

    } catch (error: any) {
      logError('DeepSeek models API error:', error);
      res.status(500).json({
        success: false,
        error: '获取模型列表失败',
        code: 'INTERNAL_ERROR'
      });
    }
  }
);

// 健康检查
router.get('/health',
  async (req, res) => {
    try {
      const isConfigured = !!DEEPSEEK_API_KEY;
      
      res.json({
        success: true,
        service: 'DeepSeek API',
        status: isConfigured ? 'configured' : 'not_configured',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logError('DeepSeek health check error:', error);
      res.status(500).json({
        success: false,
        error: '健康检查失败',
        code: 'HEALTH_CHECK_FAILED'
      });
    }
  }
);

export default router;