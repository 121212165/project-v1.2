import { logWarn } from './logger.js';

/**
 * 输入验证器
 * 提供统一的输入数据验证功能
 */
export class InputValidator {
  /**
   * 验证文本内容
   */
  static validateText(text: any): boolean {
    if (!text || typeof text !== 'string') {
      logWarn('文本验证失败：无效的文本类型', { text: typeof text });
      return false;
    }

    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      logWarn('文本验证失败：文本为空');
      return false;
    }

    if (trimmedText.length > 10000) {
      logWarn('文本验证失败：文本过长', { length: trimmedText.length });
      return false;
    }

    return true;
  }

  /**
   * 验证图片文件
   */
  static validateImage(file: any): boolean {
    if (!file) {
      logWarn('图片验证失败：文件为空');
      return false;
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      logWarn('图片验证失败：不支持的文件类型', { mimetype: file.mimetype });
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      logWarn('图片验证失败：文件过大', { size: file.size, maxSize });
      return false;
    }

    return true;
  }

  /**
   * 验证会话ID
   */
  static validateSessionId(sessionId: any): boolean {
    if (!sessionId) {
      return true; // 会话ID是可选的
    }

    if (typeof sessionId !== 'string') {
      logWarn('会话ID验证失败：无效的类型', { sessionId: typeof sessionId });
      return false;
    }

    if (sessionId.length > 100) {
      logWarn('会话ID验证失败：ID过长', { length: sessionId.length });
      return false;
    }

    return true;
  }

  /**
   * 验证用户ID
   */
  static validateUserId(userId: any): boolean {
    if (!userId || typeof userId !== 'string') {
      logWarn('用户ID验证失败：无效的用户ID', { userId: typeof userId });
      return false;
    }

    return true;
  }

  /**
   * 验证场景参数
   */
  static validateScenario(scenario: any): boolean {
    if (!scenario) {
      return true; // 场景是可选的
    }

    if (typeof scenario !== 'string') {
      logWarn('场景验证失败：无效的类型', { scenario: typeof scenario });
      return false;
    }

    const allowedScenarios = ['general', 'product', 'marketing', 'compliance'];
    if (!allowedScenarios.includes(scenario)) {
      logWarn('场景验证失败：不支持的场景', { scenario, allowedScenarios });
      return false;
    }

    return true;
  }

  /**
   * 验证分页参数
   */
  static validatePagination(page: any, limit: any): { page: number; limit: number } {
    let validPage = 1;
    let validLimit = 20;

    if (page && typeof page === 'string') {
      const parsedPage = parseInt(page, 10);
      if (!isNaN(parsedPage) && parsedPage > 0) {
        validPage = parsedPage;
      }
    } else if (typeof page === 'number' && page > 0) {
      validPage = page;
    }

    if (limit && typeof limit === 'string') {
      const parsedLimit = parseInt(limit, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 100) {
        validLimit = parsedLimit;
      }
    } else if (typeof limit === 'number' && limit > 0 && limit <= 100) {
      validLimit = limit;
    }

    return { page: validPage, limit: validLimit };
  }

  /**
   * 验证邮箱格式
   */
  static validateEmail(email: any): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证密码强度
   */
  static validatePassword(password: any): boolean {
    if (!password || typeof password !== 'string') {
      return false;
    }

    // 至少8位，包含字母和数字
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
  }
}