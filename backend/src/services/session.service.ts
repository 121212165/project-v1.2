import { PrismaClient } from '../generated/prisma/index.js';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logInfo, logError } from '../utils/logger.js';

const prisma = new PrismaClient();

export class SessionService {
  static async createSession(userId: number, deviceInfo?: string, ipAddress?: string): Promise<{ token: string; sessionId: string }> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, username: true } });
      if (!user) throw new Error('用户不存在');

      const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, username: user.username }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN });

      const expiresAt = new Date();
      const match = config.JWT_EXPIRES_IN.match(/(\d+)([smhd])/);
      const val = match ? parseInt(match[1]) : 7;
      const unit = match ? match[2] : 'd';
      const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
      expiresAt.setTime(expiresAt.getTime() + val * (multipliers[unit] || 86400000));

      const session = await prisma.userSession.create({ data: { userId, token, deviceInfo, ipAddress, expiresAt } });
      await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date(), loginCount: { increment: 1 } } });

      logInfo('会话创建成功', { userId, sessionId: session.id });
      return { token, sessionId: session.id };
    } catch (error) {
      logError('创建会话失败', error);
      throw error;
    }
  }

  static async validateSession(token: string): Promise<{ isValid: boolean; userId?: number; sessionId?: string }> {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as any;
      const session = await prisma.userSession.findUnique({ where: { token }, include: { user: { select: { id: true, isActive: true } } } });
      if (!session || !session.isActive || new Date() > session.expiresAt || !session.user.isActive) return { isValid: false };
      return { isValid: true, userId: session.userId, sessionId: session.id };
    } catch { return { isValid: false }; }
  }

  static async invalidateSession(sessionId: string): Promise<void> {
    await prisma.userSession.update({ where: { id: sessionId }, data: { isActive: false } });
  }

  static async invalidateAllUserSessions(userId: number): Promise<void> {
    await prisma.userSession.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
  }

  static async getUserActiveSessions(userId: number) {
    return prisma.userSession.findMany({
      where: { userId, isActive: true, expiresAt: { gt: new Date() } },
      select: { id: true, deviceInfo: true, ipAddress: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async cleanupExpiredSessions(): Promise<void> {
    await prisma.userSession.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  }
}
