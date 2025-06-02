# 常见错误解决方案

## 🎯 图标导入错误

### 问题：TrendingDownOutlined 图标不存在

**问题类型**: 编译错误  
**发生时间**: 2024-01-15  
**影响范围**: 前端  
**严重程度**: 中  

#### 问题现象
```
Module '"@ant-design/icons"' has no exported member 'TrendingDownOutlined'
```

#### 错误信息
```typescript
// 错误的导入
import { TrendingDownOutlined, TrendingUpOutlined } from '@ant-design/icons';
```

#### 解决方案
1. 检查 Ant Design Icons 官方文档确认图标名称
2. 使用正确的替代图标：
   ```typescript
   // 正确的导入
   import { FallOutlined, RiseOutlined } from '@ant-design/icons';
   ```
3. 批量替换代码中的引用：
   ```typescript
   // 替换使用
   <FallOutlined />  // 替代 TrendingDownOutlined
   <RiseOutlined />  // 替代 TrendingUpOutlined
   ```

#### 根本原因
- Ant Design Icons 库中不存在 `TrendingDownOutlined` 和 `TrendingUpOutlined`
- 开发时未验证图标是否存在于当前版本

#### 预防措施
1. 使用前查看 [Ant Design Icons 官方文档](https://ant.design/components/icon-cn)
2. 配置 ESLint 规则检查导入
3. 建立图标使用规范文档

---

## 🔐 权限验证错误

### 问题：403 Forbidden 错误

**问题类型**: 权限错误  
**发生时间**: 2024-01-15  
**影响范围**: 前后端  
**严重程度**: 中  

#### 问题现象
- 用户访问某些资源时收到 403 状态码
- 控制台显示 "禁止访问" 或 "无权访问此任务"

#### 错误信息
```json
{
  "error": "无权访问此任务",
  "status": 403
}
```

#### 解决方案
1. **检查用户权限**：
   ```typescript
   // 验证用户是否有权限访问资源
   if (task.userId !== req.user.id) {
     return res.status(403).json({ error: '无权访问此任务' });
   }
   ```

2. **检查 JWT Token**：
   ```typescript
   // 确保 token 有效且未过期
   const token = req.headers.authorization?.split(' ')[1];
   if (!token) {
     return res.status(401).json({ error: '未提供认证令牌' });
   }
   ```

3. **前端处理**：
   ```typescript
   // 处理 403 错误
   if (error.response?.status === 403) {
     message.error('您没有权限执行此操作');
     // 可选：重定向到登录页面
     navigate('/login');
   }
   ```

#### 根本原因
- 正常的权限检查机制
- 用户尝试访问不属于自己的资源

#### 预防措施
1. 前端进行权限预检查
2. 提供清晰的权限说明
3. 实现角色基础的访问控制

---

## 🔧 TypeScript 类型错误

### 问题：类型定义不匹配

**问题类型**: 类型错误  
**发生时间**: 常见  
**影响范围**: 前后端  
**严重程度**: 中  

#### 问题现象
```
Type 'string | undefined' is not assignable to type 'string'
```

#### 解决方案
1. **使用类型守卫**：
   ```typescript
   if (value !== undefined) {
     // 现在 value 的类型是 string
     console.log(value.toUpperCase());
   }
   ```

2. **使用非空断言**（谨慎使用）：
   ```typescript
   const result = value!.toUpperCase(); // 确保 value 不为 undefined
   ```

3. **使用可选链**：
   ```typescript
   const result = value?.toUpperCase() ?? 'default';
   ```

4. **正确的类型定义**：
   ```typescript
   interface User {
     id: string;
     name?: string; // 可选属性
     email: string;
   }
   ```

#### 预防措施
1. 启用严格的 TypeScript 配置
2. 使用 ESLint TypeScript 规则
3. 定期进行类型检查

---

## 🌐 API 调用错误

### 问题：网络请求失败

**问题类型**: 网络错误  
**发生时间**: 常见  
**影响范围**: 前端  
**严重程度**: 高  

#### 问题现象
- 请求超时
- 连接被拒绝
- CORS 错误

#### 解决方案
1. **检查网络连接**：
   ```typescript
   // 添加网络状态检查
   if (!navigator.onLine) {
     message.error('网络连接已断开');
     return;
   }
   ```

2. **添加重试机制**：
   ```typescript
   const retryRequest = async (url: string, options: RequestInit, retries = 3) => {
     try {
       return await fetch(url, options);
     } catch (error) {
       if (retries > 0) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         return retryRequest(url, options, retries - 1);
       }
       throw error;
     }
   };
   ```

3. **处理 CORS 问题**：
   ```typescript
   // 后端配置 CORS
   app.use(cors({
     origin: process.env.FRONTEND_URL,
     credentials: true
   }));
   ```

4. **添加超时处理**：
   ```typescript
   const controller = new AbortController();
   const timeoutId = setTimeout(() => controller.abort(), 10000);
   
   try {
     const response = await fetch(url, {
       signal: controller.signal,
       ...options
     });
     clearTimeout(timeoutId);
     return response;
   } catch (error) {
     if (error.name === 'AbortError') {
       throw new Error('请求超时');
     }
     throw error;
   }
   ```

#### 预防措施
1. 实现统一的错误处理
2. 添加请求和响应拦截器
3. 配置合理的超时时间
4. 实现离线缓存机制

---

## 🗄️ 数据库连接错误

### 问题：数据库连接失败

**问题类型**: 数据库错误  
**发生时间**: 启动时/运行时  
**影响范围**: 后端  
**严重程度**: 高  

#### 问题现象
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

#### 解决方案
1. **检查数据库服务状态**：
   ```bash
   # 检查 PostgreSQL 服务
   ./scripts/start-dev-db.bat
   
   # 检查连接
   psql -h localhost -p 5432 -U username -d database
   ```

2. **验证连接字符串**：
   ```typescript
   // 检查环境变量
   console.log('DATABASE_URL:', process.env.DATABASE_URL);
   
   // 测试连接
   import { PrismaClient } from '@prisma/client';
   const prisma = new PrismaClient();
   
   try {
     await prisma.$connect();
     console.log('数据库连接成功');
   } catch (error) {
     console.error('数据库连接失败:', error);
   }
   ```

3. **添加连接重试**：
   ```typescript
   const connectWithRetry = async (retries = 5) => {
     try {
       await prisma.$connect();
       console.log('数据库连接成功');
     } catch (error) {
       if (retries > 0) {
         console.log(`数据库连接失败，${retries} 次重试后再试...`);
         setTimeout(() => connectWithRetry(retries - 1), 5000);
       } else {
         console.error('数据库连接失败，已达到最大重试次数');
         process.exit(1);
       }
     }
   };
   ```

#### 预防措施
1. 配置数据库健康检查
2. 实现连接池管理
3. 添加数据库监控
4. 配置自动重启机制

---

## 🏗️ 构建错误

### 问题：Vite 构建失败

**问题类型**: 构建错误  
**发生时间**: 构建时  
**影响范围**: 前端  
**严重程度**: 高  

#### 问题现象
```
Build failed with errors:
RollupError: Could not resolve "./non-existent-module"
```

#### 解决方案
1. **检查导入路径**：
   ```typescript
   // 错误的导入
   import Component from './non-existent-module';
   
   // 正确的导入
   import Component from './ExistingComponent';
   ```

2. **清理缓存**：
   ```bash
   # 清理 node_modules 和缓存
   rm -rf node_modules package-lock.json
   npm install
   
   # 清理 Vite 缓存
   rm -rf .vite
   ```

3. **检查依赖版本**：
   ```bash
   # 检查依赖冲突
   npm ls
   
   # 更新依赖
   npm update
   ```

4. **配置路径别名**：
   ```typescript
   // vite.config.ts
   export default defineConfig({
     resolve: {
       alias: {
         '@': path.resolve(__dirname, 'src'),
       },
     },
   });
   ```

#### 预防措施
1. 使用绝对路径导入
2. 配置 ESLint 检查导入
3. 定期更新依赖
4. 使用 TypeScript 路径映射

---

## 📝 总结

### 错误处理最佳实践

1. **预防为主**：
   - 使用 TypeScript 严格模式
   - 配置 ESLint 和 Prettier
   - 实施代码审查

2. **快速定位**：
   - 添加详细的错误日志
   - 使用调试工具
   - 建立错误监控

3. **优雅处理**：
   - 实现统一错误处理
   - 提供用户友好的错误信息
   - 添加错误恢复机制

4. **持续改进**：
   - 记录和分析错误模式
   - 更新文档和知识库
   - 优化开发流程

### 常用调试命令

```bash
# 前端调试
npm run dev          # 启动开发服务器
npm run build        # 构建项目
npm run lint         # 代码检查
npm run type-check   # 类型检查

# 后端调试
npm run dev          # 启动开发服务器
npm run build        # 编译 TypeScript
npx prisma studio    # 数据库管理界面
npx prisma migrate dev # 运行数据库迁移

# 数据库调试
./scripts/start-dev-db.bat  # 启动数据库
./scripts/logs-dev-db.bat   # 查看数据库日志
./scripts/clean-dev-db.bat  # 清理数据库
```

---

**最后更新**: 2024-01-15  
**维护者**: 开发团队  
**相关文档**: [调试指南](debugging-guide.md), [最佳实践](../best-practices/)