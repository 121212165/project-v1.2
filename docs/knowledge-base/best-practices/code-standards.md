# 代码规范与最佳实践

## 🎯 总体原则

### SOLID 原则
1. **单一职责原则 (SRP)**: 每个类或函数只负责一个功能
2. **开闭原则 (OCP)**: 对扩展开放，对修改关闭
3. **里氏替换原则 (LSP)**: 子类可以替换父类
4. **接口隔离原则 (ISP)**: 使用多个专门的接口
5. **依赖倒置原则 (DIP)**: 依赖抽象而不是具体实现

### 代码质量标准
- **可读性**: 代码应该像文档一样易读
- **可维护性**: 易于修改和扩展
- **可测试性**: 便于编写单元测试
- **性能**: 在保证可读性的前提下优化性能
- **安全性**: 遵循安全编码规范

---

## 🎨 前端代码规范

### React 组件规范

#### 1. 组件结构
```typescript
// ✅ 推荐的组件结构
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, message } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { User } from '@/types/user';
import { userService } from '@/services/userService';
import styles from './UserCard.module.css';

interface UserCardProps {
  userId: string;
  onUserUpdate?: (user: User) => void;
  className?: string;
}

const UserCard: React.FC<UserCardProps> = ({ 
  userId, 
  onUserUpdate, 
  className 
}) => {
  // 状态定义
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // 副作用
  useEffect(() => {
    loadUser();
  }, [userId]);

  // 事件处理函数
  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await userService.getUser(userId);
      setUser(userData);
    } catch (error) {
      message.error('加载用户信息失败');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const handleUpdate = useCallback(async () => {
    if (!user) return;
    
    try {
      const updatedUser = await userService.updateUser(user.id, user);
      setUser(updatedUser);
      onUserUpdate?.(updatedUser);
      message.success('更新成功');
    } catch (error) {
      message.error('更新失败');
    }
  }, [user, onUserUpdate]);

  // 渲染函数
  if (loading) {
    return <Card loading />;
  }

  if (!user) {
    return <Card>用户不存在</Card>;
  }

  return (
    <Card 
      className={`${styles.userCard} ${className || ''}`}
      title={user.name}
      extra={<Button onClick={handleUpdate}>更新</Button>}
    >
      <div className={styles.userInfo}>
        <UserOutlined className={styles.avatar} />
        <span>{user.email}</span>
      </div>
    </Card>
  );
};

export default UserCard;
```

#### 2. 组件命名规范
```typescript
// ✅ 组件文件命名：PascalCase
UserCard.tsx
DataVisualization.tsx
NavigationMenu.tsx

// ✅ 组件内部命名
const UserCard: React.FC<UserCardProps> = () => {};
const DataVisualization: React.FC<DataVisualizationProps> = () => {};

// ✅ Props 接口命名
interface UserCardProps {}
interface DataVisualizationProps {}

// ✅ 事件处理函数命名
const handleClick = () => {};
const handleSubmit = () => {};
const handleUserUpdate = () => {};
```

#### 3. Hooks 使用规范
```typescript
// ✅ 自定义 Hook
const useUser = (userId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await userService.getUser(userId);
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  return { user, loading, error };
};

// ✅ Hook 使用
const UserProfile: React.FC<{ userId: string }> = ({ userId }) => {
  const { user, loading, error } = useUser(userId);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;
  if (!user) return <div>用户不存在</div>;

  return <div>{user.name}</div>;
};
```

### TypeScript 规范

#### 1. 类型定义
```typescript
// ✅ 接口定义
interface User {
  readonly id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ 类型别名
type UserStatus = 'active' | 'inactive' | 'pending';
type ApiResponse<T> = {
  data: T;
  message: string;
  success: boolean;
};

// ✅ 泛型使用
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ✅ 工具类型
type CreateUserRequest = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
type UpdateUserRequest = Partial<Pick<User, 'name' | 'email' | 'avatar'>>;
```

#### 2. 函数类型
```typescript
// ✅ 函数签名
type EventHandler<T = Event> = (event: T) => void;
type AsyncFunction<T, R> = (params: T) => Promise<R>;

// ✅ 函数实现
const createUser = async (userData: CreateUserRequest): Promise<User> => {
  // 实现逻辑
};

const handleClick: EventHandler<MouseEvent> = (event) => {
  event.preventDefault();
  // 处理点击
};
```

### 样式规范

