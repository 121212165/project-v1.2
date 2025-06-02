@echo off
echo 清理美妆AI助手开发数据库数据...
echo.
echo ⚠️  警告: 此操作将删除所有数据库数据，无法恢复！
echo.

set /p confirm=确定要清理所有数据吗？(y/N): 

if /i not "%confirm%"=="y" (
    echo 操作已取消
    pause
    exit /b 0
)

:: 切换到项目根目录
cd /d "%~dp0.."

echo.
echo 🛑 停止所有服务...
docker-compose -f docker/docker-compose.dev.yml down

echo 🗑️  删除数据卷...
docker-compose -f docker/docker-compose.dev.yml down -v

echo 🧹 清理未使用的卷...
docker volume prune -f

echo.
if %errorlevel% equ 0 (
    echo ✅ 数据库数据清理完成
    echo.
    echo 💡 下次启动时将创建全新的数据库
    echo   运行 'scripts\start-dev-db.bat' 启动服务
    echo   然后运行 'npm run db:init' 初始化数据库
) else (
    echo ❌ 清理过程中出现错误
)

echo.
pause