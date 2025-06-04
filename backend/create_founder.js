const { PrismaClient } = require('./src/generated/prisma/index.js');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createFounder() {
  try {
    // 创始人信息
    const founderData = {
      username: 'founder',
      email: '15720214985@163.com',
      password: 'founder123456', // 建议使用强密码
      role: 'CREATOR'
    };

    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: founderData.email }
    });

    if (existingUser) {
      console.log('创始人账号已存在:', existingUser.email);
      console.log('用户信息:', {
        id: existingUser.id,
        username: existingUser.username,
        email: existingUser.email,
        role: existingUser.role,
        isActive: existingUser.isActive,
        createdAt: existingUser.createdAt
      });
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(founderData.password, 12);

    // 创建创始人账号
    const founder = await prisma.user.create({
      data: {
        username: founderData.username,
        email: founderData.email,
        password: hashedPassword,
        role: founderData.role,
        isActive: true
      }
    });

    console.log('✅ 创始人账号创建成功!');
    console.log('账号信息:');
    console.log('- 用户名:', founder.username);
    console.log('- 邮箱:', founder.email);
    console.log('- 角色:', founder.role);
    console.log('- 用户ID:', founder.id);
    console.log('- 创建时间:', founder.createdAt);
    console.log('\n登录信息:');
    console.log('- 邮箱:', founderData.email);
    console.log('- 密码:', founderData.password);
    console.log('\n⚠️  请妥善保管登录信息，建议首次登录后立即修改密码!');

  } catch (error) {
    console.error('❌ 创建创始人账号失败:', error.message);
    if (error.code === 'P2002') {
      console.error('错误原因: 邮箱或用户名已被使用');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// 执行创建
createFounder();