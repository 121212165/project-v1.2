import { logInfo, logError, logWarn } from './logger.js';
import { ConversationService } from '../services/conversationService.js';
import crypto from 'crypto';

/**
 * 会话管理器
 * 提供统一的会话创建和管理功能
 */
export class SessionManager {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30分钟
  private static activeSessions = new Map<string, {
    userId: string;
    createdAt: Date;
    lastActivity: Date;
    metadata?: any;
  }>();

  /**
   * 创建新会话
   */
  static async createSession(userId: string, metadata?: any): Promise<string> {
    try {
      const sessionId = this.generateSessionId();
      const now = new Date();
      
      // 在内存中记录会话
      this.activeSessions.set(sessionId, {
        userId,
        createdAt: now,
        lastActivity: now,
        metadata
      });

      // 在数据库中创建会话记录
      await ConversationService.createSession(sessionId, userId, metadata);
      
      logInfo('会话创建成功', { sessionId, userId, metadata });
      return sessionId;
    } catch (error) {
      logError('会话创建失败', { error, userId, metadata });
      throw new Error('会话创建失败');
    }
  }

  /**
   * 获取或创建会话
   */
  static async getOrCreateSession(sessionId: string | undefined, userId: string, metadata?: any): Promise<string> {
    if (sessionId && await this.isValidSession(sessionId, userId)) {
      await this.updateSessionActivity(sessionId);
      return sessionId;
    }
    
    return await this.createSession(userId, metadata);
  }

  /**
   * 验证会话是否有效
   */
  static async isValidSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(sessionId);
      
      if (!session) {
        // 从数据库检查
        const dbSession = await ConversationService.getSession(sessionId);
        if (!dbSession || dbSession.userId !== userId) {
          return false;
        }
        
        // 重新加载到内存
        this.activeSessions.set(sessionId, {
          userId: dbSession.userId,
          createdAt: new Date(dbSession.createdAt),
          lastActivity: new Date(dbSession.updatedAt || dbSession.createdAt),
          metadata: dbSession.metadata
        });
        
        return true;
      }
      
      // 检查会话是否属于当前用户
      if (session.userId !== userId) {
        logWarn('会话用户不匹配', { sessionId, expectedUserId: userId, actualUserId: session.userId });
        return false;
      }
      
      // 检查会话是否过期
      const now = Date.now();
      const lastActivity = session.lastActivity.getTime();
      if (now - lastActivity > this.SESSION_TIMEOUT) {
        logWarn('会话已过期', { sessionId, lastActivity: session.lastActivity });
        await this.removeSession(sessionId);
        return false;
      }
      
      return true;
    } catch (error) {
      logError('会话验证失败', { error, sessionId, userId });
      return false;
    }
  }

  /**
   * 更新会话活动时间
   */
  static async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();
        this.activeSessions.set(sessionId, session);
      }
      
      // 更新数据库记录
      await ConversationService.updateSessionActivity(sessionId);
    } catch (error) {
      logWarn('更新会话活动时间失败', { error, sessionId });
    }
  }

  /**
   * 移除会话
   */
  static async removeSession(sessionId: string): Promise<void> {
    try {
      this.activeSessions.delete(sessionId);
      await ConversationService.endSession(sessionId);
      logInfo('会话已移除', { sessionId });
    } catch (error) {
      logWarn('移除会话失败', { error, sessionId });
    }
  }

  /**
   * 获取用户的所有活跃会话
   */
  static getUserActiveSessions(userId: string): string[] {
    const sessions: string[] = [];
    
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.userId === userId) {
        const now = Date.now();
        const lastActivity = session.lastActivity.getTime();
        
        if (now - lastActivity <= this.SESSION_TIMEOUT) {
          sessions.push(sessionId);
        } else {
          // 清理过期会话
          this.removeSession(sessionId);
        }
      }
    }
    
    return sessions;
  }

  /**
   * 清理过期会话
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = Date.now();
      const expiredSessions: string[] = [];
      
      for (const [sessionId, session] of this.activeSessions.entries()) {
        const lastActivity = session.lastActivity.getTime();
        if (now - lastActivity > this.SESSION_TIMEOUT) {
          expiredSessions.push(sessionId);
        }
      }
      
      for (const sessionId of expiredSessions) {
        await this.removeSession(sessionId);
      }
      
      if (expiredSessions.length > 0) {
        logInfo('清理过期会话完成', { count: expiredSessions.length });
      }
    } catch (error) {
      logError('清理过期会话失败', { error });
    }
  }

  /**
   * 获取会话统计信息
   */
  static getSessionStats(): {
    totalSessions: number;
    activeSessions: number;
    userDistribution: Record<string, number>;
  } {
    const now = Date.now();
    const userDistribution: Record<string, number> = {};
    let activeSessions = 0;
    
    for (const [, session] of this.activeSessions.entries()) {
      const lastActivity = session.lastActivity.getTime();
      
      if (now - lastActivity <= this.SESSION_TIMEOUT) {
        activeSessions++;
        userDistribution[session.userId] = (userDistribution[session.userId] || 0) + 1;
      }
    }
    
    return {
      totalSessions: this.activeSessions.size,
      activeSessions,
      userDistribution
    };
  }

  /**
   * 生成会话ID
   */
  private static generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `session_${timestamp}_${random}`;
  }

  /**
   * 启动定期清理任务
   */
  static startCleanupTask(): void {
    // 每5分钟清理一次过期会话
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
    
    logInfo('会话清理任务已启动');
  }
}