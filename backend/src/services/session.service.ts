import { PrismaClient } from '../generated/prisma/index.js';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config/index.js';
import { logInfo, logError } from '../utils/logger.js';
import { SessionInfo } from '../types/index.js';

const prisma = new PrismaClient();

export class SessionService {
  /**
   * 创建用户会话
   */
  static async createSession(
    userId: number,
    deviceInfo?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ token: string; sessionId: string }> {
    try {
      // 生成JWT token
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true, username: true }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email, 
          role: user.role,
          username: user.username
        },
        appConfig.jwt.secret,
        { expiresIn: appConfig.jwt.expiresIn }
      );

      // 计算过期时间
      const expiresAt = new Date();
      const expiresInMs = this.parseExpiresIn(appConfig.jwt.expiresIn);
      expiresAt.setTime(expiresAt.getTime() + expiresInMs);

      // 创建会话记录
      const session = await prisma.userSession.create({
        data: {
          userId,
          token,
          deviceInfo,
          ipAddress,
          userAgent,
          expiresAt
        }
      });

      // 更新用户登录信息
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          loginCount: {
            increment: 1
          }
        }
      });

      logInfo('用户会话创建成功', {
        userId,
        sessionId: session.id,
        ipAddress,
        deviceInfo
      });

      return {
        token,
        sessionId: session.id
      };
    } catch (error) {
      logError('创建用户会话失败', error);
      throw error;
    }
  }

  /**
   * 验证会话token
   */
  static async validateSession(token: string): Promise<{
    isValid: boolean;
    userId?: number;
    sessionId?: string;
  }> {
    try {
      // 验证JWT token
      const decoded = jwt.verify(token, appConfig.jwt.secret) as any;
      
      // 查找会话记录
      const session = await prisma.userSession.findUnique({
        where: { token },
        include: {
          user: {
            select: {
              id: true,
              isActive: true
            }
          }
        }
      });

      if (!session) {
        return { isValid: false };
      }

      // 检查会话是否过期
      if (new Date() > session.expiresAt) {
        await this.invalidateSession(session.id);
        return { isValid: false };
      }

      // 检查会话是否激活
      if (!session.isActive) {
        return { isValid: false };
      }

      // 检查用户是否激活
      if (!session.user.isActive) {
        await this.invalidateSession(session.id);
        return { isValid: false };
      }

      return {
        isValid: true,
        userId: session.userId,
        sessionId: session.id
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return { isValid: false };
      }
      logError('验证会话失败', error);
      return { isValid: false };
    }
  }

  /**
   * 使会话失效
   */
  static async invalidateSession(sessionId: string): Promise<void> {
    try {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });

      logInfo('会话已失效', { sessionId });
    } catch (error) {
      logError('使会话失效失败', error);
    }
  }

  /**
   * 使用户所有会话失效（用于强制登出）
   */
  static async invalidateAllUserSessions(userId: number): Promise<void> {
    try {
      await prisma.userSession.updateMany({
        where: { 
          userId,
          isActive: true
        },
        data: { isActive: false }
      });

      logInfo('用户所有会话已失效', { userId });
    } catch (error) {
      logError('使用户所有会话失效失败', error);
    }
  }

  /**
   * 获取用户活跃会话列表
   */
  static async getUserActiveSessions(userId: number): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          id: true,
          deviceInfo: true,
          ipAddress: true,
          userAgent: true,
          createdAt: true,
          expiresAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return sessions;
    } catch (error) {
      logError('获取用户活跃会话失败', error);
      return [];
    }
  }

  /**
   * 清理过期会话
   */
  static async cleanupExpiredSessions(): Promise<void> {
    try {
      const result = await prisma.userSession.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      logInfo('清理过期会话', { count: result.count });
    } catch (error) {
      logError('清理过期会话失败', error);
    }
  }

  /**
   * 解析JWT过期时间字符串
   */
  private static parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/(\d+)([smhd])/);
    if (!match) {
      return 24 * 60 * 60 * 1000; // 默认24小时
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}