# 知识库管理脚本
# 用于自动化管理项目知识库，包括文档生成、索引更新、知识检索等

param(
    [string]$Action = "help",  # help, index, search, add, update, validate, export
    [string]$Query = "",
    [string]$FilePath = "",
    [string]$Category = "",
    [string]$Tags = "",
    [string]$OutputFormat = "console",  # console, json, markdown
    [switch]$Force,
    [switch]$Verbose
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

function Write-Debug {
    param([string]$Message)
    if ($Verbose) {
        Write-ColorOutput "🔍 $Message" "Gray"
    }
}

# 知识库配置
$KnowledgeBaseConfig = @{
    RootPath = "docs/knowledge-base"
    IndexFile = "docs/knowledge-base/index.json"
    Categories = @(
        "troubleshooting",
        "best-practices",
        "workflows",
        "api-docs",
        "architecture",
        "deployment",
        "security",
        "performance"
    )
    FileExtensions = @(".md", ".txt", ".json")
    MetadataFields = @(
        "title",
        "description",
        "category",
        "tags",
        "author",
        "created",
        "updated",
        "difficulty",
        "priority"
    )
}

# 知识条目类
class KnowledgeEntry {
    [string]$Id
    [string]$Title
    [string]$Description
    [string]$FilePath
    [string]$Category
    [string[]]$Tags
    [string]$Author
    [datetime]$Created
    [datetime]$Updated
    [string]$Difficulty  # beginner, intermediate, advanced
    [string]$Priority    # low, medium, high, critical
    [string]$Content
    [hashtable]$Metadata
    
    KnowledgeEntry() {
        $this.Id = [System.Guid]::NewGuid().ToString()
        $this.Tags = @()
        $this.Created = Get-Date
        $this.Updated = Get-Date
        $this.Difficulty = "intermediate"
        $this.Priority = "medium"
        $this.Metadata = @{}
    }
}

# 解析文档元数据
function Get-DocumentMetadata {
    param([string]$FilePath)
    
    if (-not (Test-Path $FilePath)) {
        return $null
    }
    
    $content = Get-Content $FilePath -Raw
    $metadata = @{}
    
    # 解析 YAML Front Matter
    if ($content -match '^---\s*\n(.*?)\n---\s*\n(.*)$') {
        $yamlContent = $matches[1]
        $bodyContent = $matches[2]
        
        # 简单的 YAML 解析
        $yamlLines = $yamlContent -split '\n'
        foreach ($line in $yamlLines) {
            if ($line -match '^([^:]+):\s*(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim().Trim('"').Trim("'")
                
                # 处理数组
                if ($value -match '^\[(.*)\]$') {
                    $arrayContent = $matches[1]
                    $metadata[$key] = $arrayContent -split ',' | ForEach-Object { $_.Trim().Trim('"').Trim("'") }
                } else {
                    $metadata[$key] = $value
                }
            }
        }
        
        $metadata['content'] = $bodyContent
    } else {
        # 如果没有 Front Matter，尝试从内容中提取信息
        $metadata['content'] = $content
        
        # 提取标题（第一个 # 标题）
        if ($content -match '^#\s+(.+)$') {
            $metadata['title'] = $matches[1].Trim()
        }
    }
    
    # 添加文件信息
    $fileInfo = Get-Item $FilePath
    $metadata['filepath'] = $FilePath
    $metadata['filename'] = $fileInfo.Name
    $metadata['created'] = $fileInfo.CreationTime
    $metadata['updated'] = $fileInfo.LastWriteTime
    $metadata['size'] = $fileInfo.Length
    
    return $metadata
}

# 创建知识条目
function New-KnowledgeEntry {
    param(
        [string]$FilePath,
        [hashtable]$Metadata = @{}
    )
    
    $entry = [KnowledgeEntry]::new()
    
    # 从文件路径推断类别
    $relativePath = $FilePath -replace [regex]::Escape($KnowledgeBaseConfig.RootPath), ""
    $pathParts = $relativePath -split '[/\\]' | Where-Object { $_ -ne "" }
    
    if ($pathParts.Count -gt 0) {
        $entry.Category = $pathParts[0]
    }
    
    # 设置基本信息
    $entry.FilePath = $FilePath
    $entry.Title = if ($Metadata['title']) { $Metadata['title'] } else { Split-Path $FilePath -LeafBase }
    $entry.Description = if ($Metadata['description']) { $Metadata['description'] } else { "" }
    $entry.Author = if ($Metadata['author']) { $Metadata['author'] } else { $env:USERNAME }
    $entry.Content = if ($Metadata['content']) { $Metadata['content'] } else { "" }
    
    # 设置标签
    if ($Metadata['tags']) {
        if ($Metadata['tags'] -is [array]) {
            $entry.Tags = $Metadata['tags']
        } else {
            $entry.Tags = $Metadata['tags'] -split ',' | ForEach-Object { $_.Trim() }
        }
    }
    
    # 设置其他属性
    if ($Metadata['difficulty']) { $entry.Difficulty = $Metadata['difficulty'] }
    if ($Metadata['priority']) { $entry.Priority = $Metadata['priority'] }
    if ($Metadata['created']) { $entry.Created = [datetime]$Metadata['created'] }
    if ($Metadata['updated']) { $entry.Updated = [datetime]$Metadata['updated'] }
    
    # 存储原始元数据
    $entry.Metadata = $Metadata
    
    return $entry
}

# 加载知识库索引
function Get-KnowledgeIndex {
    if (-not (Test-Path $KnowledgeBaseConfig.IndexFile)) {
        return @()
    }
    
    try {
        $indexContent = Get-Content $KnowledgeBaseConfig.IndexFile -Raw | ConvertFrom-Json
        return $indexContent
    } catch {
        Write-Warning "无法加载知识库索引: $($_.Exception.Message)"
        return @()
    }
}

# 保存知识库索引
function Set-KnowledgeIndex {
    param([array]$Entries)
    
    try {
        # 确保目录存在
        $indexDir = Split-Path $KnowledgeBaseConfig.IndexFile -Parent
        if (-not (Test-Path $indexDir)) {
            New-Item -ItemType Directory -Path $indexDir -Force | Out-Null
        }
        
        # 创建索引数据
        $indexData = @{
            generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
            version = "1.0"
            totalEntries = $Entries.Count
            categories = ($Entries | Group-Object Category | ForEach-Object { @{ name = $_.Name; count = $_.Count } })
            entries = $Entries
        }
        
        $indexJson = $indexData | ConvertTo-Json -Depth 10
        $indexJson | Out-File -FilePath $KnowledgeBaseConfig.IndexFile -Encoding UTF8
        
        Write-Success "知识库索引已更新: $($Entries.Count) 个条目"
    } catch {
        Write-Error "保存知识库索引失败: $($_.Exception.Message)"
    }
}

# 扫描知识库文件
function Find-KnowledgeFiles {
    param([string]$RootPath = $KnowledgeBaseConfig.RootPath)
    
    if (-not (Test-Path $RootPath)) {
        Write-Warning "知识库根目录不存在: $RootPath"
        return @()
    }
    
    $files = @()
    
    foreach ($ext in $KnowledgeBaseConfig.FileExtensions) {
        $pattern = Join-Path $RootPath "*$ext"
        $foundFiles = Get-ChildItem -Path $RootPath -Filter "*$ext" -Recurse -File
        $files += $foundFiles
    }
    
    Write-Debug "找到 $($files.Count) 个知识库文件"
    return $files
}

# 重建知识库索引
function Update-KnowledgeIndex {
    Write-Info "重建知识库索引..."
    
    $files = Find-KnowledgeFiles
    $entries = @()
    
    foreach ($file in $files) {
        Write-Debug "处理文件: $($file.FullName)"
        
        try {
            $metadata = Get-DocumentMetadata $file.FullName
            if ($metadata) {
                $entry = New-KnowledgeEntry $file.FullName $metadata
                $entries += $entry
            }
        } catch {
            Write-Warning "处理文件失败: $($file.FullName) - $($_.Exception.Message)"
        }
    }
    
    Set-KnowledgeIndex $entries
    
    # 生成统计信息
    $stats = @{
        totalFiles = $files.Count
        totalEntries = $entries.Count
        categories = ($entries | Group-Object Category | Sort-Object Count -Descending)
        tags = ($entries | ForEach-Object { $_.Tags } | Group-Object | Sort-Object Count -Descending | Select-Object -First 10)
    }
    
    Write-Info "索引统计:"
    Write-Info "  文件总数: $($stats.totalFiles)"
    Write-Info "  条目总数: $($stats.totalEntries)"
    Write-Info "  类别分布:"
    foreach ($cat in $stats.categories) {
        Write-Info "    $($cat.Name): $($cat.Count)"
    }
    
    if ($stats.tags.Count -gt 0) {
        Write-Info "  热门标签:"
        foreach ($tag in $stats.tags[0..4]) {
            Write-Info "    $($tag.Name): $($tag.Count)"
        }
    }
}

# 搜索知识库
function Search-Knowledge {
    param(
        [string]$Query,
        [string]$Category = "",
        [string[]]$Tags = @(),
        [int]$Limit = 10
    )
    
    if ([string]::IsNullOrWhiteSpace($Query) -and [string]::IsNullOrWhiteSpace($Category) -and $Tags.Count -eq 0) {
        Write-Error "请提供搜索条件"
        return @()
    }
    
    $index = Get-KnowledgeIndex
    if ($index.entries.Count -eq 0) {
        Write-Warning "知识库索引为空，请先运行索引更新"
        return @()
    }
    
    $results = @()
    
    foreach ($entry in $index.entries) {
        $score = 0
        $matches = @()
        
        # 文本搜索
        if (-not [string]::IsNullOrWhiteSpace($Query)) {
            $queryLower = $Query.ToLower()
            
            # 标题匹配（高权重）
            if ($entry.Title -and $entry.Title.ToLower().Contains($queryLower)) {
                $score += 10
                $matches += "标题匹配"
            }
            
            # 描述匹配（中权重）
            if ($entry.Description -and $entry.Description.ToLower().Contains($queryLower)) {
                $score += 5
                $matches += "描述匹配"
            }
            
            # 内容匹配（低权重）
            if ($entry.Content -and $entry.Content.ToLower().Contains($queryLower)) {
                $score += 2
                $matches += "内容匹配"
            }
            
            # 标签匹配（中权重）
            if ($entry.Tags) {
                foreach ($tag in $entry.Tags) {
                    if ($tag.ToLower().Contains($queryLower)) {
                        $score += 3
                        $matches += "标签匹配: $tag"
                    }
                }
            }
        }
        
        # 类别过滤
        if (-not [string]::IsNullOrWhiteSpace($Category)) {
            if ($entry.Category -eq $Category) {
                $score += 1
                $matches += "类别匹配"
            } elseif (-not [string]::IsNullOrWhiteSpace($Query)) {
                # 如果有文本查询但类别不匹配，跳过
                continue
            }
        }
        
        # 标签过滤
        if ($Tags.Count -gt 0) {
            $tagMatches = 0
            foreach ($searchTag in $Tags) {
                if ($entry.Tags -contains $searchTag) {
                    $tagMatches++
                    $matches += "标签匹配: $searchTag"
                }
            }
            
            if ($tagMatches -gt 0) {
                $score += $tagMatches * 2
            } elseif (-not [string]::IsNullOrWhiteSpace($Query) -or -not [string]::IsNullOrWhiteSpace($Category)) {
                # 如果有其他查询条件但标签不匹配，跳过
                continue
            }
        }
        
        # 只有得分大于0的才加入结果
        if ($score -gt 0) {
            $results += @{
                entry = $entry
                score = $score
                matches = $matches
            }
        }
    }
    
    # 按得分排序并限制结果数量
    $sortedResults = $results | Sort-Object score -Descending | Select-Object -First $Limit
    
    return $sortedResults
}

# 显示搜索结果
function Show-SearchResults {
    param(
        [array]$Results,
        [string]$OutputFormat = "console"
    )
    
    if ($Results.Count -eq 0) {
        Write-Warning "未找到匹配的结果"
        return
    }
    
    switch ($OutputFormat.ToLower()) {
        "console" {
            Write-Info "找到 $($Results.Count) 个匹配结果:"
            Write-ColorOutput "" "Gray"
            
            for ($i = 0; $i -lt $Results.Count; $i++) {
                $result = $Results[$i]
                $entry = $result.entry
                
                Write-ColorOutput "[$($i + 1)] $($entry.Title)" "Yellow"
                Write-ColorOutput "    文件: $($entry.FilePath)" "Gray"
                Write-ColorOutput "    类别: $($entry.Category)" "Gray"
                
                if ($entry.Tags -and $entry.Tags.Count -gt 0) {
                    Write-ColorOutput "    标签: $($entry.Tags -join ', ')" "Gray"
                }
                
                if ($entry.Description) {
                    Write-ColorOutput "    描述: $($entry.Description)" "Cyan"
                }
                
                Write-ColorOutput "    匹配: $($result.matches -join ', ')" "Green"
                Write-ColorOutput "    得分: $($result.score)" "Magenta"
                Write-ColorOutput "" "Gray"
            }
        }
        
        "json" {
            $jsonResults = $Results | ConvertTo-Json -Depth 10
            Write-Output $jsonResults
        }
        
        "markdown" {
            Write-Output "# 搜索结果 ($($Results.Count) 个)"
            Write-Output ""
            
            for ($i = 0; $i -lt $Results.Count; $i++) {
                $result = $Results[$i]
                $entry = $result.entry
                
                Write-Output "## $($i + 1). [$($entry.Title)]($($entry.FilePath))"
                Write-Output ""
                Write-Output "- **类别**: $($entry.Category)"
                
                if ($entry.Tags -and $entry.Tags.Count -gt 0) {
                    Write-Output "- **标签**: $($entry.Tags -join ', ')"
                }
                
                if ($entry.Description) {
                    Write-Output "- **描述**: $($entry.Description)"
                }
                
                Write-Output "- **匹配**: $($result.matches -join ', ')"
                Write-Output "- **得分**: $($result.score)"
                Write-Output ""
            }
        }
    }
}

# 添加新的知识条目
function Add-KnowledgeEntry {
    param(
        [string]$Title,
        [string]$Category,
        [string]$Description = "",
        [string[]]$Tags = @(),
        [string]$Template = "basic"
    )
    
    if ([string]::IsNullOrWhiteSpace($Title)) {
        Write-Error "标题不能为空"
        return
    }
    
    if ([string]::IsNullOrWhiteSpace($Category)) {
        Write-Error "类别不能为空"
        return
    }
    
    # 验证类别
    if ($Category -notin $KnowledgeBaseConfig.Categories) {
        Write-Warning "类别 '$Category' 不在预定义列表中: $($KnowledgeBaseConfig.Categories -join ', ')"
        $continue = Read-Host "是否继续? (y/N)"
        if ($continue -ne "y" -and $continue -ne "Y") {
            return
        }
    }
    
    # 生成文件名
    $fileName = $Title -replace '[^a-zA-Z0-9\s-]', '' -replace '\s+', '-'
    $fileName = $fileName.ToLower() + ".md"
    
    # 生成文件路径
    $categoryPath = Join-Path $KnowledgeBaseConfig.RootPath $Category
    $filePath = Join-Path $categoryPath $fileName
    
    # 确保目录存在
    if (-not (Test-Path $categoryPath)) {
        New-Item -ItemType Directory -Path $categoryPath -Force | Out-Null
    }
    
    # 检查文件是否已存在
    if ((Test-Path $filePath) -and -not $Force) {
        Write-Error "文件已存在: $filePath (使用 -Force 覆盖)"
        return
    }
    
    # 生成文档内容
    $frontMatter = @"
---
title: "$Title"
description: "$Description"
category: $Category
tags: [$($Tags | ForEach-Object { "\"$_\"" } | Join-String -Separator ', ')]
author: $env:USERNAME
created: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
updated: $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')
difficulty: intermediate
priority: medium
---

"@
    
    # 根据模板生成内容
    $content = switch ($Template) {
        "troubleshooting" {
            @"
# $Title

## 问题描述

描述遇到的问题...

## 症状

- 症状1
- 症状2

## 原因分析

分析问题的根本原因...

## 解决方案

### 方案1: 标题

步骤:
1. 步骤1
2. 步骤2

### 方案2: 标题

步骤:
1. 步骤1
2. 步骤2

## 预防措施

- 预防措施1
- 预防措施2

## 相关资源

- [相关文档](链接)
- [参考资料](链接)
"@
        }
        
        "best-practice" {
            @"
# $Title

## 概述

简要描述这个最佳实践...

## 适用场景

- 场景1
- 场景2

## 实施步骤

### 步骤1: 标题

详细描述...

```code
// 示例代码
```

### 步骤2: 标题

详细描述...

## 注意事项

- 注意事项1
- 注意事项2

## 示例

提供具体的示例...

## 相关实践

- [相关实践1](链接)
- [相关实践2](链接)
"@
        }
        
        "api-doc" {
            @"
# $Title

## 接口描述

描述接口的用途和功能...

## 请求

### URL
```
POST /api/endpoint
```

### 请求头
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <token>"
}
```

### 请求参数

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| param1 | string | 是 | 参数描述 |
| param2 | number | 否 | 参数描述 |

### 请求示例
```json
{
  "param1": "value1",
  "param2": 123
}
```

## 响应

### 成功响应
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "example"
  }
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误信息",
  "code": "ERROR_CODE"
}
```

## 错误码

| 错误码 | 描述 | 解决方案 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查请求参数 |
| 401 | 未授权 | 检查认证信息 |
"@
        }
        
        default {
            @"
# $Title

## 概述

在这里添加内容概述...

## 详细内容

在这里添加详细内容...

### 子标题1

内容...

### 子标题2

内容...

## 总结

总结要点...

## 参考资料

- [参考链接1](URL)
- [参考链接2](URL)
"@
        }
    }
    
    $fullContent = $frontMatter + $content
    
    try {
        $fullContent | Out-File -FilePath $filePath -Encoding UTF8
        Write-Success "知识条目已创建: $filePath"
        
        # 更新索引
        Write-Info "更新知识库索引..."
        Update-KnowledgeIndex
        
    } catch {
        Write-Error "创建知识条目失败: $($_.Exception.Message)"
    }
}

