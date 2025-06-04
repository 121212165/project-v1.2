# 美妆AI助手项目

一个基于AI的美妆内容审核和分析平台，帮助美妆品牌、MCN机构和内容创作者确保内容合规性。

## 项目状态

🚧 **项目重构中** - 正在从混合技术栈迁移到统一的Node.js + TypeScript + React架构

## 技术栈

### 后端
- **运行时**: Node.js 18+
- **语言**: TypeScript
- **框架**: Express.js
- **数据库**: PostgreSQL + Redis
- **AI服务**: 阿里云百炼API
- **认证**: JWT
- **测试**: Jest

### 前端
- **框架**: React 18 + TypeScript
- **构建工具**: Vite
- **状态管理**: Zustand
- **UI组件**: Ant Design
- **HTTP客户端**: Axios
- **测试**: Vitest + React Testing Library

## 项目结构

```
├── frontend/           # React前端应用
│   ├── src/
│   │   ├── components/ # 可复用组件
│   │   ├── pages/      # 页面组件
│   │   ├── hooks/      # 自定义Hooks
│   │   ├── store/      # 状态管理
│   │   ├── services/   # API服务
│   │   └── types/      # 类型定义
│   └── package.json
├── backend/            # Node.js后端API
│   ├── server/         # 现有后端代码(待重构)
│   ├── src/            # 新的TypeScript后端(开发中)
│   └── package.json
├── shared/             # 前后端共享类型定义
├── docs/               # 项目文档
│   ├── README.md       # 原始文档
│   ├── DEPLOYMENT.md   # 部署文档
│   └── *.md           # 其他文档
├── docker/             # 容器配置
├── uploads/            # 文件上传目录
├── .env.example        # 环境变量模板
├── .gitignore          # Git忽略文件
└── vercel.json         # Vercel部署配置
```

## 核心功能

- ✅ **文本内容分析**: 检测违禁词、合规性评估
- ✅ **图文内容分析**: 图像识别 + 文本分析
- 🚧 **用户认证系统**: JWT身份验证
- 🚧 **批量处理**: 支持多文件批量分析
- 🚧 **历史记录**: 分析结果持久化存储
- 🚧 **数据统计**: 分析趋势和报告生成
- 🚧 **个性化配置**: 自定义违禁词库和规则

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm 或 yarn

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 环境配置

1. 复制环境变量模板:
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入实际配置:
```bash
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/beauty_ai
REDIS_URL=redis://localhost:6379

# AI服务配置
ALI_CLOUD_API_KEY=8e28ff44-9e3e-4e88-911c-7e0485cf90d3
ALI_CLOUD_API_SECRET=your-actual-api-secret

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key
```

### 启动开发服务器

```bash
# 启动后端 (端口3000)
cd backend
npm run dev

# 启动前端 (端口5173)
cd frontend
npm run dev
```

## 开发进度

### ✅ 已完成
- [x] 项目结构重组
- [x] 冗余代码清理
- [x] 安全问题修复
- [x] 环境变量配置
- [x] Git忽略规则更新

### 🚧 进行中
- [ ] 后端TypeScript重构
- [ ] 数据库设计与实现
- [ ] 用户认证系统
- [ ] 前端React迁移

### 📋 待开发
- [ ] 核心API重构
- [ ] AI服务优化
- [ ] 用户界面重设计
- [ ] 测试体系建设
- [ ] 部署流水线

## 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 联系方式

如有问题或建议，请通过以下方式联系:

- 项目Issues: [GitHub Issues](https://github.com/your-username/beauty-ai-assistant/issues)
- 邮箱: your-email@example.com

---

**注意**: 本项目正在重构中，部分功能可能暂时不可用。请参考 [全栈独立开发者任务清单.md](全栈独立开发者任务清单.md) 了解详细的开发计划。