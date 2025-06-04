import { logInfo, logError, logWarn } from './logger.js';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import crypto from 'crypto';

/**
 * 文件处理器
 * 提供统一的文件操作功能
 */
export class FileHandler {
  private static readonly UPLOAD_DIR = 'uploads';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  /**
   * 将文件转换为Base64格式
   */
  static fileToBase64(file: Express.Multer.File): string {
    try {
      const base64 = file.buffer.toString('base64');
      return `data:${file.mimetype};base64,${base64}`;
    } catch (error) {
      logError('文件转Base64失败', { error, filename: file.originalname });
      throw new Error('文件处理失败');
    }
  }

  /**
   * 验证图片文件
   */
  static validateImageFile(file: Express.Multer.File): boolean {
    if (!file) {
      logWarn('文件验证失败：文件为空');
      return false;
    }

    if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      logWarn('文件验证失败：不支持的文件类型', { 
        mimetype: file.mimetype, 
        allowed: this.ALLOWED_IMAGE_TYPES 
      });
      return false;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      logWarn('文件验证失败：文件过大', { 
        size: file.size, 
        maxSize: this.MAX_FILE_SIZE 
      });
      return false;
    }

    return true;
  }

  /**
   * 生成安全的文件名
   */
  static generateSafeFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}_${random}${ext}`;
  }

  /**
   * 保存文件到磁盘
   */
  static async saveFile(file: Express.Multer.File, subDir?: string): Promise<string> {
    try {
      const uploadDir = subDir ? path.join(this.UPLOAD_DIR, subDir) : this.UPLOAD_DIR;
      
      // 确保目录存在
      await fs.mkdir(uploadDir, { recursive: true });
      
      const filename = this.generateSafeFilename(file.originalname);
      const filepath = path.join(uploadDir, filename);
      
      await fs.writeFile(filepath, file.buffer);
      
      logInfo('文件保存成功', { 
        originalName: file.originalname, 
        savedPath: filepath,
        size: file.size 
      });
      
      return filepath;
    } catch (error) {
      logError('文件保存失败', { error, filename: file.originalname });
      throw new Error('文件保存失败');
    }
  }

  /**
   * 删除文件
   */
  static async deleteFile(filepath: string): Promise<void> {
    try {
      await fs.unlink(filepath);
      logInfo('文件删除成功', { filepath });
    } catch (error) {
      logWarn('文件删除失败', { error, filepath });
      // 不抛出错误，因为文件可能已经不存在
    }
  }

  /**
   * 检查文件是否存在
   */
  static async fileExists(filepath: string): Promise<boolean> {
    try {
      await fs.access(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取文件信息
   */
  static async getFileInfo(filepath: string): Promise<{
    size: number;
    created: Date;
    modified: Date;
    isFile: boolean;
  } | null> {
    try {
      const stats = await fs.stat(filepath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        isFile: stats.isFile()
      };
    } catch (error) {
      logWarn('获取文件信息失败', { error, filepath });
      return null;
    }
  }

  /**
   * 清理过期文件
   */
  static async cleanupOldFiles(directory: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const files = await fs.readdir(directory);
      const now = Date.now();
      
      for (const file of files) {
        const filepath = path.join(directory, file);
        const stats = await fs.stat(filepath);
        
        if (stats.isFile() && (now - stats.mtime.getTime()) > maxAge) {
          await this.deleteFile(filepath);
        }
      }
      
      logInfo('文件清理完成', { directory, maxAge, fileCount: files.length });
    } catch (error) {
      logError('文件清理失败', { error, directory });
    }
  }

  /**
   * 计算文件哈希值
   */
  static async calculateFileHash(filepath: string): Promise<string> {
    try {
      const hash = crypto.createHash('sha256');
      const stream = createReadStream(filepath);
      
      return new Promise((resolve, reject) => {
        stream.on('data', (data) => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
      });
    } catch (error) {
      logError('计算文件哈希失败', { error, filepath });
      throw new Error('文件哈希计算失败');
    }
  }

  /**
   * 获取文件MIME类型
   */
  static getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}