# 验证知识库
function Test-KnowledgeBase {
    Write-Info "验证知识库完整性..."
    
    $issues = @()
    
    # 检查根目录
    if (-not (Test-Path $KnowledgeBaseConfig.RootPath)) {
        $issues += "知识库根目录不存在: $($KnowledgeBaseConfig.RootPath)"
    }
    
    # 检查索引文件
    if (-not (Test-Path $KnowledgeBaseConfig.IndexFile)) {
        $issues += "索引文件不存在: $($KnowledgeBaseConfig.IndexFile)"
    } else {
        try {
            $index = Get-KnowledgeIndex
            Write-Info "索引包含 $($index.entries.Count) 个条目"
        } catch {
            $issues += "索引文件格式错误: $($_.Exception.Message)"
        }
    }
    
    # 检查文件完整性
    $files = Find-KnowledgeFiles
    $brokenFiles = @()
    
    foreach ($file in $files) {
        try {
            $metadata = Get-DocumentMetadata $file.FullName
            if (-not $metadata) {
                $brokenFiles += $file.FullName
            }
        } catch {
            $brokenFiles += $file.FullName
        }
    }
    
    if ($brokenFiles.Count -gt 0) {
        $issues += "$($brokenFiles.Count) 个文件无法解析:"
        $issues += $brokenFiles
    }
    
    # 检查孤立文件（在文件系统中但不在索引中）
    if (Test-Path $KnowledgeBaseConfig.IndexFile) {
        $index = Get-KnowledgeIndex
        $indexedFiles = $index.entries | ForEach-Object { $_.FilePath }
        $actualFiles = $files | ForEach-Object { $_.FullName }
        
        $orphanedFiles = $actualFiles | Where-Object { $_ -notin $indexedFiles }
        if ($orphanedFiles.Count -gt 0) {
            $issues += "$($orphanedFiles.Count) 个文件未在索引中:"
            $issues += $orphanedFiles
        }
        
        $missingFiles = $indexedFiles | Where-Object { $_ -notin $actualFiles }
        if ($missingFiles.Count -gt 0) {
            $issues += "$($missingFiles.Count) 个索引条目对应的文件不存在:"
            $issues += $missingFiles
        }
    }
    
    # 输出结果
    if ($issues.Count -eq 0) {
        Write-Success "知识库验证通过"
    } else {
        Write-Warning "发现 $($issues.Count) 个问题:"
        foreach ($issue in $issues) {
            Write-Warning "  $issue"
        }
    }
    
    return $issues.Count -eq 0
}