#### 1. CSS Modules
```css
/* UserCard.module.css */
.userCard {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

.userCard:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.userInfo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  font-size: 24px;
  color: var(--primary-color);
}
```

#### 2. 样式命名规范
```css
/* ✅ BEM 命名规范 */
.user-card {}
.user-card__header {}
.user-card__body {}
.user-card__footer {}
.user-card--loading {}
.user-card--error {}

/* ✅ CSS 变量 */
:root {
  --primary-color: #1890ff;
  --success-color: #52c41a;
  --warning-color: #faad14;
  --error-color: #f5222d;
  --border-radius: 6px;
  --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
```

---

## 🔧 后端代码规范

### Express 应用结构

#### 1. 控制器规范
```typescript
// ✅ 控制器实现
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { CreateUserRequest, UpdateUserRequest } from '../types/user';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

export class UserController {
  // 获取用户列表
  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search } = req.query;
    
    const result = await userService.getUsers({
      page: Number(page),
      limit: Number(limit),
      search: search as string
    });

    res.json({
      success: true,
      data: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  });

  // 获取单个用户
  static getUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    res.json({
      success: true,
      data: user
    });
  });

  // 创建用户
  static createUser = asyncHandler(async (req: Request, res: Response) => {
    const userData: CreateUserRequest = req.body;
    
    const user = await userService.createUser(userData);

    res.status(201).json({
      success: true,
      data: user,
      message: '用户创建成功'
    });
  });

  // 更新用户
  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;
    
    const user = await userService.updateUser(id, updateData);
    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    res.json({
      success: true,
      data: user,
      message: '用户更新成功'
    });
  });

  // 删除用户
  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    await userService.deleteUser(id);

    res.json({
      success: true,
      message: '用户删除成功'
    });
  });
}
```

#### 2. 服务层规范
```typescript
// ✅ 服务层实现
import { PrismaClient } from '@prisma/client';
import { CreateUserRequest, UpdateUserRequest, User } from '../types/user';
import { ApiError } from '../utils/ApiError';
import { hashPassword, comparePassword } from '../utils/password';

const prisma = new PrismaClient();

export class UserService {
  // 获取用户列表
  static async getUsers(params: {
    page: number;
    limit: number;
    search?: string;
  }) {
    const { page, limit, search } = params;
    const skip = (page - 1) * limit;

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      users,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  // 根据 ID 获取用户
  static async getUserById(id: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { id }
    });
  }

  // 创建用户
  static async createUser(userData: CreateUserRequest): Promise<User> {
    // 检查邮箱是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (existingUser) {
      throw new ApiError(400, '邮箱已被使用');
    }

    // 加密密码
    const hashedPassword = await hashPassword(userData.password);

    return await prisma.user.create({
      data: {
        ...userData,
        password: hashedPassword
      }
    });
  }

  // 更新用户
  static async updateUser(id: string, updateData: UpdateUserRequest): Promise<User | null> {
    // 检查用户是否存在
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      return null;
    }

    // 如果更新邮箱，检查是否重复
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email }
      });

      if (emailExists) {
        throw new ApiError(400, '邮箱已被使用');
      }
    }

    return await prisma.user.update({
      where: { id },
      data: updateData
    });
  }

  // 删除用户
  static async deleteUser(id: string): Promise<void> {
    const user = await this.getUserById(id);
    if (!user) {
      throw new ApiError(404, '用户不存在');
    }

    await prisma.user.delete({
      where: { id }
    });
  }
}
```

#### 3. 中间件规范
```typescript
// ✅ 认证中间件
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { UserService } from '../services/userService';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      throw new ApiError(401, '未提供认证令牌');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      email: string;
      role: string;
    };

    // 验证用户是否仍然存在
    const user = await UserService.getUserById(decoded.userId);
    if (!user) {
      throw new ApiError(401, '用户不存在');
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, '无效的认证令牌'));
    } else {
      next(error);
    }
  }
};

// ✅ 权限检查中间件
export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, '未认证'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, '权限不足'));
    }

    next();
  };
};
```

### 错误处理规范

```typescript
// ✅ 自定义错误类
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ✅ 异步错误处理包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// ✅ 全局错误处理中间件
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = '服务器内部错误';

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = '无效的数据格式';
  }

  // 记录错误日志
  console.error(error);

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
};
```

---

## 📊 数据库规范

### Prisma Schema 规范

