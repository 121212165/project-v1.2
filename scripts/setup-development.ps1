# 开发环境自动化设置脚本
# PowerShell 脚本用于快速设置开发环境

param(
    [switch]$SkipNodeInstall,
    [switch]$SkipDependencies,
    [switch]$SkipHooks,
    [switch]$SkipDatabase,
    [string]$NodeVersion = "18.17.0"
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✅ $Message" "Green"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ️  $Message" "Cyan"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠️  $Message" "Yellow"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "❌ $Message" "Red"
}

# 检查管理员权限
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# 安装 Chocolatey
function Install-Chocolatey {
    if (Test-Command "choco") {
        Write-Info "Chocolatey 已安装"
        return
    }

    Write-Info "安装 Chocolatey..."
    Set-ExecutionPolicy Bypass -Scope Process -Force
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    
    # 刷新环境变量
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    
    Write-Success "Chocolatey 安装完成"
}

# 安装 Node.js
function Install-NodeJS {
    if ($SkipNodeInstall) {
        Write-Info "跳过 Node.js 安装"
        return
    }

    if (Test-Command "node") {
        $currentVersion = node --version
        Write-Info "Node.js 当前版本: $currentVersion"
        
        if ($currentVersion -match "v$NodeVersion") {
            Write-Info "Node.js 版本符合要求"
            return
        }
    }

    Write-Info "安装 Node.js $NodeVersion..."
    
    # 使用 nvm-windows 管理 Node.js 版本
    if (-not (Test-Command "nvm")) {
        choco install nvm -y
        # 刷新环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    }
    
    nvm install $NodeVersion
    nvm use $NodeVersion
    
    Write-Success "Node.js $NodeVersion 安装完成"
}

# 安装全局 npm 包
function Install-GlobalPackages {
    Write-Info "安装全局 npm 包..."
    
    $globalPackages = @(
        "@typescript-eslint/eslint-plugin",
        "@typescript-eslint/parser",
        "eslint",
        "prettier",
        "typescript",
        "ts-node",
        "nodemon",
        "concurrently",
        "cross-env",
        "rimraf",
        "husky",
        "lint-staged"
    )
    
    foreach ($package in $globalPackages) {
        Write-Info "安装 $package..."
        npm install -g $package
    }
    
    Write-Success "全局 npm 包安装完成"
}

# 安装项目依赖
function Install-ProjectDependencies {
    if ($SkipDependencies) {
        Write-Info "跳过项目依赖安装"
        return
    }

    Write-Info "安装前端依赖..."
    if (Test-Path "frontend/package.json") {
        Set-Location "frontend"
        npm install
        Set-Location ".."
        Write-Success "前端依赖安装完成"
    } else {
        Write-Warning "未找到前端 package.json 文件"
    }

    Write-Info "安装后端依赖..."
    if (Test-Path "backend/package.json") {
        Set-Location "backend"
        npm install
        Set-Location ".."
        Write-Success "后端依赖安装完成"
    } else {
        Write-Warning "未找到后端 package.json 文件"
    }
}

# 设置 Git Hooks
function Setup-GitHooks {
    if ($SkipHooks) {
        Write-Info "跳过 Git Hooks 设置"
        return
    }

    Write-Info "设置 Git Hooks..."
    
    # 初始化 husky
    if (Test-Path ".husky") {
        Write-Info "Husky 已初始化"
    } else {
        npx husky-init
        npm install
    }
    
    # 设置 pre-commit hook
    $preCommitContent = @'
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 前端检查
if [ -d "frontend" ]; then
  echo "🔍 检查前端代码..."
  cd frontend
  npm run lint
  npm run type-check
  cd ..
fi

# 后端检查
if [ -d "backend" ]; then
  echo "🔍 检查后端代码..."
  cd backend
  npm run lint
  npm run type-check
  cd ..
fi

echo "✅ 代码检查通过"
'@
    
    $preCommitContent | Out-File -FilePath ".husky/pre-commit" -Encoding UTF8
    
    Write-Success "Git Hooks 设置完成"
}

# 设置数据库
function Setup-Database {
    if ($SkipDatabase) {
        Write-Info "跳过数据库设置"
        return
    }

    Write-Info "设置数据库..."
    
    # 检查 PostgreSQL
    if (-not (Test-Command "psql")) {
        Write-Info "安装 PostgreSQL..."
        choco install postgresql -y
        
        # 刷新环境变量
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    }
    
    # 检查 Redis
    if (-not (Test-Command "redis-server")) {
        Write-Info "安装 Redis..."
        choco install redis-64 -y
    }
    
    # 运行数据库迁移
    if (Test-Path "backend/prisma/schema.prisma") {
        Write-Info "运行数据库迁移..."
        Set-Location "backend"
        npx prisma generate
        npx prisma db push
        Set-Location ".."
        Write-Success "数据库迁移完成"
    }
    
    Write-Success "数据库设置完成"
}

# 创建开发配置文件
function Create-DevelopmentConfig {
    Write-Info "创建开发配置文件..."
    
    # 前端环境变量
    if (Test-Path "frontend") {
        $frontendEnv = @'
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_ENVIRONMENT=development
REACT_APP_SENTRY_DSN=
REACT_APP_GOOGLE_ANALYTICS_ID=
'@
        
        if (-not (Test-Path "frontend/.env.local")) {
            $frontendEnv | Out-File -FilePath "frontend/.env.local" -Encoding UTF8
            Write-Success "前端环境变量文件创建完成"
        }
    }
    
    # 后端环境变量
    if (Test-Path "backend") {
        $backendEnv = @'
NODE_ENV=development
PORT=3001
DATABASE_URL="postgresql://postgres:password@localhost:5432/myapp_dev"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-jwt-secret-key"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:3000"
'@
        
        if (-not (Test-Path "backend/.env.local")) {
            $backendEnv | Out-File -FilePath "backend/.env.local" -Encoding UTF8
            Write-Success "后端环境变量文件创建完成"
        }
    }
}

# 创建开发脚本
function Create-DevelopmentScripts {
    Write-Info "创建开发脚本..."
    
    # 启动脚本
    $startScript = @'
#!/usr/bin/env pwsh
# 启动开发服务器

Write-Host "🚀 启动开发环境..." -ForegroundColor Green

# 启动后端服务器
Start-Job -Name "Backend" -ScriptBlock {
    Set-Location "backend"
    npm run dev
}

# 启动前端服务器
Start-Job -Name "Frontend" -ScriptBlock {
    Set-Location "frontend"
    npm start
}

Write-Host "✅ 开发服务器已启动" -ForegroundColor Green
Write-Host "前端: http://localhost:3000" -ForegroundColor Cyan
Write-Host "后端: http://localhost:3001" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Yellow

# 等待用户输入
Read-Host "按 Enter 键停止所有服务器"

# 停止所有任务
Get-Job | Stop-Job
Get-Job | Remove-Job
'@
    
    $startScript | Out-File -FilePath "scripts/start-dev.ps1" -Encoding UTF8
    
    # 测试脚本
    $testScript = @'
#!/usr/bin/env pwsh
# 运行所有测试

Write-Host "🧪 运行测试..." -ForegroundColor Green

# 前端测试
if (Test-Path "frontend") {
    Write-Host "运行前端测试..." -ForegroundColor Cyan
    Set-Location "frontend"
    npm test -- --coverage --watchAll=false
    Set-Location ".."
}

# 后端测试
if (Test-Path "backend") {
    Write-Host "运行后端测试..." -ForegroundColor Cyan
    Set-Location "backend"
    npm test -- --coverage
    Set-Location ".."
}

Write-Host "✅ 测试完成" -ForegroundColor Green
'@
    
    $testScript | Out-File -FilePath "scripts/run-tests.ps1" -Encoding UTF8
    
    # 构建脚本
    $buildScript = @'
#!/usr/bin/env pwsh
# 构建项目

Write-Host "🔨 构建项目..." -ForegroundColor Green

# 构建前端
if (Test-Path "frontend") {
    Write-Host "构建前端..." -ForegroundColor Cyan
    Set-Location "frontend"
    npm run build
    Set-Location ".."
}

# 构建后端
if (Test-Path "backend") {
    Write-Host "构建后端..." -ForegroundColor Cyan
    Set-Location "backend"
    npm run build
    Set-Location ".."
}

Write-Host "✅ 构建完成" -ForegroundColor Green
'@
    
    $buildScript | Out-File -FilePath "scripts/build.ps1" -Encoding UTF8
    
    Write-Success "开发脚本创建完成"
}

# 验证安装
function Test-Installation {
    Write-Info "验证安装..."
    
    $errors = @()
    
    # 检查 Node.js
    if (-not (Test-Command "node")) {
        $errors += "Node.js 未安装"
    } else {
        $nodeVersion = node --version
        Write-Success "Node.js 版本: $nodeVersion"
    }
    
    # 检查 npm
    if (-not (Test-Command "npm")) {
        $errors += "npm 未安装"
    } else {
        $npmVersion = npm --version
        Write-Success "npm 版本: $npmVersion"
    }
    
    # 检查 Git
    if (-not (Test-Command "git")) {
        $errors += "Git 未安装"
    } else {
        $gitVersion = git --version
        Write-Success "Git 版本: $gitVersion"
    }
    
    # 检查项目依赖
    if (Test-Path "frontend/node_modules") {
        Write-Success "前端依赖已安装"
    } else {
        $errors += "前端依赖未安装"
    }
    
    if (Test-Path "backend/node_modules") {
        Write-Success "后端依赖已安装"
    } else {
        $errors += "后端依赖未安装"
    }
    
    if ($errors.Count -eq 0) {
        Write-Success "✅ 所有检查通过！开发环境设置完成"
        Write-Info "使用以下命令启动开发服务器:"
        Write-Info "  .\scripts\start-dev.ps1"
    } else {
        Write-Error "❌ 发现以下问题:"
        foreach ($error in $errors) {
            Write-Error "  - $error"
        }
    }
}

# 主函数
function Main {
    Write-ColorOutput "🚀 开始设置开发环境..." "Green"
    Write-ColorOutput "=" * 50 "Gray"
    
    try {
        # 检查管理员权限
        if (-not (Test-Administrator)) {
            Write-Warning "建议以管理员身份运行此脚本以避免权限问题"
            $continue = Read-Host "是否继续? (y/N)"
            if ($continue -ne "y" -and $continue -ne "Y") {
                Write-Info "脚本已取消"
                return
            }
        }
        
        # 创建必要的目录
        if (-not (Test-Path "scripts")) {
            New-Item -ItemType Directory -Path "scripts" | Out-Null
        }
        
        # 执行安装步骤
        Install-Chocolatey
        Install-NodeJS
        Install-GlobalPackages
        Install-ProjectDependencies
        Setup-GitHooks
        Setup-Database
        Create-DevelopmentConfig
        Create-DevelopmentScripts
        
        # 验证安装
        Test-Installation
        
        Write-ColorOutput "=" * 50 "Gray"
        Write-Success "🎉 开发环境设置完成！"
        
    } catch {
        Write-Error "❌ 设置过程中出现错误: $($_.Exception.Message)"
        Write-Error "请检查错误信息并重新运行脚本"
        exit 1
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host @'
开发环境自动化设置脚本

用法:
  .\setup-development.ps1 [选项]

选项:
  -SkipNodeInstall     跳过 Node.js 安装
  -SkipDependencies    跳过项目依赖安装
  -SkipHooks          跳过 Git Hooks 设置
  -SkipDatabase       跳过数据库设置
  -NodeVersion        指定 Node.js 版本 (默认: 18.17.0)
  -Help               显示此帮助信息

示例:
  .\setup-development.ps1
  .\setup-development.ps1 -SkipDatabase
  .\setup-development.ps1 -NodeVersion "20.0.0"
'@
}

# 检查是否请求帮助
if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "-h") {
    Show-Help
    return
}

# 运行主函数
Main