# 导出知识库
function Export-KnowledgeBase {
    param(
        [string]$OutputPath = "knowledge-export",
        [string]$Format = "markdown"  # markdown, html, json
    )
    
    Write-Info "导出知识库到: $OutputPath"
    
    # 创建输出目录
    if (-not (Test-Path $OutputPath)) {
        New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    }
    
    $index = Get-KnowledgeIndex
    if ($index.entries.Count -eq 0) {
        Write-Warning "知识库索引为空"
        return
    }
    
    switch ($Format.ToLower()) {
        "markdown" {
            # 创建主索引文件
            $indexContent = @"
# 知识库索引

生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
总条目数: $($index.entries.Count)

## 按类别分组

"@
            
            $categories = $index.entries | Group-Object Category | Sort-Object Name
            foreach ($category in $categories) {
                $indexContent += "### $($category.Name) ($($category.Count) 个条目)\n\n"
                
                foreach ($entry in ($category.Group | Sort-Object Title)) {
                    $relativePath = $entry.FilePath -replace [regex]::Escape((Get-Location).Path + "\\"), ""
                    $indexContent += "- [$($entry.Title)]($relativePath)"
                    if ($entry.Description) {
                        $indexContent += " - $($entry.Description)"
                    }
                    $indexContent += "\n"
                }
                $indexContent += "\n"
            }
            
            $indexContent | Out-File -FilePath (Join-Path $OutputPath "index.md") -Encoding UTF8
            
            # 复制所有文档文件
            $files = Find-KnowledgeFiles
            foreach ($file in $files) {
                $relativePath = $file.FullName -replace [regex]::Escape($KnowledgeBaseConfig.RootPath), ""
                $targetPath = Join-Path $OutputPath $relativePath
                $targetDir = Split-Path $targetPath -Parent
                
                if (-not (Test-Path $targetDir)) {
                    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                }
                
                Copy-Item $file.FullName $targetPath
            }
        }
        
        "json" {
            $exportData = @{
                metadata = @{
                    generated = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
                    version = "1.0"
                    totalEntries = $index.entries.Count
                }
                index = $index
            }
            
            $exportJson = $exportData | ConvertTo-Json -Depth 10
            $exportJson | Out-File -FilePath (Join-Path $OutputPath "knowledge-base.json") -Encoding UTF8
        }
        
        "html" {
            # 生成 HTML 版本（简化版）
            $htmlContent = @"
<!DOCTYPE html>
<html>
<head>
    <title>知识库</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .category { margin: 20px 0; }
        .entry { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }
        .tags { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>知识库</h1>
        <p>生成时间: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
        <p>总条目数: $($index.entries.Count)</p>
    </div>
"@
            
            $categories = $index.entries | Group-Object Category | Sort-Object Name
            foreach ($category in $categories) {
                $htmlContent += "<div class='category'><h2>$($category.Name) ($($category.Count) 个条目)</h2>"
                
                foreach ($entry in ($category.Group | Sort-Object Title)) {
                    $htmlContent += "<div class='entry'>"
                    $htmlContent += "<h3>$($entry.Title)</h3>"
                    if ($entry.Description) {
                        $htmlContent += "<p>$($entry.Description)</p>"
                    }
                    if ($entry.Tags -and $entry.Tags.Count -gt 0) {
                        $htmlContent += "<div class='tags'>标签: $($entry.Tags -join ', ')</div>"
                    }
                    $htmlContent += "</div>"
                }
                
                $htmlContent += "</div>"
            }
            
            $htmlContent += "</body></html>"
            $htmlContent | Out-File -FilePath (Join-Path $OutputPath "index.html") -Encoding UTF8
        }
    }
    
    Write-Success "知识库导出完成: $OutputPath"
}

# 主函数
function Main {
    switch ($Action.ToLower()) {
        "index" {
            Update-KnowledgeIndex
        }
        
        "search" {
            if ([string]::IsNullOrWhiteSpace($Query) -and [string]::IsNullOrWhiteSpace($Category) -and [string]::IsNullOrWhiteSpace($Tags)) {
                Write-Error "请提供搜索条件: -Query, -Category 或 -Tags"
                return
            }
            
            $searchTags = if ($Tags) { $Tags -split ',' | ForEach-Object { $_.Trim() } } else { @() }
            $results = Search-Knowledge -Query $Query -Category $Category -Tags $searchTags
            Show-SearchResults $results $OutputFormat
        }
        
        "add" {
            if ([string]::IsNullOrWhiteSpace($Query)) {
                Write-Error "请提供标题: -Query"
                return
            }
            
            if ([string]::IsNullOrWhiteSpace($Category)) {
                Write-Error "请提供类别: -Category"
                return
            }
            
            $addTags = if ($Tags) { $Tags -split ',' | ForEach-Object { $_.Trim() } } else { @() }
            Add-KnowledgeEntry -Title $Query -Category $Category -Tags $addTags
        }
        
        "validate" {
            Test-KnowledgeBase
        }
        
        "export" {
            $exportPath = if ($FilePath) { $FilePath } else { "knowledge-export" }
            Export-KnowledgeBase -OutputPath $exportPath -Format $OutputFormat
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
知识库管理脚本

用法:
  .\knowledge-manager.ps1 -Action <action> [选项]

操作:
  index                   重建知识库索引
  search                  搜索知识库
  add                     添加新的知识条目
  validate                验证知识库完整性
  export                  导出知识库
  help                    显示帮助信息

搜索选项:
  -Query <text>           搜索文本
  -Category <category>    按类别过滤
  -Tags <tags>            按标签过滤（逗号分隔）
  -OutputFormat <format>  输出格式 (console, json, markdown)

添加选项:
  -Query <title>          条目标题
  -Category <category>    条目类别
  -Tags <tags>            条目标签（逗号分隔）
  -Force                  覆盖已存在的文件

导出选项:
  -FilePath <path>        导出路径
  -OutputFormat <format>  导出格式 (markdown, html, json)

通用选项:
  -Verbose                显示详细信息

示例:
  .\knowledge-manager.ps1 -Action index
  .\knowledge-manager.ps1 -Action search -Query "API错误"
  .\knowledge-manager.ps1 -Action search -Category "troubleshooting"
  .\knowledge-manager.ps1 -Action add -Query "新功能开发流程" -Category "workflows"
  .\knowledge-manager.ps1 -Action export -OutputFormat html
'@
}

# 运行主函数
Main