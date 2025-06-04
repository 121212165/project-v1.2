import { PrismaClient } from '../generated/prisma/index.js';
import { logInfo, logError, logWarn } from '../utils/logger.js';
import { appConfig } from '../config/index.js';

const prisma = new PrismaClient();

export class SmsService {
  private static readonly CODE_EXPIRY_MINUTES = 5; // 验证码有效期5分钟
  private static readonly CODE_LENGTH = 6; // 验证码长度
  
  /**
   * 生成随机验证码
   */
  private static generateCode(): string {
    return Math.random().toString().slice(2, 2 + this.CODE_LENGTH);
  }

  /**
   * 发送短信验证码
   */
  static async sendVerificationCode(
    phone: string, 
    type: 'register' | 'login' | 'reset_password'
  ): Promise<boolean> {
    try {
      // 检查发送频率限制（1分钟内只能发送一次）
      const recentCode = await prisma.systemConfig.findFirst({
        where: {
          key: `sms_code_${phone}`,
          updatedAt: {
            gte: new Date(Date.now() - 60 * 1000) // 1分钟内
          }
        }
      });

      if (recentCode) {
        throw new Error('发送过于频繁，请稍后再试');
      }

      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + this.CODE_EXPIRY_MINUTES * 60 * 1000);

      // 保存验证码到数据库
      await prisma.systemConfig.upsert({
        where: { key: `sms_code_${phone}` },
        update: {
          value: JSON.stringify({
            code,
            type,
            expiresAt: expiresAt.toISOString(),
            attempts: 0
          })
        },
        create: {
          key: `sms_code_${phone}`,
          value: JSON.stringify({
            code,
            type,
            expiresAt: expiresAt.toISOString(),
            attempts: 0
          }),
          type: 'JSON'
        }
      });

      // 在开发环境下，直接打印验证码到日志
      if (appConfig.env === 'development') {
        logInfo('短信验证码（开发环境）', {
          phone: phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2'),
          code,
          type,
          expiresAt: expiresAt.toISOString(),
          validityPeriod: `${this.CODE_EXPIRY_MINUTES}分钟`
        });
        return true;
      }
      // 生产环境下，这里应该调用真实的短信服务API
      // 例如：阿里云短信、腾讯云短信等
      // await this.sendSmsViaTencentCloud(phone, code, type);
      
      logInfo('短信验证码发送成功', {
        phone,
        type,
        expiresAt
      });
      
      return true;
    } catch (error) {
      logError('发送短信验证码失败', error);
      throw error;
    }
  }

  /**
   * 验证短信验证码
   */
  static async verifyCode(
    phone: string, 
    code: string, 
    type: 'register' | 'login' | 'reset_password'
  ): Promise<boolean> {
    try {
      const storedCodeRecord = await prisma.systemConfig.findUnique({
        where: { key: `sms_code_${phone}` }
      });

      if (!storedCodeRecord) {
        throw new Error('验证码不存在或已过期');
      }

      const storedData = JSON.parse(storedCodeRecord.value);
      const now = new Date();
      const expiresAt = new Date(storedData.expiresAt);

      // 检查验证码是否过期
      if (now > expiresAt) {
        await prisma.systemConfig.delete({
          where: { key: `sms_code_${phone}` }
        });
        throw new Error('验证码已过期');
      }

      // 检查验证码类型
      if (storedData.type !== type) {
        throw new Error('验证码类型不匹配');
      }

      // 检查尝试次数（最多3次）
      if (storedData.attempts >= 3) {
        await prisma.systemConfig.delete({
          where: { key: `sms_code_${phone}` }
        });
        throw new Error('验证码尝试次数过多，请重新获取');
      }

      // 验证码错误
      if (storedData.code !== code) {
        // 增加尝试次数
        await prisma.systemConfig.update({
          where: { key: `sms_code_${phone}` },
          data: {
            value: JSON.stringify({
              ...storedData,
              attempts: storedData.attempts + 1
            })
          }
        });
        throw new Error('验证码错误');
      }

      // 验证成功，删除验证码
      await prisma.systemConfig.delete({
        where: { key: `sms_code_${phone}` }
      });

      logInfo('短信验证码验证成功', {
        phone,
        type
      });

      return true;
    } catch (error) {
      logError('验证短信验证码失败', error);
      throw error;
    }
  }

  /**
   * 清理过期的验证码
   */
  static async cleanupExpiredCodes(): Promise<void> {
    try {
      const expiredCodes = await prisma.systemConfig.findMany({
        where: {
          key: {
            startsWith: 'sms_code_'
          }
        }
      });

      const now = new Date();
      const expiredKeys: string[] = [];

      for (const record of expiredCodes) {
        try {
          const data = JSON.parse(record.value);
          const expiresAt = new Date(data.expiresAt);
          if (now > expiresAt) {
            expiredKeys.push(record.key);
          }
        } catch (error) {
          // 数据格式错误，也删除
          expiredKeys.push(record.key);
        }
      }

      if (expiredKeys.length > 0) {
        await prisma.systemConfig.deleteMany({
          where: {
            key: {
              in: expiredKeys
            }
          }
        });

        logInfo('清理过期验证码', {
          count: expiredKeys.length
        });
      }
    } catch (error) {
      logError('清理过期验证码失败', error);
    }
  }
}