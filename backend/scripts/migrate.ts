#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { logger } from '../src/utils/logger';

/**
 * 数据库迁移管理脚本
 */

const PRISMA_SCHEMA_PATH = join(__dirname, '../prisma/schema.prisma');
const MIGRATIONS_DIR = join(__dirname, '../prisma/migrations');

/**
 * 执行命令并记录日志
 */
function executeCommand(command: string, description: string): void {
  try {
    logger.info(`开始执行: ${description}`);
    logger.info(`命令: ${command}`);
    
    const output = execSync(command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: join(__dirname, '..')
    });
    
    logger.info(`✅ ${description} 完成`);
    if (output.trim()) {
      logger.info(`输出: ${output}`);
    }
  } catch (error: any) {
    logger.error(`❌ ${description} 失败:`);
    logger.error(error.message);
    if (error.stdout) {
      logger.error(`标准输出: ${error.stdout}`);
    }
    if (error.stderr) {
      logger.error(`错误输出: ${error.stderr}`);
    }
    process.exit(1);
  }
}

/**
 * 检查必要文件
 */
function checkRequiredFiles(): void {
  if (!existsSync(PRISMA_SCHEMA_PATH)) {
    logger.error(`❌ Prisma schema 文件不存在: ${PRISMA_SCHEMA_PATH}`);
    process.exit(1);
  }
  
  logger.info(`✅ Prisma schema 文件存在: ${PRISMA_SCHEMA_PATH}`);
}

/**
 * 生成 Prisma 客户端
 */
function generatePrismaClient(): void {
  executeCommand('npx prisma generate', '生成 Prisma 客户端');
}

/**
 * 推送数据库结构（开发环境）
 */
function pushDatabase(): void {
  executeCommand('npx prisma db push', '推送数据库结构');
}

/**
 * 创建迁移文件
 */
function createMigration(name?: string): void {
  const migrationName = name || `migration_${Date.now()}`;
  executeCommand(
    `npx prisma migrate dev --name ${migrationName}`,
    `创建迁移文件: ${migrationName}`
  );
}

/**
 * 部署迁移（生产环境）
 */
function deployMigrations(): void {
  executeCommand('npx prisma migrate deploy', '部署迁移文件');
}

/**
 * 重置数据库
 */
function resetDatabase(): void {
  executeCommand('npx prisma migrate reset --force', '重置数据库');
}

/**
 * 查看迁移状态
 */
function migrationStatus(): void {
  executeCommand('npx prisma migrate status', '查看迁移状态');
}

/**
 * 运行种子数据
 */
function runSeed(): void {
  executeCommand('npx tsx prisma/seed.ts', '运行种子数据');
}

/**
 * 打开 Prisma Studio
 */
function openStudio(): void {
  logger.info('🚀 启动 Prisma Studio...');
  logger.info('访问地址: http://localhost:5555');
  executeCommand('npx prisma studio', '启动 Prisma Studio');
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
🗄️  数据库迁移管理工具
`);
  console.log('用法: npm run migrate <command> [options]\n');
  console.log('命令:');
  console.log('  generate              生成 Prisma 客户端');
  console.log('  push                  推送数据库结构（开发环境）');
  console.log('  create [name]         创建新的迁移文件');
  console.log('  deploy                部署迁移文件（生产环境）');
  console.log('  reset                 重置数据库');
  console.log('  status                查看迁移状态');
  console.log('  seed                  运行种子数据');
  console.log('  studio                打开 Prisma Studio');
  console.log('  init                  初始化数据库（推送+种子数据）');
  console.log('  help                  显示帮助信息\n');
  console.log('示例:');
  console.log('  npm run migrate generate');
  console.log('  npm run migrate create add_user_table');
  console.log('  npm run migrate deploy');
  console.log('  npm run migrate init\n');
}

/**
 * 初始化数据库（开发环境）
 */
function initDatabase(): void {
  logger.info('🚀 开始初始化数据库...');
  
  checkRequiredFiles();
  generatePrismaClient();
  pushDatabase();
  runSeed();
  
  logger.info('🎉 数据库初始化完成！');
  logger.info('💡 提示: 运行 "npm run migrate studio" 打开数据库管理界面');
}

/**
 * 主函数
 */
function main(): void {
  const command = process.argv[2];
  const option = process.argv[3];
  
  switch (command) {
    case 'generate':
      checkRequiredFiles();
      generatePrismaClient();
      break;
      
    case 'push':
      checkRequiredFiles();
      generatePrismaClient();
      pushDatabase();
      break;
      
    case 'create':
      checkRequiredFiles();
      createMigration(option);
      break;
      
    case 'deploy':
      checkRequiredFiles();
      deployMigrations();
      break;
      
    case 'reset':
      resetDatabase();
      break;
      
    case 'status':
      migrationStatus();
      break;
      
    case 'seed':
      runSeed();
      break;
      
    case 'studio':
      openStudio();
      break;
      
    case 'init':
      initDatabase();
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      logger.error(`❌ 未知命令: ${command}`);
      showHelp();
      process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

export {
  generatePrismaClient,
  pushDatabase,
  createMigration,
  deployMigrations,
  resetDatabase,
  migrationStatus,
  runSeed,
  openStudio,
  initDatabase,
};