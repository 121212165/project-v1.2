import { PrismaClient, UserRole, AnalysisType, AnalysisStatus, ConfigType } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

// 创建 Prisma 实例
const prisma = new PrismaClient();

// 定义初始化数据的接口
interface SeedData {
  adminUser: { email: string; password: string; username: string; };
  testUser: { email: string; password: string; username: string; };
}

// 初始化数据配置
const seedData: SeedData = {
  adminUser: {
    email: 'admin@beauty-ai.com',
    password: 'admin123',
    username: 'admin'
  },
  testUser: {
    email: 'test@beauty-ai.com',
    password: 'test123',
    username: 'testuser'
  }
};

async function createUser(userData: { email: string; password: string; username: string; }, role: UserRole) {
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  return prisma.user.upsert({
    where: { email: userData.email },
    update: {},
    create: {
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: role,
    },
  });
}

async function initializeForbiddenWords() {
  const forbiddenWords = [
    // 夸大功效类
    { word: '神奇', category: '夸大功效', severity: 2 },
    { word: '奇迹', category: '夸大功效', severity: 3 },
    { word: '立即见效', category: '夸大功效', severity: 3 },
    { word: '一夜变白', category: '夸大功效', severity: 3 },
    { word: '瞬间美白', category: '夸大功效', severity: 3 },
    { word: '永久', category: '夸大功效', severity: 2 },
    { word: '终身', category: '夸大功效', severity: 2 },
    { word: '100%有效', category: '夸大功效', severity: 3 },
    
    // 医疗相关词汇
    { word: '治疗', category: '医疗声明', severity: 3 },
    { word: '药用', category: '医疗声明', severity: 3 },
    { word: '医用级', category: '医疗声明', severity: 2 },
    { word: '临床验证', category: '医疗声明', severity: 2 },
    { word: '医生推荐', category: '医疗声明', severity: 2 },
  ];

  return prisma.forbiddenWord.createMany({
    data: forbiddenWords,
    skipDuplicates: true,
  });
}

async function initializeSystemConfigs() {
  const configs = [
    { key: 'ai_analysis_enabled', value: 'true', type: ConfigType.BOOLEAN },
    { key: 'max_file_size', value: '10485760', type: ConfigType.NUMBER }, // 10MB
    { key: 'allowed_file_types', value: JSON.stringify(['jpg', 'jpeg', 'png', 'gif', 'txt', 'doc', 'docx']), type: ConfigType.JSON },
    { key: 'analysis_timeout', value: '30000', type: ConfigType.NUMBER }, // 30秒
    { key: 'rate_limit_requests', value: '100', type: ConfigType.NUMBER },
    { key: 'rate_limit_window', value: '900000', type: ConfigType.NUMBER }, // 15分钟
    { key: 'email_notifications', value: 'false', type: ConfigType.BOOLEAN },
    { key: 'maintenance_mode', value: 'false', type: ConfigType.BOOLEAN },
  ];

  return Promise.all(configs.map(config => 
    prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, type: config.type },
      create: config,
    })
  ));
}

async function createSampleTasks(userId: string) {
  const sampleTasks = [
    {
      userId,
      type: AnalysisType.TEXT,
      status: AnalysisStatus.COMPLETED,
      result: JSON.stringify({
        content: '这款面霜真的很好用，推荐给大家！',
        status: 'compliant',
        score: 95,
        issues: [],
        sentiment: { polarity: 0.8, subjectivity: 0.6 },
      }),
    },
    {
      userId,
      type: AnalysisType.TEXT,
      status: AnalysisStatus.COMPLETED,
      result: JSON.stringify({
        content: '这个产品含有激素，用了会过敏，大家千万别买！',
        status: 'violation',
        score: 25,
        issues: [{
          type: 'forbidden_word',
          severity: 'high',
          description: '包含违禁词汇：激素、过敏',
          suggestions: ['建议修改表述方式', '避免使用敏感词汇'],
        }],
        sentiment: { polarity: -0.7, subjectivity: 0.8 },
      }),
    },
    {
      userId,
      type: AnalysisType.IMAGE,
      status: AnalysisStatus.COMPLETED,
      filePath: '/uploads/sample-image.jpg',
      result: JSON.stringify({
        analysis: '这是一个示例分析结果',
        confidence: 0.95,
        tags: ['美妆', '护肤'],
      }),
    },
  ];

  return Promise.all(sampleTasks.map(task => prisma.analysisTask.create({ data: task })));
}

async function main() {
  console.log('🌱 开始初始化种子数据...');

  try {
    // 创建用户
    const admin = await createUser(seedData.adminUser, UserRole.ADMIN);
    console.log('✅ 管理员用户创建完成:', admin.email);

    const testUser = await createUser(seedData.testUser, UserRole.USER);
    console.log('✅ 测试用户创建完成:', testUser.email);

    // 初始化违禁词库
    const createdWords = await initializeForbiddenWords();
    console.log(`✅ 创建违禁词库: ${createdWords.count} 个词汇`);

    // 初始化系统配置
    await initializeSystemConfigs();
    console.log('✅ 系统配置初始化完成');

    // 创建示例任务
    const tasks = await createSampleTasks(testUser.id);
    console.log(`✅ 示例分析任务创建完成: ${tasks.length} 个任务`);

    console.log('🎉 数据库种子数据初始化完成！');
  } catch (error) {
    console.error('❌ 初始化过程中发生错误:', error);
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