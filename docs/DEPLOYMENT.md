# 美妆AI助手 - Vercel部署指南

## 项目概述
这是一个基于Express.js和OpenAI的美妆智能分析应用，支持文本和图文分析功能。

## 已完成的配置

### 1. 项目结构优化
- ✅ 修复了package.json文件（移除重复配置）
- ✅ 创建了vercel.json配置文件
- ✅ 添加了.gitignore文件
- ✅ 配置了服务器路由

### 2. Git仓库设置
- ✅ 初始化Git仓库
- ✅ 添加文件并提交
- ✅ 设置main分支
- ✅ 配置远程仓库地址

## 部署到Vercel的步骤

### 步骤1: 完成代码推送到GitHub
由于网络连接问题，请手动完成代码推送：

```bash
# 确保在项目目录下
cd c:\Users\lenovo\Desktop\01.01

# 检查远程仓库
git remote -v

# 如果需要重新设置远程仓库
git remote set-url origin https://github.com/121212165/-.git

# 推送代码（可能需要多次尝试或使用VPN）
git push -u origin main
```

### 步骤2: 在Vercel平台部署

1. **登录Vercel**
   - 访问 https://vercel.com
   - 使用GitHub账户登录

2. **导入项目**
   - 点击"New Project"
   - 选择GitHub仓库 `121212165/-`
   - 点击"Import"

3. **配置项目设置**
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: (留空)
   - Install Command: `npm install`

4. **环境变量配置**
   在Vercel项目设置中添加以下环境变量：
   ```
   DASHSCOPE_API_KEY=sk-d0bef4ed52514a8d83b37f1abdc91692
   PORT=3000
   ```

5. **部署**
   - 点击"Deploy"开始部署
   - 等待构建完成

### 步骤3: 验证部署

部署成功后，Vercel会提供一个URL（如：beauty-ai-assistant.vercel.app）

访问该URL验证以下功能：
- ✅ 主页加载正常
- ✅ 文本分析功能
- ✅ 图文分析功能
- ✅ API响应正常

## 环境变量说明

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| OPENAI_API_KEY | OpenAI API密钥 | sk-xxxxxxxxxxxx |
| OPENAI_BASE_URL | OpenAI API基础URL | https://api.openai.com/v1 |
| DASHSCOPE_API_KEY | 达摩院灵积API密钥 | sk-xxxxxxxxxxxx |
| DASHSCOPE_BASE_URL | 达摩院灵积API基础URL | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| PORT | 服务器端口（Vercel会自动设置） | 3000 |

## 故障排除

### 常见问题

1. **GitHub推送失败**
   - 检查网络连接
   - 尝试使用VPN
   - 确认GitHub仓库权限

2. **Vercel部署失败**
   - 检查package.json语法
   - 确认所有依赖都已正确安装
   - 查看Vercel构建日志

3. **API调用失败**
   - 确认环境变量设置正确
   - 检查OpenAI API密钥有效性
   - 验证API配额

### 手动推送提示

如果自动推送失败，可以尝试：

1. **使用GitHub Desktop**
   - 下载并安装GitHub Desktop
   - 添加本地仓库
   - 手动推送

2. **使用SSH密钥**
   - 生成SSH密钥对
   - 添加公钥到GitHub
   - 修改远程仓库URL为SSH格式

## 项目文件结构

```
beauty-ai-assistant/
├── server/
│   ├── app.js              # 主服务器文件
│   ├── routes/
│   │   └── analyze.js       # API路由
│   └── utils/
│       └── aiService.js     # AI服务封装
├── public/
│   └── script.js           # 前端脚本
├── index.html              # 主页面
├── vercel.json             # Vercel配置
├── package.json            # 项目依赖
├── .gitignore             # Git忽略文件
└── .env                   # 环境变量（不会上传到Git）
```

## 下一步

1. 完成GitHub推送
2. 在Vercel创建项目并配置环境变量
3. 测试部署后的应用功能
4. 根据需要调整配置

---

**注意**: 请确保不要将.env文件推送到公共仓库，API密钥等敏感信息应该只在Vercel的环境变量中配置。