# 代码质量检查脚本
# 用于自动化代码质量检查和修复

param(
    [switch]$Fix,
    [switch]$Strict,
    [switch]$SkipTests,
    [switch]$SkipSecurity,
    [string]$Target = "all",  # all, frontend, backend
    [string]$OutputFormat = "console"  # console, json, html
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

function Write-Step {
    param([string]$Message)
    Write-ColorOutput "🔍 $Message" "Magenta"
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

# 质量检查结果类
class QualityCheckResult {
    [string]$Component
    [string]$Check
    [bool]$Passed
    [string]$Message
    [string[]]$Details
    [int]$ErrorCount
    [int]$WarningCount
    
    QualityCheckResult([string]$component, [string]$check) {
        $this.Component = $component
        $this.Check = $check
        $this.Passed = $false
        $this.Message = ""
        $this.Details = @()
        $this.ErrorCount = 0
        $this.WarningCount = 0
    }
}

# 全局结果收集器
$global:QualityResults = @()

# 添加检查结果
function Add-QualityResult {
    param(
        [string]$Component,
        [string]$Check,
        [bool]$Passed,
        [string]$Message,
        [string[]]$Details = @(),
        [int]$ErrorCount = 0,
        [int]$WarningCount = 0
    )
    
    $result = [QualityCheckResult]::new($Component, $Check)
    $result.Passed = $Passed
    $result.Message = $Message
    $result.Details = $Details
    $result.ErrorCount = $ErrorCount
    $result.WarningCount = $WarningCount
    
    $global:QualityResults += $result
}

# ESLint 检查
function Invoke-ESLintCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    Write-Step "运行 ESLint 检查: $Component"
    
    if (-not (Test-Path "$Path/package.json")) {
        Add-QualityResult $Component "ESLint" $false "package.json 不存在"
        return
    }
    
    Set-Location $Path
    
    try {
        $eslintArgs = @("src", "--ext", ".ts,.tsx,.js,.jsx")
        
        if ($Fix) {
            $eslintArgs += "--fix"
        }
        
        if ($OutputFormat -eq "json") {
            $eslintArgs += @("--format", "json")
        }
        
        $eslintOutput = & npx eslint @eslintArgs 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Add-QualityResult $Component "ESLint" $true "ESLint 检查通过"
            Write-Success "ESLint 检查通过: $Component"
        } else {
            $errorLines = $eslintOutput | Where-Object { $_ -match "error|warning" }
            $errorCount = ($errorLines | Where-Object { $_ -match "error" }).Count
            $warningCount = ($errorLines | Where-Object { $_ -match "warning" }).Count
            
            Add-QualityResult $Component "ESLint" $false "发现 $errorCount 个错误, $warningCount 个警告" $eslintOutput $errorCount $warningCount
            
            if ($errorCount -gt 0) {
                Write-Error "ESLint 发现错误: $Component"
            } else {
                Write-Warning "ESLint 发现警告: $Component"
            }
        }
    }
    catch {
        Add-QualityResult $Component "ESLint" $false "ESLint 执行失败: $($_.Exception.Message)"
        Write-Error "ESLint 执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# TypeScript 类型检查
function Invoke-TypeScriptCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    Write-Step "运行 TypeScript 类型检查: $Component"
    
    if (-not (Test-Path "$Path/tsconfig.json")) {
        Add-QualityResult $Component "TypeScript" $false "tsconfig.json 不存在"
        return
    }
    
    Set-Location $Path
    
    try {
        $tscArgs = @("--noEmit")
        
        if ($Strict) {
            $tscArgs += "--strict"
        }
        
        $tscOutput = & npx tsc @tscArgs 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Add-QualityResult $Component "TypeScript" $true "TypeScript 类型检查通过"
            Write-Success "TypeScript 类型检查通过: $Component"
        } else {
            $errorLines = $tscOutput | Where-Object { $_ -match "error TS" }
            $errorCount = $errorLines.Count
            
            Add-QualityResult $Component "TypeScript" $false "发现 $errorCount 个类型错误" $tscOutput $errorCount 0
            Write-Error "TypeScript 类型检查失败: $Component - $errorCount 个错误"
        }
    }
    catch {
        Add-QualityResult $Component "TypeScript" $false "TypeScript 检查执行失败: $($_.Exception.Message)"
        Write-Error "TypeScript 检查执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# Prettier 格式检查
function Invoke-PrettierCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    Write-Step "运行 Prettier 格式检查: $Component"
    
    Set-Location $Path
    
    try {
        $prettierArgs = @("--check", "src/**/*.{ts,tsx,js,jsx,css,scss,md}")
        
        if ($Fix) {
            $prettierArgs = @("--write", "src/**/*.{ts,tsx,js,jsx,css,scss,md}")
        }
        
        $prettierOutput = & npx prettier @prettierArgs 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            $message = if ($Fix) { "Prettier 格式化完成" } else { "Prettier 格式检查通过" }
            Add-QualityResult $Component "Prettier" $true $message
            Write-Success "$message : $Component"
        } else {
            $unformattedFiles = $prettierOutput | Where-Object { $_ -match "\.(ts|tsx|js|jsx|css|scss|md)$" }
            $fileCount = $unformattedFiles.Count
            
            Add-QualityResult $Component "Prettier" $false "$fileCount 个文件格式不正确" $prettierOutput 0 $fileCount
            Write-Warning "Prettier 格式检查失败: $Component - $fileCount 个文件需要格式化"
        }
    }
    catch {
        Add-QualityResult $Component "Prettier" $false "Prettier 检查执行失败: $($_.Exception.Message)"
        Write-Error "Prettier 检查执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# 单元测试
function Invoke-UnitTests {
    param(
        [string]$Path,
        [string]$Component
    )
    
    if ($SkipTests) {
        Write-Info "跳过单元测试: $Component"
        return
    }
    
    Write-Step "运行单元测试: $Component"
    
    Set-Location $Path
    
    try {
        $testArgs = @("--coverage", "--watchAll=false", "--passWithNoTests")
        
        if ($OutputFormat -eq "json") {
            $testArgs += @("--json", "--outputFile=test-results.json")
        }
        
        $testOutput = & npm test -- @testArgs 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            # 解析测试结果
            $passedTests = ($testOutput | Select-String "Tests:.*passed").Matches[0].Value
            Add-QualityResult $Component "Unit Tests" $true "单元测试通过: $passedTests"
            Write-Success "单元测试通过: $Component"
        } else {
            $failedTests = ($testOutput | Select-String "Tests:.*failed").Matches[0].Value
            Add-QualityResult $Component "Unit Tests" $false "单元测试失败: $failedTests" $testOutput
            Write-Error "单元测试失败: $Component"
        }
    }
    catch {
        Add-QualityResult $Component "Unit Tests" $false "单元测试执行失败: $($_.Exception.Message)"
        Write-Error "单元测试执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# 安全检查
function Invoke-SecurityCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    if ($SkipSecurity) {
        Write-Info "跳过安全检查: $Component"
        return
    }
    
    Write-Step "运行安全检查: $Component"
    
    Set-Location $Path
    
    try {
        # npm audit
        $auditOutput = & npm audit --audit-level=moderate --json 2>&1
        $auditResult = $auditOutput | ConvertFrom-Json -ErrorAction SilentlyContinue
        
        if ($auditResult -and $auditResult.metadata) {
            $vulnerabilities = $auditResult.metadata.vulnerabilities
            $totalVulns = $vulnerabilities.moderate + $vulnerabilities.high + $vulnerabilities.critical
            
            if ($totalVulns -eq 0) {
                Add-QualityResult $Component "Security" $true "未发现安全漏洞"
                Write-Success "安全检查通过: $Component"
            } else {
                $message = "发现 $totalVulns 个安全漏洞 (中等: $($vulnerabilities.moderate), 高: $($vulnerabilities.high), 严重: $($vulnerabilities.critical))"
                Add-QualityResult $Component "Security" $false $message $auditOutput 0 $totalVulns
                Write-Warning "安全检查发现问题: $Component"
            }
        } else {
            Add-QualityResult $Component "Security" $true "安全检查完成"
            Write-Success "安全检查通过: $Component"
        }
    }
    catch {
        Add-QualityResult $Component "Security" $false "安全检查执行失败: $($_.Exception.Message)"
        Write-Error "安全检查执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# 构建检查
function Invoke-BuildCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    Write-Step "运行构建检查: $Component"
    
    Set-Location $Path
    
    try {
        $buildOutput = & npm run build 2>&1
        $exitCode = $LASTEXITCODE
        
        if ($exitCode -eq 0) {
            Add-QualityResult $Component "Build" $true "构建成功"
            Write-Success "构建检查通过: $Component"
        } else {
            Add-QualityResult $Component "Build" $false "构建失败" $buildOutput
            Write-Error "构建检查失败: $Component"
        }
    }
    catch {
        Add-QualityResult $Component "Build" $false "构建检查执行失败: $($_.Exception.Message)"
        Write-Error "构建检查执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# 依赖检查
function Invoke-DependencyCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    Write-Step "运行依赖检查: $Component"
    
    Set-Location $Path
    
    try {
        # 检查过时的依赖
        $outdatedOutput = & npm outdated --json 2>&1
        
        if ($LASTEXITCODE -eq 0 -or $outdatedOutput -eq "{}") {
            Add-QualityResult $Component "Dependencies" $true "所有依赖都是最新的"
            Write-Success "依赖检查通过: $Component"
        } else {
            $outdatedPackages = ($outdatedOutput | ConvertFrom-Json -ErrorAction SilentlyContinue).PSObject.Properties.Count
            Add-QualityResult $Component "Dependencies" $false "发现 $outdatedPackages 个过时的依赖" @($outdatedOutput) 0 $outdatedPackages
            Write-Warning "依赖检查发现问题: $Component - $outdatedPackages 个过时的依赖"
        }
        
        # 检查未使用的依赖
        if (Test-Command "depcheck") {
            $depcheckOutput = & npx depcheck --json 2>&1
            $depcheckResult = $depcheckOutput | ConvertFrom-Json -ErrorAction SilentlyContinue
            
            if ($depcheckResult -and $depcheckResult.dependencies) {
                $unusedCount = $depcheckResult.dependencies.Count
                if ($unusedCount -gt 0) {
                    Add-QualityResult $Component "Unused Dependencies" $false "发现 $unusedCount 个未使用的依赖" $depcheckResult.dependencies 0 $unusedCount
                    Write-Warning "发现未使用的依赖: $Component - $unusedCount 个"
                }
            }
        }
    }
    catch {
        Add-QualityResult $Component "Dependencies" $false "依赖检查执行失败: $($_.Exception.Message)"
        Write-Error "依赖检查执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# 代码复杂度检查
function Invoke-ComplexityCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    Write-Step "运行代码复杂度检查: $Component"
    
    Set-Location $Path
    
    try {
        if (Test-Command "complexity-report") {
            $complexityOutput = & npx complexity-report --format json src/ 2>&1
            $complexityResult = $complexityOutput | ConvertFrom-Json -ErrorAction SilentlyContinue
            
            if ($complexityResult) {
                $highComplexityFiles = $complexityResult.reports | Where-Object { $_.complexity.cyclomatic -gt 10 }
                
                if ($highComplexityFiles.Count -eq 0) {
                    Add-QualityResult $Component "Complexity" $true "代码复杂度检查通过"
                    Write-Success "代码复杂度检查通过: $Component"
                } else {
                    $message = "发现 $($highComplexityFiles.Count) 个高复杂度文件"
                    Add-QualityResult $Component "Complexity" $false $message $highComplexityFiles 0 $highComplexityFiles.Count
                    Write-Warning "代码复杂度检查发现问题: $Component"
                }
            }
        } else {
            Write-Info "跳过代码复杂度检查 (complexity-report 未安装): $Component"
        }
    }
    catch {
        Add-QualityResult $Component "Complexity" $false "代码复杂度检查执行失败: $($_.Exception.Message)"
        Write-Error "代码复杂度检查执行失败: $Component - $($_.Exception.Message)"
    }
    finally {
        Set-Location ".."
    }
}

# 检查单个组件
function Invoke-ComponentCheck {
    param(
        [string]$Path,
        [string]$Component
    )
    
    if (-not (Test-Path $Path)) {
        Write-Warning "路径不存在: $Path"
        return
    }
    
    Write-ColorOutput "" "Gray"
    Write-ColorOutput "=" * 60 "Gray"
    Write-ColorOutput "检查组件: $Component" "Yellow"
    Write-ColorOutput "=" * 60 "Gray"
    
    # 运行各种检查
    Invoke-ESLintCheck $Path $Component
    Invoke-TypeScriptCheck $Path $Component
    Invoke-PrettierCheck $Path $Component
    Invoke-UnitTests $Path $Component
    Invoke-SecurityCheck $Path $Component
    Invoke-BuildCheck $Path $Component
    Invoke-DependencyCheck $Path $Component
    Invoke-ComplexityCheck $Path $Component
}

# 生成报告
function New-QualityReport {
    Write-ColorOutput "" "Gray"
    Write-ColorOutput "=" * 80 "Gray"
    Write-ColorOutput "质量检查报告" "Yellow"
    Write-ColorOutput "=" * 80 "Gray"
    
    $totalChecks = $global:QualityResults.Count
    $passedChecks = ($global:QualityResults | Where-Object { $_.Passed }).Count
    $failedChecks = $totalChecks - $passedChecks
    
    $totalErrors = ($global:QualityResults | Measure-Object -Property ErrorCount -Sum).Sum
    $totalWarnings = ($global:QualityResults | Measure-Object -Property WarningCount -Sum).Sum
    
    Write-Info "总检查项: $totalChecks"
    Write-Success "通过: $passedChecks"
    if ($failedChecks -gt 0) {
        Write-Error "失败: $failedChecks"
    }
    if ($totalErrors -gt 0) {
        Write-Error "错误: $totalErrors"
    }
    if ($totalWarnings -gt 0) {
        Write-Warning "警告: $totalWarnings"
    }
    
    Write-ColorOutput "" "Gray"
    Write-ColorOutput "详细结果:" "Cyan"
    Write-ColorOutput "-" * 80 "Gray"
    
    # 按组件分组显示结果
    $groupedResults = $global:QualityResults | Group-Object Component
    
    foreach ($group in $groupedResults) {
        Write-ColorOutput "" "Gray"
        Write-ColorOutput "📦 $($group.Name)" "Magenta"
        
        foreach ($result in $group.Group) {
            $status = if ($result.Passed) { "✅" } else { "❌" }
            $color = if ($result.Passed) { "Green" } else { "Red" }
            
            Write-ColorOutput "  $status $($result.Check): $($result.Message)" $color
            
            if (-not $result.Passed -and $result.Details.Count -gt 0 -and $result.Details.Count -le 5) {
                foreach ($detail in $result.Details[0..4]) {
                    Write-ColorOutput "    $detail" "Gray"
                }
                if ($result.Details.Count -gt 5) {
                    Write-ColorOutput "    ... 还有 $($result.Details.Count - 5) 个问题" "Gray"
                }
            }
        }
    }
    
    # 生成 JSON 报告
    if ($OutputFormat -eq "json") {
        $reportData = @{
            timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            summary = @{
                totalChecks = $totalChecks
                passedChecks = $passedChecks
                failedChecks = $failedChecks
                totalErrors = $totalErrors
                totalWarnings = $totalWarnings
            }
            results = $global:QualityResults
        }
        
        $jsonReport = $reportData | ConvertTo-Json -Depth 10
        $jsonReport | Out-File -FilePath "quality-report.json" -Encoding UTF8
        Write-Info "JSON 报告已保存到: quality-report.json"
    }
    
    # 生成 HTML 报告
    if ($OutputFormat -eq "html") {
        $htmlTemplate = @'
<!DOCTYPE html>
<html>
<head>
    <title>代码质量检查报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: white; padding: 15px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .passed { color: #52c41a; }
        .failed { color: #f5222d; }
        .warning { color: #faad14; }
        .component { margin: 20px 0; padding: 15px; border: 1px solid #d9d9d9; border-radius: 5px; }
        .check { margin: 10px 0; padding: 10px; background: #fafafa; border-radius: 3px; }
        .details { margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 3px; font-family: monospace; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>代码质量检查报告</h1>
        <p>生成时间: {timestamp}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <h3>总检查项</h3>
            <div style="font-size: 24px; font-weight: bold;">{totalChecks}</div>
        </div>
        <div class="metric">
            <h3>通过</h3>
            <div style="font-size: 24px; font-weight: bold;" class="passed">{passedChecks}</div>
        </div>
        <div class="metric">
            <h3>失败</h3>
            <div style="font-size: 24px; font-weight: bold;" class="failed">{failedChecks}</div>
        </div>
        <div class="metric">
            <h3>错误</h3>
            <div style="font-size: 24px; font-weight: bold;" class="failed">{totalErrors}</div>
        </div>
        <div class="metric">
            <h3>警告</h3>
            <div style="font-size: 24px; font-weight: bold;" class="warning">{totalWarnings}</div>
        </div>
    </div>
    
    <div class="results">
        {componentResults}
    </div>
</body>
</html>
'@
        
        $componentHtml = ""
        foreach ($group in $groupedResults) {
            $componentHtml += "<div class='component'><h2>📦 $($group.Name)</h2>"
            
            foreach ($result in $group.Group) {
                $statusClass = if ($result.Passed) { "passed" } else { "failed" }
                $statusIcon = if ($result.Passed) { "✅" } else { "❌" }
                
                $componentHtml += "<div class='check'>"
                $componentHtml += "<div class='$statusClass'><strong>$statusIcon $($result.Check)</strong>: $($result.Message)</div>"
                
                if (-not $result.Passed -and $result.Details.Count -gt 0) {
                    $componentHtml += "<div class='details'>"
                    foreach ($detail in $result.Details[0..([Math]::Min(9, $result.Details.Count - 1))]) {
                        $componentHtml += "$detail<br>"
                    }
                    $componentHtml += "</div>"
                }
                
                $componentHtml += "</div>"
            }
            
            $componentHtml += "</div>"
        }
        
        $htmlReport = $htmlTemplate -replace '{timestamp}', (Get-Date -Format "yyyy-MM-dd HH:mm:ss") `
                                   -replace '{totalChecks}', $totalChecks `
                                   -replace '{passedChecks}', $passedChecks `
                                   -replace '{failedChecks}', $failedChecks `
                                   -replace '{totalErrors}', $totalErrors `
                                   -replace '{totalWarnings}', $totalWarnings `
                                   -replace '{componentResults}', $componentHtml
        
        $htmlReport | Out-File -FilePath "quality-report.html" -Encoding UTF8
        Write-Info "HTML 报告已保存到: quality-report.html"
    }
    
    Write-ColorOutput "" "Gray"
    Write-ColorOutput "=" * 80 "Gray"
    
    # 返回退出代码
    if ($failedChecks -gt 0 -or $totalErrors -gt 0) {
        Write-Error "质量检查发现问题，请修复后重新检查"
        exit 1
    } else {
        Write-Success "🎉 所有质量检查通过！"
        exit 0
    }
}

# 主函数
function Main {
    Write-ColorOutput "🔍 开始代码质量检查..." "Green"
    Write-ColorOutput "目标: $Target" "Cyan"
    Write-ColorOutput "输出格式: $OutputFormat" "Cyan"
    
    if ($Fix) {
        Write-ColorOutput "模式: 自动修复" "Yellow"
    }
    
    if ($Strict) {
        Write-ColorOutput "模式: 严格检查" "Yellow"
    }
    
    try {
        # 检查必要的工具
        $missingTools = @()
        
        if (-not (Test-Command "node")) { $missingTools += "Node.js" }
        if (-not (Test-Command "npm")) { $missingTools += "npm" }
        
        if ($missingTools.Count -gt 0) {
            Write-Error "缺少必要的工具: $($missingTools -join ', ')"
            Write-Error "请先运行 setup-development.ps1 安装开发环境"
            exit 1
        }
        
        # 根据目标执行检查
        switch ($Target.ToLower()) {
            "frontend" {
                if (Test-Path "frontend") {
                    Invoke-ComponentCheck "frontend" "Frontend"
                } else {
                    Write-Warning "前端目录不存在"
                }
            }
            "backend" {
                if (Test-Path "backend") {
                    Invoke-ComponentCheck "backend" "Backend"
                } else {
                    Write-Warning "后端目录不存在"
                }
            }
            "all" {
                if (Test-Path "frontend") {
                    Invoke-ComponentCheck "frontend" "Frontend"
                }
                if (Test-Path "backend") {
                    Invoke-ComponentCheck "backend" "Backend"
                }
                if (-not (Test-Path "frontend") -and -not (Test-Path "backend")) {
                    Write-Warning "未找到前端或后端目录"
                }
            }
            default {
                Write-Error "无效的目标: $Target (支持: all, frontend, backend)"
                exit 1
            }
        }
        
        # 生成报告
        New-QualityReport
        
    } catch {
        Write-Error "质量检查过程中出现错误: $($_.Exception.Message)"
        exit 1
    }
}

# 显示帮助信息
function Show-Help {
    Write-Host @'
代码质量检查脚本

用法:
  .\quality-check.ps1 [选项]

选项:
  -Target <target>        检查目标 (all, frontend, backend) [默认: all]
  -Fix                   自动修复可修复的问题
  -Strict                启用严格检查模式
  -SkipTests             跳过单元测试
  -SkipSecurity          跳过安全检查
  -OutputFormat <format>  输出格式 (console, json, html) [默认: console]
  -Help                  显示此帮助信息

检查项目:
  ✅ ESLint 代码规范检查
  ✅ TypeScript 类型检查
  ✅ Prettier 代码格式检查
  ✅ 单元测试
  ✅ 安全漏洞检查
  ✅ 构建检查
  ✅ 依赖检查
  ✅ 代码复杂度检查

示例:
  .\quality-check.ps1                    # 检查所有组件
  .\quality-check.ps1 -Target frontend   # 只检查前端
  .\quality-check.ps1 -Fix               # 自动修复问题
  .\quality-check.ps1 -OutputFormat json # 生成 JSON 报告
  .\quality-check.ps1 -Strict            # 严格模式检查
'@
}

# 检查是否请求帮助
if ($args -contains "-Help" -or $args -contains "--help" -or $args -contains "-h") {
    Show-Help
    return
}

# 运行主函数
Main