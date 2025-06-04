# API Integration Plugin 🚀

一个现代化的、可扩展的API集成插件，基于开源项目 [API Dash](https://github.com/foss42/apidash) 的设计理念构建。

## 🌟 特性

### 🔧 核心功能
- **多协议支持**: HTTP/HTTPS, GraphQL, WebSocket
- **智能代码生成**: 支持多种编程语言和框架
- **可视化响应预览**: 支持JSON, XML, 图片, 视频等多种格式
- **请求集合管理**: 组织和管理API请求
- **环境变量**: 支持多环境配置

### 💻 支持的代码生成语言
- JavaScript (axios, fetch)
- Python (requests, http.client)
- Java (OkHttp, HttpClient)
- C# (HttpClient, RestSharp)
- Go (net/http)
- PHP (cURL, Guzzle)
- Rust (reqwest, hyper)
- Swift (URLSession, Alamofire)
- Kotlin (OkHttp)
- Ruby (Faraday, net/http)

### 🎨 用户界面
- 现代化的响应式设计
- 深色/浅色主题切换
- 直观的请求构建器
- 实时语法高亮
- 拖拽式请求组织

## 🏗️ 项目结构

```
api-integration-plugin/
├── src/
│   ├── core/                 # 核心功能模块
│   │   ├── request/          # 请求处理
│   │   ├── response/         # 响应处理
│   │   ├── codegen/          # 代码生成
│   │   └── storage/          # 数据存储
│   ├── ui/                   # 用户界面组件
│   │   ├── components/       # React组件
│   │   ├── pages/           # 页面组件
│   │   └── styles/          # 样式文件
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript类型定义
│   └── constants/           # 常量定义
├── public/                  # 静态资源
├── docs/                    # 文档
├── tests/                   # 测试文件
└── examples/                # 示例代码
```

## 🚀 快速开始

### 安装依赖
```bash
npm install
```

### 启动开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

## 📖 使用指南

### 1. 创建API请求
1. 选择HTTP方法 (GET, POST, PUT, DELETE等)
2. 输入API端点URL
3. 配置请求头、参数和请求体
4. 点击发送按钮执行请求

### 2. 生成集成代码
1. 配置完API请求后
2. 选择目标编程语言和框架
3. 点击"生成代码"按钮
4. 复制生成的代码到你的项目中

### 3. 管理请求集合
1. 创建新的集合或文件夹
2. 拖拽请求到相应的集合中
3. 导出集合为HAR或JSON格式
4. 导入Postman、Insomnia等工具的集合

## 🔧 配置

### 环境变量
创建 `.env` 文件配置环境变量：

```env
REACT_APP_API_BASE_URL=https://api.example.com
REACT_APP_DEFAULT_TIMEOUT=30000
REACT_APP_MAX_REQUEST_SIZE=10485760
```

### 主题配置
在 `src/config/theme.ts` 中自定义主题：

```typescript
export const lightTheme = {
  primary: '#1890ff',
  background: '#ffffff',
  text: '#000000',
  // ...
};

export const darkTheme = {
  primary: '#177ddc',
  background: '#141414',
  text: '#ffffff',
  // ...
};
```

## 🧪 测试

### 运行单元测试
```bash
npm run test
```

### 运行端到端测试
```bash
npm run test:e2e
```

### 生成测试覆盖率报告
```bash
npm run test:coverage
```

## 🤝 贡献指南

我们欢迎所有形式的贡献！请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详细信息。

### 开发流程
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [API Dash](https://github.com/foss42/apidash) - 提供了优秀的设计理念和架构参考
- [Postman](https://www.postman.com/) - API测试工具的行业标准
- [Insomnia](https://insomnia.rest/) - 简洁优雅的API客户端

## 📞 联系我们

- 项目主页: [GitHub Repository](https://github.com/your-username/api-integration-plugin)
- 问题反馈: [Issues](https://github.com/your-username/api-integration-plugin/issues)
- 功能请求: [Feature Requests](https://github.com/your-username/api-integration-plugin/discussions)

---

⭐ 如果这个项目对你有帮助，请给我们一个星标！