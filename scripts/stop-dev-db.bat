@echo off
echo 停止美妆AI助手开发数据库...
echo.

:: 切换到项目根目录
cd /d "%~dp0.."

:: 停止数据库服务
echo 🛑 停止PostgreSQL和Redis服务...
docker-compose -f docker/docker-compose.dev.yml down

if %errorlevel% equ 0 (
    echo ✅ 数据库服务已停止
) else (
    echo ❌ 停止服务时出现错误
)

echo.
echo 💡 提示:
 echo   - 数据已保存在Docker卷中，下次启动时数据不会丢失
 echo   - 如需完全清理数据，请运行 'scripts\clean-dev-db.bat'
echo.

pause