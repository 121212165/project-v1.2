import { PrismaClient } from './src/generated/prisma/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 开始测试数据库连接...');

  try {
    // 测试数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 创建管理员用户
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@beauty-ai.com' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@beauty-ai.com',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
    console.log('✅ 管理员用户创建完成:', admin.email);

    // 创建测试用户
    const testPassword = await bcrypt.hash('test123', 10);
    const testUser = await prisma.user.upsert({
      where: { email: 'test@beauty-ai.com' },
      update: {},
      create: {
        username: 'testuser',
        email: 'test@beauty-ai.com',
        password: testPassword,
        role: 'USER',
      },
    });
    console.log('✅ 测试用户创建完成:', testUser.email);

    console.log('🎉 基础数据初始化完成！');
  } catch (error) {
    console.error('❌ 错误:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ 种子数据初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });