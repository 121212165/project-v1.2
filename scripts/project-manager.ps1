# 项目管理脚本
# 统一管理开发环境、代码质量、知识库等所有项目相关任务

param(
    [string]$Action = "help",  # help, init, dev, build, test, deploy, clean, status, docs
    [string]$Target = "all",   # all, frontend, backend
    [string]$Environment = "development",  # development, testing, production
    [string]$Component = "",   # 具体组件或模块
    [switch]$Force,
    [switch]$Verbose,
    [switch]$DryRun,
    [switch]$Watch,
    [switch]$Coverage,
    [switch]$Analyze
)

# 设置错误处理
$ErrorActionPreference = "Stop"

# 导入项目配置
$ProjectConfigPath = "project.config.json"
if (Test-Path $ProjectConfigPath) {
    $ProjectConfig = Get-Content $ProjectConfigPath | ConvertFrom-Json
} else {
    Write-Warning "项目配置文件不存在: $ProjectConfigPath"
    $ProjectConfig = $null
}

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

function Write-Debug {
    param([string]$Message)
    if ($Verbose) {
        Write-ColorOutput "🔍 $Message" "Gray"
    }
}

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🚀 $Message" "Magenta"
}

# 检查命令是否存在
function Test-Command {
    param([string]$Command)
    
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

# 执行命令并处理错误
function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Arguments = "",
        [string]$WorkingDirectory = (Get-Location),
        [string]$Description = "",
        [switch]$IgnoreErrors
    )
    
    if ($Description) {
        Write-Debug "执行: $Description"
    }
    
    $fullCommand = if ($Arguments) { "$Command $Arguments" } else { $Command }
    Write-Debug "命令: $fullCommand"
    Write-Debug "工作目录: $WorkingDirectory"
    
    if ($DryRun) {
        Write-Info "[DRY RUN] 将执行: $fullCommand"
        return $true
    }
    
    try {
        Push-Location $WorkingDirectory
        
        if ($Arguments) {
            $result = & $Command $Arguments.Split(' ')
        } else {
            $result = & $Command
        }
        
        if ($LASTEXITCODE -ne 0 -and -not $IgnoreErrors) {
            throw "命令执行失败，退出码: $LASTEXITCODE"
        }
        
        return $true
    } catch {
        if ($IgnoreErrors) {
            Write-Warning "命令执行失败但被忽略: $($_.Exception.Message)"
            return $false
        } else {
            Write-Error "命令执行失败: $($_.Exception.Message)"
            throw
        }
    } finally {
        Pop-Location
    }
}

# 检查项目环境
function Test-ProjectEnvironment {
    Write-Step "检查项目环境"
    
    $issues = @()
    
    # 检查 Node.js
    if (-not (Test-Command "node")) {
        $issues += "Node.js 未安装"
    } else {
        $nodeVersion = node --version
        Write-Debug "Node.js 版本: $nodeVersion"
    }
    
    # 检查 npm
    if (-not (Test-Command "npm")) {
        $issues += "npm 未安装"
    } else {
        $npmVersion = npm --version
        Write-Debug "npm 版本: $npmVersion"
    }
    
    # 检查 Git
    if (-not (Test-Command "git")) {
        $issues += "Git 未安装"
    } else {
        $gitVersion = git --version
        Write-Debug "Git 版本: $gitVersion"
    }
    
    # 检查项目文件
    $requiredFiles = @(
        "package.json",
        "frontend/package.json",
        "backend/package.json"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            $issues += "缺少文件: $file"
        }
    }
    
    # 检查环境变量文件
    if (-not (Test-Path ".env.local") -and -not (Test-Path ".env")) {
        $issues += "缺少环境变量文件 (.env.local 或 .env)"
    }
    
    if ($issues.Count -eq 0) {
        Write-Success "项目环境检查通过"
        return $true
    } else {
        Write-Error "项目环境检查失败:"
        foreach ($issue in $issues) {
            Write-Error "  - $issue"
        }
        return $false
    }
}

# 初始化项目
function Initialize-Project {
    Write-Step "初始化项目"
    
    # 检查环境
    if (-not (Test-ProjectEnvironment)) {
        Write-Error "环境检查失败，请先解决环境问题"
        return $false
    }
    
    # 运行开发环境设置脚本
    if (Test-Path "scripts/setup-development.ps1") {
        Write-Info "运行开发环境设置脚本"
        & "scripts/setup-development.ps1" -Force:$Force -Verbose:$Verbose
    }
    
    # 安装依赖
    Install-Dependencies
    
    # 设置数据库
    Setup-Database
    
    # 生成配置文件
    Generate-ConfigFiles
    
    # 初始化知识库
    Initialize-KnowledgeBase
    
    Write-Success "项目初始化完成"
}

# 安装依赖
function Install-Dependencies {
    Write-Step "安装项目依赖"
    
    if ($Target -eq "all" -or $Target -eq "frontend") {
        Write-Info "安装前端依赖"
        Invoke-SafeCommand "npm" "install" "frontend" "安装前端依赖"
    }
    
    if ($Target -eq "all" -or $Target -eq "backend") {
        Write-Info "安装后端依赖"
        Invoke-SafeCommand "npm" "install" "backend" "安装后端依赖"
    }
    
    # 安装全局工具
    if ($Target -eq "all") {
        Write-Info "安装全局开发工具"
        $globalTools = @(
            "@prisma/cli",
            "concurrently",
            "nodemon",
            "typescript",
            "ts-node"
        )
        
        foreach ($tool in $globalTools) {
            Invoke-SafeCommand "npm" "install -g $tool" "." "安装全局工具: $tool" -IgnoreErrors
        }
    }
}

# 设置数据库
function Setup-Database {
    Write-Step "设置数据库"
    
    if ($Target -ne "all" -and $Target -ne "backend") {
        Write-Debug "跳过数据库设置 (目标: $Target)"
        return
    }
    
    # 检查 Prisma
    if (-not (Test-Path "backend/prisma/schema.prisma")) {
        Write-Warning "Prisma schema 文件不存在，跳过数据库设置"
        return
    }
    
    Write-Info "生成 Prisma 客户端"
    Invoke-SafeCommand "npx" "prisma generate" "backend" "生成 Prisma 客户端"
    
    if ($Environment -eq "development") {
        Write-Info "运行数据库迁移"
        Invoke-SafeCommand "npx" "prisma migrate dev" "backend" "运行数据库迁移" -IgnoreErrors
        
        Write-Info "填充种子数据"
        Invoke-SafeCommand "npx" "prisma db seed" "backend" "填充种子数据" -IgnoreErrors
    }
}

# 生成配置文件
function Generate-ConfigFiles {
    Write-Step "生成配置文件"
    
    # 生成环境变量文件
    if (-not (Test-Path ".env.local") -and (Test-Path ".env.example")) {
        Write-Info "生成环境变量文件"
        Copy-Item ".env.example" ".env.local"
        Write-Warning "请编辑 .env.local 文件配置实际的环境变量"
    }
    
    # 生成 TypeScript 配置
    if ($Target -eq "all" -or $Target -eq "frontend") {
        if (-not (Test-Path "frontend/tsconfig.json") -and (Test-Path "tsconfig.strict.json")) {
            Write-Info "生成前端 TypeScript 配置"
            Copy-Item "tsconfig.strict.json" "frontend/tsconfig.json"
        }
    }
    
    if ($Target -eq "all" -or $Target -eq "backend") {
        if (-not (Test-Path "backend/tsconfig.json") -and (Test-Path "tsconfig.strict.json")) {
            Write-Info "生成后端 TypeScript 配置"
            Copy-Item "tsconfig.strict.json" "backend/tsconfig.json"
        }
    }
}

# 初始化知识库
function Initialize-KnowledgeBase {
    Write-Step "初始化知识库"
    
    if (Test-Path "scripts/knowledge-manager.ps1") {
        Write-Info "重建知识库索引"
        & "scripts/knowledge-manager.ps1" -Action index -Verbose:$Verbose
    }
}

# 启动开发服务器
function Start-Development {
    Write-Step "启动开发环境"
    
    # 检查环境
    if (-not (Test-ProjectEnvironment)) {
        Write-Error "环境检查失败，请先运行项目初始化"
        return $false
    }
    
    # 检查依赖
    if (-not (Test-Path "frontend/node_modules") -or -not (Test-Path "backend/node_modules")) {
        Write-Info "检测到缺少依赖，正在安装..."
        Install-Dependencies
    }
    
    # 启动服务
    switch ($Target) {
        "frontend" {
            Write-Info "启动前端开发服务器"
            Invoke-SafeCommand "npm" "start" "frontend" "启动前端服务器"
        }
        
        "backend" {
            Write-Info "启动后端开发服务器"
            Invoke-SafeCommand "npm" "run dev" "backend" "启动后端服务器"
        }
        
        "all" {
            Write-Info "启动前后端开发服务器"
            if (Test-Command "concurrently") {
                Invoke-SafeCommand "concurrently" '"npm run dev:frontend" "npm run dev:backend"' "." "启动开发服务器"
            } else {
                Write-Warning "concurrently 未安装，请手动启动前后端服务器"
                Write-Info "前端: cd frontend && npm start"
                Write-Info "后端: cd backend && npm run dev"
            }
        }
    }
}

# 运行测试
function Invoke-Tests {
    Write-Step "运行测试"
    
    $testResults = @()
    
    if ($Target -eq "all" -or $Target -eq "frontend") {
        Write-Info "运行前端测试"
        
        $testCommand = "npm test"
        if ($Coverage) {
            $testCommand += " -- --coverage"
        }
        if ($Watch) {
            $testCommand += " -- --watch"
        }
        
        $result = Invoke-SafeCommand "npm" "test" "frontend" "运行前端测试" -IgnoreErrors
        $testResults += @{ Target = "frontend"; Success = $result }
    }
    
    if ($Target -eq "all" -or $Target -eq "backend") {
        Write-Info "运行后端测试"
        
        $testCommand = "npm test"
        if ($Coverage) {
            $testCommand += " -- --coverage"
        }
        
        $result = Invoke-SafeCommand "npm" "test" "backend" "运行后端测试" -IgnoreErrors
        $testResults += @{ Target = "backend"; Success = $result }
    }
    
    # 输出测试结果
    Write-Info "测试结果汇总:"
    foreach ($result in $testResults) {
        if ($result.Success) {
            Write-Success "$($result.Target): 通过"
        } else {
            Write-Error "$($result.Target): 失败"
        }
    }
    
    $allPassed = ($testResults | Where-Object { -not $_.Success }).Count -eq 0
    return $allPassed
}

# 构建项目
function Build-Project {
    Write-Step "构建项目"
    
    $buildResults = @()
    
    if ($Target -eq "all" -or $Target -eq "frontend") {
        Write-Info "构建前端"
        
        $buildCommand = "npm run build"
        if ($Analyze) {
            $buildCommand += " -- --analyze"
        }
        
        $result = Invoke-SafeCommand "npm" "run build" "frontend" "构建前端" -IgnoreErrors
        $buildResults += @{ Target = "frontend"; Success = $result }
    }
    
    if ($Target -eq "all" -or $Target -eq "backend") {
        Write-Info "构建后端"
        
        $result = Invoke-SafeCommand "npm" "run build" "backend" "构建后端" -IgnoreErrors
        $buildResults += @{ Target = "backend"; Success = $result }
    }
    
    # 输出构建结果
    Write-Info "构建结果汇总:"
    foreach ($result in $buildResults) {
        if ($result.Success) {
            Write-Success "$($result.Target): 成功"
        } else {
            Write-Error "$($result.Target): 失败"
        }
    }
    
    $allPassed = ($buildResults | Where-Object { -not $_.Success }).Count -eq 0
    return $allPassed
}

# 运行代码质量检查
function Invoke-QualityCheck {
    Write-Step "运行代码质量检查"
    
    if (Test-Path "scripts/quality-check.ps1") {
        $args = @(
            "-Target", $Target,
            "-Verbose:", $Verbose
        )
        
        if ($Force) {
            $args += "-AutoFix"
        }
        
        & "scripts/quality-check.ps1" @args
    } else {
        Write-Warning "质量检查脚本不存在: scripts/quality-check.ps1"
    }
}

# 清理项目
function Clear-Project {
    Write-Step "清理项目"
    
    $cleanTargets = @()
    
    if ($Target -eq "all" -or $Target -eq "frontend") {
        $cleanTargets += @{
            Name = "前端"
            Path = "frontend"
            Directories = @("node_modules", "build", "dist", ".next")
            Files = @("package-lock.json")
        }
    }
    
    if ($Target -eq "all" -or $Target -eq "backend") {
        $cleanTargets += @{
            Name = "后端"
            Path = "backend"
            Directories = @("node_modules", "dist", "build")
            Files = @("package-lock.json")
        }
    }
    
    foreach ($target in $cleanTargets) {
        Write-Info "清理 $($target.Name)"
        
        foreach ($dir in $target.Directories) {
            $fullPath = Join-Path $target.Path $dir
            if (Test-Path $fullPath) {
                Write-Debug "删除目录: $fullPath"
                if (-not $DryRun) {
                    Remove-Item $fullPath -Recurse -Force
                }
            }
        }
        
        foreach ($file in $target.Files) {
            $fullPath = Join-Path $target.Path $file
            if (Test-Path $fullPath) {
                Write-Debug "删除文件: $fullPath"
                if (-not $DryRun) {
                    Remove-Item $fullPath -Force
                }
            }
        }
    }
    
    # 清理日志文件
    if (Test-Path "logs") {
        Write-Info "清理日志文件"
        if (-not $DryRun) {
            Get-ChildItem "logs" -Filter "*.log" | Remove-Item -Force
        }
    }
    
    Write-Success "项目清理完成"
}

# 显示项目状态
function Show-ProjectStatus {
    Write-Step "项目状态检查"
    
    # 基本信息
    if ($ProjectConfig) {
        Write-Info "项目名称: $($ProjectConfig.project.name)"
        Write-Info "项目版本: $($ProjectConfig.project.version)"
        Write-Info "项目描述: $($ProjectConfig.project.description)"
    }
    
    # 环境检查
    Write-Info "\n=== 环境状态 ==="
    Test-ProjectEnvironment | Out-Null
    
    # 依赖状态
    Write-Info "\n=== 依赖状态 ==="
    
    $dependencies = @(
        @{ Name = "前端依赖"; Path = "frontend/node_modules" },
        @{ Name = "后端依赖"; Path = "backend/node_modules" }
    )
    
    foreach ($dep in $dependencies) {
        if (Test-Path $dep.Path) {
            Write-Success "$($dep.Name): 已安装"
        } else {
            Write-Warning "$($dep.Name): 未安装"
        }
    }
    
    # 配置文件状态
    Write-Info "\n=== 配置文件状态 ==="
    
    $configFiles = @(
        @{ Name = "环境变量"; Path = ".env.local" },
        @{ Name = "项目配置"; Path = "project.config.json" },
        @{ Name = "ESLint 配置"; Path = ".eslintrc.js" },
        @{ Name = "TypeScript 配置"; Path = "tsconfig.strict.json" }
    )
    
    foreach ($config in $configFiles) {
        if (Test-Path $config.Path) {
            Write-Success "$($config.Name): 存在"
        } else {
            Write-Warning "$($config.Name): 不存在"
        }
    }
    
    # 服务状态
    Write-Info "\n=== 服务状态 ==="
    
    # 检查端口占用
    $ports = @(
        @{ Name = "前端服务"; Port = 3000 },
        @{ Name = "后端服务"; Port = 3001 },
        @{ Name = "数据库"; Port = 5432 },
        @{ Name = "Redis"; Port = 6379 }
    )
    
    foreach ($port in $ports) {
        try {
            $connection = Test-NetConnection -ComputerName "localhost" -Port $port.Port -WarningAction SilentlyContinue
            if ($connection.TcpTestSucceeded) {
                Write-Success "$($port.Name) (端口 $($port.Port)): 运行中"
            } else {
                Write-Warning "$($port.Name) (端口 $($port.Port)): 未运行"
            }
        } catch {
            Write-Warning "$($port.Name) (端口 $($port.Port)): 检查失败"
        }
    }
    
    # Git 状态
    Write-Info "\n=== Git 状态 ==="
    
    if (Test-Command "git") {
        try {
            $branch = git branch --show-current
            $status = git status --porcelain
            
            Write-Info "当前分支: $branch"
            
            if ($status) {
                Write-Warning "有未提交的更改:"
                $status | ForEach-Object { Write-Warning "  $_" }
            } else {
                Write-Success "工作目录干净"
            }
        } catch {
            Write-Warning "无法获取 Git 状态"
        }
    }
    
    # 知识库状态
    Write-Info "\n=== 知识库状态 ==="
    
    if (Test-Path "scripts/knowledge-manager.ps1") {
        & "scripts/knowledge-manager.ps1" -Action validate -Verbose:$false
    } else {
        Write-Warning "知识库管理脚本不存在"
    }
}

# 生成文档
function Generate-Documentation {
    Write-Step "生成项目文档"
    
    # 生成 API 文档
    if ($Target -eq "all" -or $Target -eq "backend") {
        Write-Info "生成 API 文档"
        # 这里可以集成 Swagger 或其他 API 文档生成工具
    }
    
    # 更新知识库
    if (Test-Path "scripts/knowledge-manager.ps1") {
        Write-Info "更新知识库索引"
        & "scripts/knowledge-manager.ps1" -Action index -Verbose:$Verbose
        
        Write-Info "导出知识库"
        & "scripts/knowledge-manager.ps1" -Action export -OutputFormat markdown -Verbose:$Verbose
    }
    
    # 生成依赖报告
    Write-Info "生成依赖报告"
    if ($Target -eq "all" -or $Target -eq "frontend") {
        Invoke-SafeCommand "npm" "list --depth=0" "frontend" "生成前端依赖报告" -IgnoreErrors
    }
    
    if ($Target -eq "all" -or $Target -eq "backend") {
        Invoke-SafeCommand "npm" "list --depth=0" "backend" "生成后端依赖报告" -IgnoreErrors
    }
    
    Write-Success "文档生成完成"
}

# 主函数
function Main {
    Write-Info "项目管理脚本 - $(if ($ProjectConfig.project.name) { $ProjectConfig.project.name } else { '未知项目' })"
    Write-Info "操作: $Action | 目标: $Target | 环境: $Environment"
    
    if ($DryRun) {
        Write-Warning "运行在 DRY RUN 模式，不会执行实际操作"
    }
    
    switch ($Action.ToLower()) {
        "init" {
            Initialize-Project
        }
        
        "dev" {
            Start-Development
        }
        
        "test" {
            Invoke-Tests
        }
        
        "build" {
            Build-Project
        }
        
        "quality" {
            Invoke-QualityCheck
        }
        
        "clean" {
            Clear-Project
        }
        
        "status" {
            Show-ProjectStatus
        }
        
        "docs" {
            Generate-Documentation
        }
        
        "deploy" {
            Write-Info "部署功能正在开发中"
            # 这里可以添加部署逻辑
        }
        
        "help" {
            Show-Help
        }
        
        default {
            Write-Error "未知操作: $Action"
            Show-Help
        }
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host @'
项目管理脚本

用法:
  .\project-manager.ps1 -Action <action> [选项]

操作:
  init                    初始化项目环境
  dev                     启动开发环境
  test                    运行测试
  build                   构建项目
  quality                 运行代码质量检查
  clean                   清理项目文件
  status                  显示项目状态
  docs                    生成文档
  deploy                  部署项目
  help                    显示帮助信息

选项:
  -Target <target>        目标 (all, frontend, backend)
  -Environment <env>      环境 (development, testing, production)
  -Component <name>       特定组件或模块
  -Force                  强制执行操作
  -Verbose                显示详细信息
  -DryRun                 模拟执行，不进行实际操作
  -Watch                  监视模式 (适用于测试)
  -Coverage               生成覆盖率报告 (适用于测试)
  -Analyze                分析构建结果 (适用于构建)

示例:
  .\project-manager.ps1 -Action init
  .\project-manager.ps1 -Action dev -Target frontend
  .\project-manager.ps1 -Action test -Coverage
  .\project-manager.ps1 -Action build -Target all -Analyze
  .\project-manager.ps1 -Action quality -Force
  .\project-manager.ps1 -Action clean -Target backend
  .\project-manager.ps1 -Action status -Verbose
  .\project-manager.ps1 -Action docs

环境变量:
  PROJECT_ENV             项目环境 (覆盖 -Environment)
  PROJECT_TARGET          项目目标 (覆盖 -Target)
  PROJECT_VERBOSE         详细模式 (覆盖 -Verbose)

配置文件:
  project.config.json     项目主配置文件
  .env.local              本地环境变量
  .env.example            环境变量模板
'@
}

# 运行主函数
Main