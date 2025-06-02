@echo off
chcp 65001 >nul
echo Starting Beauty AI Development Database...
echo.

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

:: Change to project root directory
cd /d "%~dp0.."

:: Start database services
echo [INFO] Starting PostgreSQL and Redis services...
docker-compose -f docker/docker-compose.dev.yml up -d

if %errorlevel% equ 0 (
    echo.
    echo [SUCCESS] Database services started successfully!
    echo.
    echo [INFO] Service Information:
    echo   - PostgreSQL: localhost:5432
    echo   - Redis: localhost:6379
    echo   - pgAdmin: http://localhost:5050
    echo.
    echo [INFO] pgAdmin Login:
    echo   - Email: admin@beauty-ai.com
    echo   - Password: admin123
    echo.
    echo [TIPS] Next Steps:
    echo   - Run 'npm run db:init' to initialize database schema
    echo   - Run 'scripts\stop-dev-db.bat' to stop services
    echo   - Run 'scripts\logs-dev-db.bat' to view logs
    echo.
) else (
    echo [ERROR] Failed to start database services
    echo Please check Docker configuration and port availability
)

pause