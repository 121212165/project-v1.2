import express from 'express';
import multer from 'multer';
import { AIService } from '../utils/aiService.js';

const router = express.Router();

// 配置multer,限制文件大小为5MB
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: (req, file, cb) => {
        // 只允许图片文件
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('请上传有效的图片文件'));
        }
    }
});

// 统一错误处理函数
const handleError = (error, res, errorPrefix) => {
    console.error(`${errorPrefix}:`, error);
    const statusCode = error.statusCode || 500;
    const message = error.message || '服务器内部错误';
    res.status(statusCode).json({ 
        success: false,
        error: message 
    });
};

// 文本分析API
router.post('/analyze-text', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text?.trim()) {
            return res.status(400).json({ 
                success: false,
                error: '请提供要分析的文本' 
            });
        }

        const result = await AIService.analyzeText(text.trim());
        res.json({ 
            success: true, 
            data: result 
        });
    } catch (error) {
        handleError(error, res, '文本分析错误');
    }
});

// 图文分析API
router.post('/analyze-image-text', upload.single('image'), async (req, res) => {
    try {
        const { text } = req.body;
        const imageFile = req.file;

        if (!imageFile) {
            return res.status(400).json({ 
                success: false,
                error: '请上传图片' 
            });
        }

        // 将图片转换为base64
        const imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
        
        const result = await AIService.analyzeImageAndText(
            imageBase64, 
            text?.trim() || ''
        );
        
        res.json({ 
            success: true, 
            data: result 
        });
    } catch (error) {
        handleError(error, res, '图文分析错误');
    }
});

export default router;