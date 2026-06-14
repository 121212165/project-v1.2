import express from 'express';
import multer from 'multer';
import Joi from 'joi';
import {
  analyzeText, analyzeImageText, healthCheck,
  createSession, getConversationHistory, getUserSessions, getServiceStats, cleanupService
} from '../controllers/analyzeController.js';
import { validateRequest } from '../middleware/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  }
});

const textSchema = Joi.object({
  text: Joi.string().min(1).max(10000).required(),
  sessionId: Joi.string().optional(),
  scenario: Joi.string().optional(),
  useCache: Joi.boolean().optional().default(true),
});

const imageSchema = Joi.object({
  text: Joi.string().max(1000).optional(),
  sessionId: Joi.string().optional(),
  scenario: Joi.string().optional(),
  useCache: Joi.boolean().optional().default(true),
});

router.post('/text', authenticateToken, validateRequest(textSchema), analyzeText);
router.post('/image-text', authenticateToken, upload.single('image'), validateRequest(imageSchema), analyzeImageText);
router.post('/session', authenticateToken, createSession);
router.get('/session/:sessionId/history', authenticateToken, getConversationHistory);
router.get('/sessions', authenticateToken, getUserSessions);
router.get('/stats', authenticateToken, getServiceStats);
router.post('/cleanup', authenticateToken, cleanupService);
router.get('/health', healthCheck);

export default router;