```prisma
// ✅ 模型定义
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  avatar    String?
  role      Role     @default(USER)
  status    UserStatus @default(ACTIVE)
  
  // 时间戳
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 关联关系
  tasks     Task[]
  comments  Comment[]
  
  @@map("users")
}

model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus @default(PENDING)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  
  // 外键
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 时间戳
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  
  // 关联关系
  comments    Comment[]
  
  @@map("tasks")
}

// ✅ 枚举定义
enum Role {
  USER
  ADMIN
  MODERATOR
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

### 数据库查询规范

```typescript
// ✅ 复杂查询示例
export class TaskService {
  static async getTasksWithFilters(params: {
    userId?: string;
    status?: TaskStatus;
    priority?: Priority;
    search?: string;
    page: number;
    limit: number;
  }) {
    const { userId, status, priority, search, page, limit } = params;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // 执行查询
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          comments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            orderBy: { createdAt: 'desc' }
          }
        },
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ]
      }),
      prisma.task.count({ where })
    ]);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
```

---

## 🧪 测试规范

### 单元测试

```typescript
// ✅ 服务层测试
import { UserService } from '../services/userService';
import { prismaMock } from '../__mocks__/prisma';

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserById', () => {
    it('应该返回用户信息', async () => {
      // Arrange
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await UserService.getUserById(userId);

      // Assert
      expect(result).toEqual(mockUser);
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId }
      });
    });

    it('用户不存在时应该返回 null', async () => {
      // Arrange
      const userId = 'non-existent';
      prismaMock.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await UserService.getUserById(userId);

      // Assert
      expect(result).toBeNull();
    });
  });
});
```

### 集成测试

```typescript
// ✅ API 集成测试
import request from 'supertest';
import { app } from '../app';
import { prisma } from '../config/database';

describe('User API', () => {
  beforeEach(async () => {
    // 清理测试数据
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/users', () => {
    it('应该创建新用户', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      // Assert
      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.password).toBeUndefined(); // 密码不应该返回
    });

    it('邮箱重复时应该返回错误', async () => {
      // Arrange
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      // 先创建一个用户
      await request(app)
        .post('/api/users')
        .send(userData);

      // Act & Assert
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('邮箱已被使用');
    });
  });
});
```

---

## 📝 文档规范

### JSDoc 注释

```typescript
/**
 * 用户服务类，处理用户相关的业务逻辑
 * @class UserService
 */
export class UserService {
  /**
   * 根据 ID 获取用户信息
   * @param {string} id - 用户 ID
   * @returns {Promise<User | null>} 用户信息或 null
   * @throws {ApiError} 当数据库查询失败时抛出错误
   * @example
   * ```typescript
   * const user = await UserService.getUserById('user-123');
   * if (user) {
   *   console.log(user.name);
   * }
   * ```
   */
  static async getUserById(id: string): Promise<User | null> {
    // 实现逻辑
  }
}
```

### README 文档结构

```markdown
# 项目名称

## 📖 项目简介
简要描述项目的目的和功能

## 🚀 快速开始
### 环境要求
- Node.js >= 18.0.0
- PostgreSQL >= 13

### 安装步骤
1. 克隆项目
2. 安装依赖
3. 配置环境变量
4. 运行项目

## 📁 项目结构
```
src/
├── controllers/    # 控制器
├── services/      # 服务层
├── models/        # 数据模型
├── middleware/    # 中间件
├── utils/         # 工具函数
└── types/         # 类型定义
```

## 🔧 开发指南
- [代码规范](docs/code-standards.md)
- [API 文档](docs/api.md)
- [部署指南](docs/deployment.md)

## 🧪 测试
```bash
npm run test        # 运行所有测试
npm run test:unit   # 运行单元测试
npm run test:e2e    # 运行端到端测试
```

## 📄 许可证
MIT License
```

---

## 🎯 总结

### 代码质量检查清单

- [ ] 代码符合 ESLint 规则
- [ ] TypeScript 类型检查通过
- [ ] 单元测试覆盖率 > 80%
- [ ] 集成测试通过
- [ ] 代码审查完成
- [ ] 文档更新完整
- [ ] 性能测试通过
- [ ] 安全检查通过

### 持续改进

1. **定期审查**：每月审查代码规范的执行情况
2. **工具更新**：及时更新开发工具和依赖
3. **团队培训**：定期进行代码规范培训
4. **反馈收集**：收集团队对规范的建议和改进意见

---

**最后更新**: 2024-01-15  
**维护者**: 开发团队  
**相关文档**: [环境配置](../environment-setup.md), [组件库规范](../component-library-guidelines.md)