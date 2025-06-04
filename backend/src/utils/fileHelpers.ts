import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logInfo, logError } from './logger.js';

// ES模块中获取__dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 上传文件存储目录
const UPLOAD_DIR = path.join(__dirname, '../../uploads');

/**
 * 确保上传目录存在
 */
export const ensureUploadDirExists = (): void => {
  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      logInfo('创建上传目录', { path: UPLOAD_DIR });
    }
  } catch (error) {
    logError('创建上传目录失败', { error });
    throw new Error('无法创建上传目录');
  }
};

/**
 * 生成唯一文件名
 */
export const generateUniqueFilename = (originalFilename: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 10);
  const ext = path.extname(originalFilename);
  const basename = path.basename(originalFilename, ext);
  
  return `${basename}-${timestamp}-${randomString}${ext}`;
};

/**
 * 保存上传的文件
 */
export const saveUploadedFile = (file: Express.Multer.File): string => {
  try {
    ensureUploadDirExists();
    
    const uniqueFilename = generateUniqueFilename(file.originalname);
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);
    
    // 将文件从临时位置移动到目标位置
    fs.writeFileSync(filePath, fs.readFileSync(file.path));
    
    // 删除临时文件
    fs.unlinkSync(file.path);
    
    logInfo('文件上传成功', { originalName: file.originalname, savedAs: uniqueFilename });
    return uniqueFilename;
  } catch (error) {
    logError('保存上传文件失败', { error });
    throw new Error('文件保存失败');
  }
};

/**
 * 删除文件
 */
export const handleFileDelete = async (filename: string): Promise<boolean> => {
  try {
    if (!filename) {
      return false;
    }
    
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logInfo('文件删除成功', { filename });
      return true;
    } else {
      logInfo('文件不存在，无需删除', { filename });
      return false;
    }
  } catch (error) {
    logError('文件删除失败', { filename, error });
    return false;
  }
};

/**
 * 获取文件信息
 */
export const getFileInfo = (filename: string): Record<string, any> | null => {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }
    
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    return {
      filename,
      path: filePath,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      extension: ext,
      type: getFileType(ext)
    };
  } catch (error) {
    logError('获取文件信息失败', { filename, error });
    return null;
  }
};

/**
 * 根据扩展名获取文件类型
 */
export const getFileType = (extension: string): string => {
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
  const documentExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf'];
  
  if (imageExts.includes(extension)) {
    return 'image';
  } else if (documentExts.includes(extension)) {
    return 'document';
  } else {
    return 'unknown';
  }
};

/**
 * 检查文件是否为图片
 */
export const isImageFile = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
};

/**
 * 清理过期文件
 */
export const cleanupExpiredFiles = (maxAgeHours: number = 24): void => {
  try {
    ensureUploadDirExists();
    
    const files = fs.readdirSync(UPLOAD_DIR);
    const now = Date.now();
    const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    files.forEach(file => {
      const filePath = path.join(UPLOAD_DIR, file);
      const stats = fs.statSync(filePath);
      const fileAge = now - stats.mtimeMs;
      
      if (fileAge > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });
    
    logInfo('清理过期文件完成', { deletedCount, totalFiles: files.length });
  } catch (error) {
    logError('清理过期文件失败', { error });
  }
};