@echo off
echo 查看美妆AI助手开发数据库日志...
echo.

:: 切换到项目根目录
cd /d "%~dp0.."

echo 📋 可用服务:
echo   1. PostgreSQL
echo   2. Redis
echo   3. pgAdmin
echo   4. 所有服务
echo.

set /p choice=请选择要查看日志的服务 (1-4): 

if "%choice%"=="1" (
    echo 📊 PostgreSQL 日志:
    docker-compose -f docker/docker-compose.dev.yml logs -f postgres
) else if "%choice%"=="2" (
    echo 📊 Redis 日志:
    docker-compose -f docker/docker-compose.dev.yml logs -f redis
) else if "%choice%"=="3" (
    echo 📊 pgAdmin 日志:
    docker-compose -f docker/docker-compose.dev.yml logs -f pgadmin
) else if "%choice%"=="4" (
    echo 📊 所有服务日志:
    docker-compose -f docker/docker-compose.dev.yml logs -f
) else (
    echo ❌ 无效选择
    pause
    exit /b 1
)