# 美妆AI助手 Frontend

一个基于 React + TypeScript + Vite 构建的现代化美妆AI分析前端应用。

## 🚀 技术栈

- **框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **UI组件库**: Ant Design 5
- **路由**: React Router DOM 6
- **状态管理**: React Hooks + Context API
- **HTTP客户端**: Axios
- **代码规范**: ESLint + Prettier
- **样式**: CSS Modules + Ant Design
- **开发工具**: Husky + lint-staged

## 📦 项目结构

```
frontend/
├── public/                 # 静态资源
├── src/
│   ├── components/         # 可复用组件
│   ├── pages/             # 页面组件
│   ├── hooks/             # 自定义 Hooks
│   ├── utils/             # 工具函数
│   ├── types/             # TypeScript 类型定义
│   ├── services/          # API 服务
│   ├── constants/         # 常量定义
│   ├── styles/            # 全局样式
│   ├── App.tsx            # 应用入口
│   └── main.tsx           # 主入口文件
├── .vscode/               # VSCode 配置
├── .github/               # GitHub Actions
├── dist/                  # 构建输出目录
└── docs/                  # 项目文档
```

## 🛠️ 开发环境设置

### 前置要求

- Node.js >= 18.0.0
- npm >= 9.0.0

### 安装依赖

```bash
npm install
```

### 环境变量配置

复制环境变量示例文件并根据需要修改：

```bash
cp .env.example .env.local
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 `http://localhost:5173` 启动。

## 📝 可用脚本

### 开发相关

```bash
# 启动开发服务器
npm run dev

# 启动开发服务器（主机模式）
npm run dev:host

# 启动开发服务器（调试模式）
npm run dev:debug
```

### 构建相关

```bash
# 开发环境构建
npm run build

# 生产环境构建
npm run build:prod

# 测试环境构建
npm run build:staging

# 预览构建结果
npm run preview

# 分析打包大小
npm run analyze
```

### 代码质量

```bash
# ESLint 检查
npm run lint

# ESLint 检查并修复
npm run lint:fix

# Prettier 格式化检查
npm run format:check

# Prettier 格式化修复
npm run format:fix

# TypeScript 类型检查
npm run type-check

# TypeScript 类型检查（监听模式）
npm run type-check:watch
```

### 清理和维护

```bash
# 清理构建文件
npm run clean

# 清理依赖并重新安装
npm run clean:deps
```

## 🔧 开发指南

### 代码规范

项目使用 ESLint + Prettier 进行代码规范管理：

- **ESLint**: 代码质量检查，包括 TypeScript、React、导入规则等
- **Prettier**: 代码格式化，统一代码风格
- **Husky**: Git hooks，在提交前自动运行检查
- **lint-staged**: 只对暂存的文件运行检查

### 提交规范

项目使用 Conventional Commits 规范：

```
type(scope): description

[optional body]

[optional footer]
```

常用类型：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 组件开发

1. **函数式组件**: 优先使用函数式组件和 Hooks
2. **TypeScript**: 严格的类型定义，提高代码质量
3. **Props接口**: 为所有组件定义清晰的 Props 接口
4. **样式隔离**: 使用 CSS Modules 或 styled-components
5. **可访问性**: 遵循 WCAG 2.1 AA 标准

### API 集成

- 使用 Axios 进行 HTTP 请求
- 统一的错误处理机制
- 请求/响应拦截器
- 自动重试机制
- 请求缓存策略

## 🚀 部署

### 构建生产版本

```bash
npm run build:prod
```

### 部署到静态托管

构建完成后，`dist` 目录包含所有静态文件，可以部署到：

- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- 任何静态文件服务器

### 环境变量

生产环境需要配置以下环境变量：

```bash
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_TITLE=美妆AI助手
# ... 其他必要的环境变量
```

## 🧪 测试

```bash
# 运行单元测试
npm run test

# 运行测试（监听模式）
npm run test:watch

# 生成测试覆盖率报告
npm run test:coverage
```

## 📊 性能优化

- **代码分割**: 使用 React.lazy 和 Suspense
- **Tree Shaking**: Vite 自动移除未使用的代码
- **资源压缩**: 生产环境自动压缩 JS/CSS
- **缓存策略**: 合理的文件命名和缓存头设置
- **懒加载**: 图片和组件的懒加载

## 🔍 调试

### 开发工具

- React Developer Tools
- Redux DevTools (如果使用 Redux)
- Vite 开发服务器的 HMR
- VSCode 调试配置

### 常见问题

1. **端口冲突**: 修改 `vite.config.ts` 中的端口配置
2. **代理问题**: 检查 `vite.config.ts` 中的 proxy 配置
3. **类型错误**: 运行 `npm run type-check` 检查类型问题
4. **ESLint 错误**: 运行 `npm run lint:fix` 自动修复

## 📚 相关文档

- [React 官方文档](https://react.dev/)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Ant Design 官方文档](https://ant.design/)
- [React Router 官方文档](https://reactrouter.com/)

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 团队

- **开发团队**: [团队成员列表]
- **维护者**: [维护者信息]

## 📞 联系我们

如有问题或建议，请通过以下方式联系我们：

- 邮箱: [your-email@example.com]
- 问题反馈: [GitHub Issues](https://github.com/your-username/your-repo/issues)

---

**Happy Coding! 🎉**