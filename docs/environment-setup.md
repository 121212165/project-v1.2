# 开发环境配置指南

## 1. 环境层次配置

### 开发环境 (Development)

#### 前端环境配置
```bash
# 安装依赖
cd frontend
npm install

# 安装开发工具
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D eslint-plugin-react eslint-plugin-react-hooks
npm install -D eslint-plugin-import @typescript-eslint/eslint-plugin
npm install -D husky lint-staged
npm install -D @types/node

# 配置 husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm run type-check"
```

#### 后端环境配置
```bash
# 安装依赖
cd backend
npm install

# 安装开发工具
npm install -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D eslint-plugin-node
npm install -D nodemon ts-node
npm install -D @types/express @types/cors
```

#### 数据库环境
```bash
# 启动开发数据库
./scripts/start-dev-db.bat

# 运行数据库迁移
cd backend
npx prisma migrate dev

# 生成 Prisma 客户端
npx prisma generate

# 填充种子数据
npx prisma db seed
```

### 测试环境 (Testing)

#### 前端测试配置
```bash
# 安装测试工具
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jsdom
npm install -D @vitejs/plugin-react
```

#### 后端测试配置
```bash
# 安装测试工具
npm install -D jest @types/jest ts-jest
npm install -D supertest @types/supertest
npm install -D @testcontainers/postgresql
```

### 生产环境 (Production)

#### Docker 配置
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

```dockerfile
# backend/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/app.js"]
```

## 2. 环境变量管理

### 环境变量文件结构
```
├── .env.example          # 环境变量模板
├── .env.development      # 开发环境变量
├── .env.testing          # 测试环境变量
├── .env.staging          # 预发布环境变量
└── .env.production       # 生产环境变量
```

### 前端环境变量
```bash
# .env.development
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=开发环境 - 数据分析平台
VITE_ENABLE_MOCK=true
VITE_LOG_LEVEL=debug

# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_APP_TITLE=数据分析平台
VITE_ENABLE_MOCK=false
VITE_LOG_LEVEL=error
```

### 后端环境变量
```bash
# .env.development
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/devdb
JWT_SECRET=dev-secret-key
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug

# .env.production
NODE_ENV=production
PORT=3000
DATABASE_URL=${DATABASE_URL}
JWT_SECRET=${JWT_SECRET}
CORS_ORIGIN=${FRONTEND_URL}
LOG_LEVEL=info
```

## 3. 依赖管理策略

### 版本锁定策略
```json
// package.json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  },
  "dependencies": {
    "antd": "^5.12.0",
    "@ant-design/icons": "^5.2.0",
    "react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
```

### 依赖更新检查
```bash
# 检查过期依赖
npm outdated

# 安全漏洞检查
npm audit

# 自动修复安全问题
npm audit fix

# 更新依赖
npm update
```

### 依赖兼容性检查
```bash
# 创建兼容性检查脚本
#!/bin/bash
echo "检查依赖兼容性..."

# 检查 Node.js 版本
node_version=$(node -v)
echo "Node.js 版本: $node_version"

# 检查关键依赖版本
echo "关键依赖版本:"
npm list antd @ant-design/icons react typescript

# 运行类型检查
echo "运行 TypeScript 检查..."
npx tsc --noEmit

# 运行构建测试
echo "运行构建测试..."
npm run build

echo "兼容性检查完成!"
```

## 4. 开发工具配置

### VSCode 工作区配置
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "eslint.workingDirectories": ["frontend", "backend"],
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "emmet.includeLanguages": {
    "typescript": "html",
    "typescriptreact": "html"
  }
}
```

### 推荐扩展
```json
// .vscode/extensions.json
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-json",
    "redhat.vscode-yaml",
    "ms-vscode-remote.remote-containers"
  ]
}
```

## 5. 性能监控配置

### 前端性能监控
```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  static measurePageLoad(): void {
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      console.log('页面加载时间:', perfData.loadEventEnd - perfData.fetchStart);
    });
  }

  static measureComponentRender(componentName: string): void {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      console.log(`${componentName} 渲染时间:`, endTime - startTime);
    };
  }
}
```

### 后端性能监控
```typescript
// src/middleware/performance.ts
import { Request, Response, NextFunction } from 'express';

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};
```

## 6. 错误监控配置

### 前端错误捕获
```typescript
// src/utils/errorHandler.ts
export class ErrorHandler {
  static setupGlobalErrorHandling(): void {
    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未处理的 Promise 拒绝:', event.reason);
      this.reportError(event.reason);
    });

    // 捕获全局错误
    window.addEventListener('error', (event) => {
      console.error('全局错误:', event.error);
      this.reportError(event.error);
    });
  }

  static reportError(error: Error): void {
    // 发送错误报告到监控服务
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(console.error);
  }
}
```

## 7. 部署配置

### CI/CD 流水线
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        run: |
          # 部署脚本
          echo "部署到生产环境"
```

### 健康检查
```typescript
// backend/src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  });
});

export default router;
```

## 总结

这个环境配置体系提供了：
- 多环境支持和配置管理
- 依赖版本控制和兼容性检查
- 开发工具和 IDE 配置
- 性能和错误监控
- 自动化部署流程

定期检查和更新配置，确保开发环境的稳定性和效率。